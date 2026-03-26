import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentProvider, PaymentStatus } from './payment.entity';
import { Order, OrderStatus } from '../order/entities/order.entity';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

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

  async prepareClick(payload: {
    click_trans_id: string;
    service_id: string;
    merchant_trans_id: string;
    amount: number;
    action: number;
    sign_time: string;
    sign_string: string;
  }) {
    const payment = await this.paymentRepo.findOne({
      where: { order_id: payload.merchant_trans_id },
    });

    if (!payment) {
      return { error: -1, error_note: 'Order not found' };
    }

    if (payment.status === PaymentStatus.PAID) {
      return { error: -4, error_note: 'Already paid' };
    }

    const order = await this.orderRepo.findOne({
      where: { id: payment.order_id },
    });

    if (!order) {
      return { error: -1, error_note: 'Order not found' };
    }

    if (Number(payload.amount) < Number(order.total_price)) {
      return { error: -2, error_note: 'Incorrect amount' };
    }

    return {
      click_trans_id: payload.click_trans_id,
      merchant_trans_id: payload.merchant_trans_id,
      merchant_prepare_id: payment.id,
      error: 0,
      error_note: '',
    };
  }

  async completeClick(payload: {
    click_trans_id: string;
    service_id: string;
    merchant_trans_id: string;
    merchant_prepare_id: string;
    amount: number;
    action: number;
    sign_time: string;
    sign_string: string;
  }) {
    const payment = await this.paymentRepo.findOne({
      where: { id: payload.merchant_prepare_id },
    });

    if (!payment) {
      return { error: -1, error_note: 'Payment not found' };
    }

    if (payment.status === PaymentStatus.PAID) {
      return { error: -4, error_note: 'Already paid' };
    }

    payment.status = PaymentStatus.PAID;
    payment.transaction_id = payload.click_trans_id;
    payment.paid_at = new Date();
    payment.raw_response = payload as any;
    await this.paymentRepo.save(payment);

    await this.orderRepo.update(payment.order_id, {
      is_paid: true,
      payment_method: 'CLICK' as any,
    });

    return {
      click_trans_id: payload.click_trans_id,
      merchant_trans_id: payload.merchant_trans_id,
      merchant_prepare_id: payment.id,
      error: 0,
      error_note: '',
    };
  }

  async checkPayme(payload: {
    id: number;
    method: string;
    params: Record<string, any>;
  }) {
    const { method, params } = payload;

    switch (method) {
      case 'CheckPerformTransaction':
        return this.checkPerformTransaction(params);
      case 'CreateTransaction':
        return this.createPaymeTransaction(params, payload.id);
      case 'PerformTransaction':
        return this.performPaymeTransaction(params, payload.id);
      case 'CancelTransaction':
        return this.cancelPaymeTransaction(params, payload.id);
      case 'CheckTransaction':
        return this.checkPaymeTransaction(params);
      default:
        return { error: { code: -32601, message: 'Method not found' } };
    }
  }

  private async checkPerformTransaction(params: Record<string, any>) {
    const orderId = params.account?.order_id;
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
    if (params.amount !== amount) {
      return { error: { code: -31001, message: 'Incorrect amount' } };
    }

    return { result: { allow: true } };
  }

  private async createPaymeTransaction(
    params: Record<string, any>,
    rpcId: number,
  ) {
    const orderId = params.account?.order_id;
    const existing = await this.paymentRepo.findOne({
      where: { transaction_id: params.id },
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
      transaction_id: params.id,
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

  private async performPaymeTransaction(
    params: Record<string, any>,
    rpcId: number,
  ) {
    const payment = await this.paymentRepo.findOne({
      where: { transaction_id: params.id },
    });

    if (!payment) {
      return { error: { code: -31003, message: 'Transaction not found' } };
    }

    if (payment.status === PaymentStatus.PAID) {
      return {
        result: {
          transaction: payment.id,
          perform_time: Math.floor(payment.paid_at.getTime()),
          state: 2,
        },
      };
    }

    payment.status = PaymentStatus.PAID;
    payment.paid_at = new Date();
    await this.paymentRepo.save(payment);

    await this.orderRepo.update(payment.order_id, {
      is_paid: true,
      payment_method: 'PAYME' as any,
    });

    return {
      result: {
        transaction: payment.id,
        perform_time: Math.floor(Date.now()),
        state: 2,
      },
    };
  }

  private async cancelPaymeTransaction(
    params: Record<string, any>,
    rpcId: number,
  ) {
    const payment = await this.paymentRepo.findOne({
      where: { transaction_id: params.id },
    });

    if (!payment) {
      return { error: { code: -31003, message: 'Transaction not found' } };
    }

    if (payment.status === PaymentStatus.PAID) {
      return { error: { code: -31007, message: 'Cannot cancel paid transaction' } };
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

  private async checkPaymeTransaction(params: Record<string, any>) {
    const payment = await this.paymentRepo.findOne({
      where: { transaction_id: params.id },
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
      performTime = Math.floor(payment.paid_at.getTime());
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
}
