import { BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { OrderService } from './order.service';
import {
  OrderStatus,
  PaymentMethod,
  type Order,
} from './entities/order.entity';
import { BroadcastGateway } from './broadcast.gateway';
import { OrderItem } from './entities/order-item.entity';
import { Store } from '../store/entities/store.entity';
import { StoreProduct } from '../store-product/store-product.entity';
import { Product } from '../product/product.entity';
import { BroadcastRequest } from './entities/broadcast-request.entity';
import { BroadcastRequestItem } from './entities/broadcast-request-item.entity';
import { BroadcastOffer } from './entities/broadcast-offer.entity';
import { BroadcastOfferItem } from './entities/broadcast-offer-item.entity';

describe('OrderService payment guards', () => {
  const createService = () => {
    const orderRepo = {
      findOne: jest.fn(),
      save: jest.fn((payload: Order) => Promise.resolve(payload)),
    };

    const service = new OrderService(
      {} as DataSource,
      {} as BroadcastGateway,
      { sendToUser: jest.fn(), sendToUsers: jest.fn() } as any,
      orderRepo as unknown as Repository<Order>,
      {} as Repository<OrderItem>,
      {} as Repository<Store>,
      {} as Repository<StoreProduct>,
      {} as Repository<Product>,
      {} as Repository<BroadcastRequest>,
      {} as Repository<BroadcastRequestItem>,
      {} as Repository<BroadcastOffer>,
      {} as Repository<BroadcastOfferItem>,
    );

    return { service, orderRepo };
  };

  it('prevents seller from accepting unpaid click orders', async () => {
    const { service, orderRepo } = createService();

    orderRepo.findOne.mockResolvedValue({
      id: 'order-1',
      store_id: 'store-1',
      status: OrderStatus.PENDING,
      payment_method: PaymentMethod.CLICK,
      is_paid: false,
    });

    await expect(
      service.acceptOrder('order-1', 'store-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks cash delivery order as paid on delivery', async () => {
    const { service, orderRepo } = createService();

    orderRepo.findOne.mockResolvedValue({
      id: 'order-2',
      courier_id: 'courier-1',
      status: OrderStatus.DELIVERING,
      payment_method: PaymentMethod.CASH,
      is_paid: false,
    });

    const result = await service.deliverOrder('order-2', 'courier-1');

    expect(result.is_paid).toBe(true);
    expect(result.status).toBe(OrderStatus.DELIVERED);
  });

  it('prevents courier from completing unpaid online delivery', async () => {
    const { service, orderRepo } = createService();

    orderRepo.findOne.mockResolvedValue({
      id: 'order-3',
      courier_id: 'courier-1',
      status: OrderStatus.DELIVERING,
      payment_method: PaymentMethod.CLICK,
      is_paid: false,
    });

    await expect(
      service.deliverOrder('order-3', 'courier-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
