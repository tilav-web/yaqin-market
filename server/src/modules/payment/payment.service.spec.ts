/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await */
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PaymentStatus } from './payment.entity';
import { PaymentMethod } from '../order/entities/order.entity';

describe('PaymentService', () => {
  const createService = () => {
    const config = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'CLICK_SERVICE_ID':
            return '123';
          case 'CLICK_MERCHANT_ID':
            return 'merchant';
          case 'CLICK_RETURN_URL_BASE':
            return 'https://yaqin-market.uz';
          default:
            return undefined;
        }
      }),
    } as unknown as ConfigService;

    const paymentRepo = {
      findOne: jest.fn(),
      create: jest.fn((payload: Record<string, unknown>) => payload),
      save: jest.fn(async (payload: Record<string, unknown>) => ({
        id: 'payment-1',
        status: PaymentStatus.PENDING,
        ...payload,
      })),
      createQueryBuilder: jest.fn(),
    };

    const orderRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const dataSource = {} as any;
    const orderService = {
      cancelOrderWithInventoryRestore: jest.fn(),
    } as any;
    const rateLimitRedisService = {
      consume: jest.fn(async () => ({
        allowed: true,
        current: 1,
        limit: 20,
        remaining: 19,
        resetInSeconds: 300,
      })),
    } as any;

    const service = new PaymentService(
      config,
      dataSource,
      orderService,
      rateLimitRedisService,
      paymentRepo as any,
      orderRepo as any,
    );

    return { service, paymentRepo, orderRepo, rateLimitRedisService };
  };

  it("returns click url for customer's online order", async () => {
    const { service, paymentRepo, orderRepo } = createService();

    orderRepo.findOne.mockResolvedValue({
      id: 'order-1',
      customer_id: 'user-1',
      total_price: 47000,
      is_paid: false,
      status: 'PENDING',
      payment_method: PaymentMethod.CLICK,
    });
    paymentRepo.findOne.mockResolvedValue(null);

    const result = await service.getClickPaymentUrl('order-1', 'user-1');

    expect(result.url).toContain('service_id=123');
    expect(result.url).toContain('merchant_id=merchant');
    expect(result.url).toContain('transaction_param=order-1');
    expect(result.url).toContain(
      encodeURIComponent('https://yaqin-market.uz/mobile/orders/order-1'),
    );
  });

  it('rejects click url for non-online orders', async () => {
    const { service, orderRepo } = createService();

    orderRepo.findOne.mockResolvedValue({
      id: 'order-2',
      customer_id: 'user-1',
      total_price: 47000,
      is_paid: false,
      status: 'PENDING',
      payment_method: PaymentMethod.CASH,
    });

    await expect(
      service.getClickPaymentUrl('order-2', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
