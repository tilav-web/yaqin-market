import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, timingSafeEqual } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import {
  Order,
  OrderStatus,
  PaymentMethod,
} from '../order/entities/order.entity';
import { Payment, PaymentProvider, PaymentStatus } from './payment.entity';
import { ClickWebhookDto } from './dto/click-webhook.dto';
import { ClickAction } from './enums/click-action.enum';
import { ClickErrorCode } from './enums/click-error-code.enum';
import { ClickWebhookResponse } from './types/click.types';
import { generateClickUrl } from './utils/generate-click-url';
import { OrderService } from '../order/order.service';
import { RateLimitRedisService } from '../redis/rate-limit.redis.service';

type PaymeParams = Record<string, unknown>;

@Injectable()
export class PaymentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentService.name);
  private cleanupTimer: NodeJS.Timeout | null = null;
  private cleanupInProgress = false;

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly orderService: OrderService,
    private readonly rateLimitRedisService: RateLimitRedisService,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  onModuleInit() {
    const sweepIntervalMs = Number(
      this.config.get<string>('CLICK_PENDING_SWEEP_MS') ?? 60000,
    );

    if (sweepIntervalMs <= 0) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      void this.runPendingClickOrderCleanup();
    }, sweepIntervalMs);

    void this.runPendingClickOrderCleanup();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  async createPayment(orderId: string, provider: PaymentProvider) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const payment = this.paymentRepo.create({
      order_id: orderId,
      provider,
      amount: order.total_price,
      status: PaymentStatus.PENDING,
    });

    return this.paymentRepo.save(payment);
  }

  async getClickPaymentUrl(orderId: string, userId: string) {
    const rateLimit = await this.rateLimitRedisService.consume(
      `payment:click-url:${userId}`,
      20,
      300,
    );

    if (!rateLimit.allowed) {
      throw new HttpException(
        "To'lov sahifasini ochish limiti tugadi. Keyinroq urinib ko'ring",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const order = await this.orderRepo.findOne({
      where: { id: orderId, customer_id: userId },
    });

    if (!order) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    if (order.is_paid) {
      throw new BadRequestException("Bu buyurtma allaqachon to'langan");
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        "Bekor qilingan buyurtma uchun to'lov qilib bo'lmaydi",
      );
    }

    if (order.payment_method !== PaymentMethod.CLICK) {
      throw new BadRequestException(
        "Bu buyurtma online to'lovga tayyorlanmagan",
      );
    }

    const serviceId = this.config.get<string>('CLICK_SERVICE_ID');
    const merchantId = this.config.get<string>('CLICK_MERCHANT_ID');

    if (!serviceId || !merchantId) {
      throw new BadRequestException("CLICK sozlamalari to'liq emas");
    }

    await this.ensureClickPaymentRecord(order);

    return {
      url: generateClickUrl({
        serviceId,
        merchantId,
        amount: Number(order.total_price),
        transactionParam: order.id,
        returnUrl: this.buildClickReturnUrl(order.id),
      }),
    };
  }

  async prepareClick(dto: ClickWebhookDto): Promise<ClickWebhookResponse> {
    try {
      if (dto.action !== ClickAction.PREPARE) {
        return this.getClickErrorResponse(
          ClickErrorCode.ACTION_NOT_FOUND,
          'ACTION_NOT_FOUND',
        );
      }

      const configError = this.validateClickServiceConfig(dto.service_id);
      if (configError) {
        return configError;
      }

      if (!this.isValidClickSignTime(dto.sign_time)) {
        return this.getClickErrorResponse(
          ClickErrorCode.ERROR_IN_REQUEST_FROM_CLICK,
          'INVALID_SIGN_TIME',
        );
      }

      if (!this.validatePrepareSign(dto)) {
        return this.getClickErrorResponse(
          ClickErrorCode.SIGN_CHECK_FAILED,
          'SIGN_CHECK_FAILED',
        );
      }

      const order = await this.orderRepo.findOne({
        where: { id: dto.merchant_trans_id },
      });

      if (!order) {
        return this.getClickErrorResponse(
          ClickErrorCode.ORDER_NOT_FOUND,
          'ORDER_NOT_FOUND',
        );
      }

      const orderError = this.validateClickOrder(order, Number(dto.amount));
      if (orderError) {
        return orderError;
      }

      return this.dataSource.transaction(async (manager) => {
        const paymentByClickId = await manager.findOne(Payment, {
          where: {
            provider: PaymentProvider.CLICK,
            transaction_id: dto.click_trans_id,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (paymentByClickId) {
          if (paymentByClickId.status === PaymentStatus.PAID) {
            return this.getClickErrorResponse(
              ClickErrorCode.ALREADY_PAID,
              'ALREADY_PAID',
            );
          }

          if (paymentByClickId.status === PaymentStatus.CANCELLED) {
            return this.getClickErrorResponse(
              ClickErrorCode.TRANSACTION_CANCELLED,
              'TRANSACTION_CANCELLED',
            );
          }

          paymentByClickId.amount = Number(order.total_price);
          paymentByClickId.provider_create_time = Date.now();
          paymentByClickId.raw_response = this.mergeRawResponse(
            paymentByClickId.raw_response,
            dto,
          );

          const savedPayment = await manager.save(paymentByClickId);

          return this.getClickPrepareSuccessResponse(
            dto.click_trans_id,
            dto.merchant_trans_id,
            savedPayment.id,
          );
        }

        const successfulPayment = await manager.findOne(Payment, {
          where: {
            order_id: order.id,
            provider: PaymentProvider.CLICK,
            status: PaymentStatus.PAID,
          },
          lock: { mode: 'pessimistic_read' },
        });

        if (successfulPayment) {
          return this.getClickErrorResponse(
            ClickErrorCode.ALREADY_PAID,
            'ALREADY_PAID',
          );
        }

        const latestPayment = await manager.findOne(Payment, {
          where: {
            order_id: order.id,
            provider: PaymentProvider.CLICK,
          },
          order: {
            createdAt: 'DESC',
          },
          lock: { mode: 'pessimistic_write' },
        });

        const payment =
          latestPayment && latestPayment.status !== PaymentStatus.CANCELLED
            ? latestPayment
            : manager.create(Payment, {
                order_id: order.id,
                provider: PaymentProvider.CLICK,
              });

        payment.status = PaymentStatus.PENDING;
        payment.amount = Number(order.total_price);
        payment.transaction_id = dto.click_trans_id;
        payment.provider_create_time = Date.now();
        payment.provider_perform_time = null;
        payment.provider_cancel_time = null;
        payment.cancel_reason = null;
        payment.raw_response = this.mergeRawResponse(payment.raw_response, dto);

        const savedPayment = await manager.save(payment);

        return this.getClickPrepareSuccessResponse(
          dto.click_trans_id,
          dto.merchant_trans_id,
          savedPayment.id,
        );
      });
    } catch (error) {
      this.logger.error('Unhandled CLICK prepare error', error as Error);

      return this.getClickErrorResponse(
        ClickErrorCode.ERROR_IN_REQUEST_FROM_CLICK,
        'INTERNAL_ERROR',
      );
    }
  }

  async completeClick(dto: ClickWebhookDto): Promise<ClickWebhookResponse> {
    try {
      if (dto.action !== ClickAction.COMPLETE) {
        return this.getClickErrorResponse(
          ClickErrorCode.ACTION_NOT_FOUND,
          'ACTION_NOT_FOUND',
        );
      }

      const configError = this.validateClickServiceConfig(dto.service_id);
      if (configError) {
        return configError;
      }

      if (!dto.merchant_prepare_id) {
        return this.getClickErrorResponse(
          ClickErrorCode.TRANSACTION_DOES_NOT_EXIST,
          'TRANSACTION_DOES_NOT_EXIST',
        );
      }

      if (!this.isValidClickSignTime(dto.sign_time)) {
        return this.getClickErrorResponse(
          ClickErrorCode.ERROR_IN_REQUEST_FROM_CLICK,
          'INVALID_SIGN_TIME',
        );
      }

      if (!this.validateCompleteSign(dto)) {
        return this.getClickErrorResponse(
          ClickErrorCode.SIGN_CHECK_FAILED,
          'SIGN_CHECK_FAILED',
        );
      }

      const order = await this.orderRepo.findOne({
        where: { id: dto.merchant_trans_id },
      });

      if (!order) {
        return this.getClickErrorResponse(
          ClickErrorCode.ORDER_NOT_FOUND,
          'ORDER_NOT_FOUND',
        );
      }

      const orderError = this.validateClickOrder(order, Number(dto.amount));
      if (orderError) {
        return orderError;
      }

      return this.dataSource.transaction(async (manager) => {
        const payment = await manager.findOne(Payment, {
          where: {
            id: dto.merchant_prepare_id,
            order_id: order.id,
            provider: PaymentProvider.CLICK,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!payment) {
          return this.getClickErrorResponse(
            ClickErrorCode.TRANSACTION_DOES_NOT_EXIST,
            'TRANSACTION_DOES_NOT_EXIST',
          );
        }

        if (payment.status === PaymentStatus.PAID) {
          return this.getClickErrorResponse(
            ClickErrorCode.ALREADY_PAID,
            'ALREADY_PAID',
          );
        }

        if (payment.status === PaymentStatus.CANCELLED) {
          return this.getClickErrorResponse(
            ClickErrorCode.TRANSACTION_CANCELLED,
            'TRANSACTION_CANCELLED',
          );
        }

        const successfulPayment = await manager.findOne(Payment, {
          where: {
            order_id: order.id,
            provider: PaymentProvider.CLICK,
            status: PaymentStatus.PAID,
          },
          lock: { mode: 'pessimistic_read' },
        });

        if (successfulPayment && successfulPayment.id !== payment.id) {
          return this.getClickErrorResponse(
            ClickErrorCode.ALREADY_PAID,
            'ALREADY_PAID',
          );
        }

        if ((dto.error ?? 0) <= -1) {
          payment.status = PaymentStatus.CANCELLED;
          payment.transaction_id = dto.click_trans_id;
          payment.provider_cancel_time = Date.now();
          payment.cancel_reason =
            dto.error ?? ClickErrorCode.TRANSACTION_CANCELLED;
          payment.raw_response = this.mergeRawResponse(
            payment.raw_response,
            dto,
          );
          await manager.save(payment);

          return this.getClickErrorResponse(
            ClickErrorCode.TRANSACTION_CANCELLED,
            'TRANSACTION_CANCELLED',
          );
        }

        payment.status = PaymentStatus.PAID;
        payment.transaction_id = dto.click_trans_id;
        payment.provider_perform_time = Date.now();
        payment.paid_at = new Date();
        payment.cancel_reason = null;
        payment.raw_response = this.mergeRawResponse(payment.raw_response, dto);
        await manager.save(payment);

        await manager.update(Order, order.id, {
          is_paid: true,
          payment_method: PaymentMethod.CLICK,
        });

        return {
          click_trans_id: dto.click_trans_id,
          merchant_trans_id: dto.merchant_trans_id,
          merchant_confirm_id: payment.id,
          error: String(ClickErrorCode.SUCCESS),
          error_note: 'SUCCESS',
        };
      });
    } catch (error) {
      this.logger.error('Unhandled CLICK complete error', error as Error);

      return this.getClickErrorResponse(
        ClickErrorCode.ERROR_IN_REQUEST_FROM_CLICK,
        'INTERNAL_ERROR',
      );
    }
  }

  getClickErrorResponse(
    code: ClickErrorCode | number,
    note: string,
  ): ClickWebhookResponse {
    return {
      error: String(code),
      error_note: note,
    };
  }

  async checkPayme(payload: {
    id: number;
    method: string;
    params: PaymeParams;
  }) {
    const { method, params } = payload;

    switch (method) {
      case 'CheckPerformTransaction':
        return this.checkPerformTransaction(params);
      case 'CreateTransaction':
        return this.createPaymeTransaction(params);
      case 'PerformTransaction':
        return this.performPaymeTransaction(params);
      case 'CancelTransaction':
        return this.cancelPaymeTransaction(params);
      case 'CheckTransaction':
        return this.checkPaymeTransaction(params);
      default:
        return { error: { code: -32601, message: 'Method not found' } };
    }
  }

  private async checkPerformTransaction(params: PaymeParams) {
    const orderId = this.getPaymeOrderId(params);

    if (!orderId) {
      return { error: { code: -31050, message: 'Order not specified' } };
    }

    const order = await this.orderRepo.findOne({ where: { id: orderId } });

    if (!order) {
      return { error: { code: -31050, message: 'Order not found' } };
    }

    if (order.is_paid) {
      return { error: { code: -31051, message: 'Order already paid' } };
    }

    const amount = Math.round(Number(order.total_price) * 100);

    if (this.getPaymeAmount(params) !== amount) {
      return { error: { code: -31001, message: 'Incorrect amount' } };
    }

    return { result: { allow: true } };
  }

  private async createPaymeTransaction(params: PaymeParams) {
    const orderId = this.getPaymeOrderId(params);
    const transactionId = this.getPaymeTransactionId(params);
    const existing = await this.paymentRepo.findOne({
      where: { transaction_id: transactionId },
    });

    if (existing) {
      return {
        result: {
          create_time: Math.floor(existing.createdAt.getTime()),
          transaction: existing.id,
          state: existing.status === PaymentStatus.PAID ? 2 : 1,
        },
      };
    }

    const order = await this.orderRepo.findOne({ where: { id: orderId } });

    if (!order) {
      return { error: { code: -31050, message: 'Order not found' } };
    }

    const payment = this.paymentRepo.create({
      order_id: orderId,
      provider: PaymentProvider.PAYME,
      amount: order.total_price,
      transaction_id: transactionId,
      status: PaymentStatus.PROCESSING,
    });
    const saved = await this.paymentRepo.save(payment);

    return {
      result: {
        create_time: Math.floor(Date.now()),
        transaction: saved.id,
        state: 1,
      },
    };
  }

  private async performPaymeTransaction(params: PaymeParams) {
    const payment = await this.paymentRepo.findOne({
      where: { transaction_id: this.getPaymeTransactionId(params) },
    });

    if (!payment) {
      return { error: { code: -31003, message: 'Transaction not found' } };
    }

    if (payment.status === PaymentStatus.PAID) {
      return {
        result: {
          transaction: payment.id,
          perform_time: Math.floor(payment.paid_at?.getTime() ?? Date.now()),
          state: 2,
        },
      };
    }

    payment.status = PaymentStatus.PAID;
    payment.paid_at = new Date();
    await this.paymentRepo.save(payment);

    await this.orderRepo.update(payment.order_id, {
      is_paid: true,
      payment_method: PaymentMethod.PAYME,
    });

    return {
      result: {
        transaction: payment.id,
        perform_time: Math.floor(Date.now()),
        state: 2,
      },
    };
  }

  private async cancelPaymeTransaction(params: PaymeParams) {
    const payment = await this.paymentRepo.findOne({
      where: { transaction_id: this.getPaymeTransactionId(params) },
    });

    if (!payment) {
      return { error: { code: -31003, message: 'Transaction not found' } };
    }

    if (payment.status === PaymentStatus.PAID) {
      return {
        error: { code: -31007, message: 'Cannot cancel paid transaction' },
      };
    }

    payment.status = PaymentStatus.CANCELLED;
    await this.paymentRepo.save(payment);

    return {
      result: {
        transaction: payment.id,
        cancel_time: Math.floor(Date.now()),
        state: -1,
      },
    };
  }

  private async checkPaymeTransaction(params: PaymeParams) {
    const payment = await this.paymentRepo.findOne({
      where: { transaction_id: this.getPaymeTransactionId(params) },
    });

    if (!payment) {
      return { error: { code: -31003, message: 'Transaction not found' } };
    }

    let state = 1;
    let performTime = 0;
    let cancelTime = 0;
    let reason: number | null = null;

    if (payment.status === PaymentStatus.PAID) {
      state = 2;
      performTime = Math.floor(payment.paid_at?.getTime() ?? Date.now());
    } else if (payment.status === PaymentStatus.CANCELLED) {
      state = -1;
      cancelTime = Math.floor(payment.updatedAt.getTime());
      reason = 3;
    }

    return {
      result: {
        create_time: Math.floor(payment.createdAt.getTime()),
        perform_time: performTime,
        cancel_time: cancelTime,
        transaction: payment.id,
        state,
        reason,
      },
    };
  }

  private async ensureClickPaymentRecord(order: Order) {
    const existingPayment = await this.paymentRepo.findOne({
      where: {
        order_id: order.id,
        provider: PaymentProvider.CLICK,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (existingPayment && existingPayment.status !== PaymentStatus.CANCELLED) {
      return existingPayment;
    }

    const payment = this.paymentRepo.create({
      order_id: order.id,
      provider: PaymentProvider.CLICK,
      amount: Number(order.total_price),
      status: PaymentStatus.PENDING,
    });

    return this.paymentRepo.save(payment);
  }

  private validateClickOrder(
    order: Order,
    requestAmount: number,
  ): ClickWebhookResponse | null {
    if (order.is_paid) {
      return this.getClickErrorResponse(
        ClickErrorCode.ALREADY_PAID,
        'ALREADY_PAID',
      );
    }

    if (order.payment_method !== PaymentMethod.CLICK) {
      return this.getClickErrorResponse(
        ClickErrorCode.ERROR_IN_REQUEST_FROM_CLICK,
        'ORDER_PAYMENT_METHOD_INVALID',
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      return this.getClickErrorResponse(
        ClickErrorCode.TRANSACTION_CANCELLED,
        'ORDER_CANCELLED',
      );
    }

    if (!this.isAmountEqual(Number(order.total_price), requestAmount)) {
      return this.getClickErrorResponse(
        ClickErrorCode.INVALID_AMOUNT,
        'INVALID_AMOUNT',
      );
    }

    return null;
  }

  private validateClickServiceConfig(
    serviceId: string,
  ): ClickWebhookResponse | null {
    const secretKey = this.config.get<string>('CLICK_SECRET_KEY');
    const expectedServiceId = this.config.get<string>('CLICK_SERVICE_ID');

    if (!secretKey || !expectedServiceId) {
      this.logger.error(
        'CLICK configuration is incomplete: CLICK_SECRET_KEY or CLICK_SERVICE_ID is missing',
      );

      return this.getClickErrorResponse(
        ClickErrorCode.ERROR_IN_REQUEST_FROM_CLICK,
        'CONFIGURATION_ERROR',
      );
    }

    if (serviceId !== expectedServiceId) {
      this.logger.warn(`CLICK invalid service_id=${serviceId}`);

      return this.getClickErrorResponse(
        ClickErrorCode.ERROR_IN_REQUEST_FROM_CLICK,
        'INVALID_SERVICE_ID',
      );
    }

    return null;
  }

  private validatePrepareSign(dto: ClickWebhookDto) {
    return this.validateClickSign({
      clickTransId: dto.click_trans_id,
      serviceId: dto.service_id,
      merchantTransId: dto.merchant_trans_id,
      amount: dto.amount,
      action: dto.action,
      signTime: dto.sign_time,
      signString: dto.sign_string,
    });
  }

  private validateCompleteSign(dto: ClickWebhookDto) {
    return this.validateClickSign({
      clickTransId: dto.click_trans_id,
      serviceId: dto.service_id,
      merchantTransId: dto.merchant_trans_id,
      merchantPrepareId: dto.merchant_prepare_id,
      amount: dto.amount,
      action: dto.action,
      signTime: dto.sign_time,
      signString: dto.sign_string,
    });
  }

  private validateClickSign({
    clickTransId,
    serviceId,
    merchantTransId,
    merchantPrepareId,
    amount,
    action,
    signTime,
    signString,
  }: {
    clickTransId: string;
    serviceId: string;
    merchantTransId: string;
    merchantPrepareId?: string;
    amount: string;
    action: number;
    signTime: string;
    signString: string;
  }) {
    const secretKey = this.config.get<string>('CLICK_SECRET_KEY') ?? '';
    const preparedId = merchantPrepareId ?? '';
    const signature = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${preparedId}${amount}${action}${signTime}`;
    const expected = createHash('md5').update(signature).digest('hex');

    return this.isSignatureEqual(expected, signString);
  }

  private isSignatureEqual(expectedSign: string, providedSign: string) {
    const expected = Buffer.from(expectedSign);
    const provided = Buffer.from(providedSign ?? '');

    if (expected.length !== provided.length) {
      return false;
    }

    return timingSafeEqual(expected, provided);
  }

  private isAmountEqual(orderAmount: number, requestAmount: number) {
    return Math.abs(orderAmount - requestAmount) < 0.01;
  }

  private isValidClickSignTime(signTime: string) {
    const shouldValidate =
      this.config.get<string>('CLICK_VALIDATE_SIGN_TIME')?.toLowerCase() ===
      'true';

    if (!shouldValidate) {
      return true;
    }

    if (!signTime) {
      return false;
    }

    const parsed = Date.parse(signTime.replace(' ', 'T'));

    if (Number.isNaN(parsed)) {
      this.logger.warn(`CLICK invalid sign_time format: ${signTime}`);
      return false;
    }

    const maxDriftSeconds = Number(
      this.config.get<string>('CLICK_SIGN_TIME_MAX_DRIFT_SEC') ?? 900,
    );
    const diffMs = Math.abs(Date.now() - parsed);

    if (diffMs > maxDriftSeconds * 1000) {
      this.logger.warn(
        `CLICK sign_time drift exceeded: drift_ms=${diffMs}, max_sec=${maxDriftSeconds}`,
      );
      return false;
    }

    return true;
  }

  private getClickPrepareSuccessResponse(
    clickTransId: string,
    merchantTransId: string,
    merchantPrepareId: string,
  ): ClickWebhookResponse {
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      merchant_prepare_id: merchantPrepareId,
      error: String(ClickErrorCode.SUCCESS),
      error_note: 'SUCCESS',
    };
  }

  private buildClickReturnUrl(orderId: string) {
    const configuredBase =
      this.config.get<string>('CLICK_RETURN_URL_BASE') ??
      this.config.get<string>('CLIENT_URL') ??
      this.config.get<string>('TELEGRAM_WEBAPP_URL') ??
      '';

    const firstUrl = configuredBase
      .split(',')
      .map((value) => value.trim())
      .find(Boolean);

    if (!firstUrl) {
      return undefined;
    }

    try {
      const url = new URL(firstUrl);
      return `${url.origin}/mobile/orders/${orderId}`;
    } catch {
      return `${firstUrl.replace(/\/$/, '')}/mobile/orders/${orderId}`;
    }
  }

  private mergeRawResponse(
    current: Record<string, any> | null | undefined,
    next: ClickWebhookDto,
  ) {
    return {
      ...(current ?? {}),
      last_click_payload: {
        ...next,
      },
    };
  }

  private async runPendingClickOrderCleanup() {
    if (this.cleanupInProgress) {
      return;
    }

    this.cleanupInProgress = true;

    try {
      const ttlMinutes = Number(
        this.config.get<string>('CLICK_PENDING_TTL_MINUTES') ?? 15,
      );

      if (ttlMinutes <= 0) {
        return;
      }

      const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000);
      const expiredOrders = await this.orderRepo
        .createQueryBuilder('order')
        .select(['order.id'])
        .where('order.payment_method = :paymentMethod', {
          paymentMethod: PaymentMethod.CLICK,
        })
        .andWhere('order.is_paid = false')
        .andWhere('order.status = :status', {
          status: OrderStatus.PENDING,
        })
        .andWhere('order.createdAt <= :cutoff', { cutoff })
        .getMany();

      for (const order of expiredOrders) {
        await this.cancelExpiredClickOrder(order.id);
      }
    } catch (error) {
      this.logger.error(
        `Pending CLICK cleanup failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      this.cleanupInProgress = false;
    }
  }

  private async cancelExpiredClickOrder(orderId: string) {
    try {
      await this.orderService.cancelOrderWithInventoryRestore(orderId, {
        reason: 'ONLINE_PAYMENT_TIMEOUT',
        reopenBroadcastRequest: true,
      });

      await this.paymentRepo
        .createQueryBuilder()
        .update(Payment)
        .set({
          status: PaymentStatus.CANCELLED,
          provider_cancel_time: Date.now(),
          cancel_reason: ClickErrorCode.ERROR_IN_REQUEST_FROM_CLICK,
        })
        .where('order_id = :orderId', { orderId })
        .andWhere('provider = :provider', {
          provider: PaymentProvider.CLICK,
        })
        .andWhere('status IN (:...statuses)', {
          statuses: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
        })
        .execute();

      this.logger.warn(
        `Expired CLICK order cancelled automatically: ${orderId}`,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        return;
      }

      this.logger.error(
        `Failed to cancel expired CLICK order ${orderId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private getPaymeOrderId(params: PaymeParams) {
    const account = this.getRecord(params.account);
    const orderId = account?.order_id;

    return typeof orderId === 'string' ? orderId : '';
  }

  private getPaymeTransactionId(params: PaymeParams) {
    const transactionId = params.id;

    return typeof transactionId === 'string' ? transactionId : '';
  }

  private getPaymeAmount(params: PaymeParams) {
    const amount = params.amount;

    return typeof amount === 'number' ? amount : Number.NaN;
  }

  private getRecord(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }
}
