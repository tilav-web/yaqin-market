import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, OrderType } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Store } from '../store/entities/store.entity';
import { StoreProduct } from '../store-product/store-product.entity';
import { StoreDeliverySettings } from '../store/entities/store-delivery-settings.entity';

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(StoreProduct)
    private readonly storeProductRepo: Repository<StoreProduct>,
  ) {}

  async create(createOrderDto: CreateOrderDto, customerId: string) {
    const orderType = createOrderDto.order_type || OrderType.DIRECT;

    if (orderType === OrderType.DIRECT) {
      return this.createDirectOrder(createOrderDto, customerId);
    }

    return this.createBroadcastOrder(createOrderDto, customerId);
  }

  private async createDirectOrder(dto: CreateOrderDto, customerId: string) {
    if (!dto.store_id) {
      throw new BadRequestException('store_id is required for direct orders');
    }

    const store = await this.storeRepo.findOne({
      where: { id: dto.store_id },
      relations: ['deliverySettings'],
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const { deliveryPrice, itemsPrice } = await this.calculatePrices(
      store,
      dto,
    );

    const order = this.orderRepo.create({
      order_number: `ORD-${Date.now()}`,
      order_type: OrderType.DIRECT,
      customer_id: customerId,
      store_id: dto.store_id,
      items_price: itemsPrice,
      delivery_price: deliveryPrice,
      total_price: itemsPrice + deliveryPrice,
      payment_method: dto.payment_method || ('CASH' as any),
      delivery_lat: dto.delivery_lat,
      delivery_lng: dto.delivery_lng,
      delivery_address: dto.delivery_address,
      delivery_details: dto.delivery_details,
      customer_note: dto.note,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await this.orderRepo.save(order);

    const orderItems = await this.buildOrderItems(dto, savedOrder.id);
    await this.orderItemRepo.save(orderItems);

    return this.findById(savedOrder.id);
  }

  private async createBroadcastOrder(dto: CreateOrderDto, customerId: string) {
    const nearbyStores = await this.findStoresWithProducts(
      dto.delivery_lat,
      dto.delivery_lng,
      dto.items,
    );

    if (nearbyStores.length === 0) {
      throw new BadRequestException(
        'No nearby stores found with requested products',
      );
    }

    const store = nearbyStores[0];
    const { deliveryPrice, itemsPrice } = await this.calculatePrices(
      store,
      dto,
    );

    const queryRunner =
      this.orderRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = queryRunner.manager.create(Order, {
        order_number: `BRC-${Date.now()}`,
        order_type: OrderType.BROADCAST,
        customer_id: customerId,
        store_id: store.id,
        items_price: itemsPrice,
        delivery_price: deliveryPrice,
        total_price: itemsPrice + deliveryPrice,
        payment_method: dto.payment_method || ('CASH' as any),
        delivery_lat: dto.delivery_lat,
        delivery_lng: dto.delivery_lng,
        delivery_address: dto.delivery_address,
        delivery_details: dto.delivery_details,
        customer_note: dto.note,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await queryRunner.manager.save(order);

      for (const item of dto.items) {
        const storeProduct = await queryRunner.manager.findOne(StoreProduct, {
          where: { id: item.store_product_id },
          relations: ['product'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!storeProduct || storeProduct.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for: ${item.store_product_id}`,
          );
        }

        storeProduct.stock -= item.quantity;
        await queryRunner.manager.save(storeProduct);

        await queryRunner.manager.save(OrderItem, {
          order_id: savedOrder.id,
          product_id: storeProduct.product_id,
          product_name: storeProduct.product.name,
          product_image: storeProduct.product.images?.[0]?.url,
          store_product_id: storeProduct.id,
          quantity: item.quantity,
          price: storeProduct.price,
          total_price: Number(storeProduct.price) * item.quantity,
        });
      }

      await queryRunner.commitTransaction();
      return this.findById(savedOrder.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async calculatePrices(store: Store, dto: CreateOrderDto) {
    const deliverySettings =
      store.deliverySettings?.[0] as StoreDeliverySettings | undefined;
    let deliveryPrice = 0;

    if (deliverySettings?.is_delivery_enabled) {
      const distance = calculateDistance(
        store.lat,
        store.lng,
        dto.delivery_lat,
        dto.delivery_lng,
      );

      if (distance > Number(deliverySettings.free_delivery_radius)) {
        const extraKm = Math.max(
          0,
          (distance - Number(deliverySettings.free_delivery_radius)) / 1000,
        );
        deliveryPrice =
          Number(deliverySettings.delivery_price_per_km) * extraKm;
      }

      if (distance > Number(deliverySettings.max_delivery_radius)) {
        throw new BadRequestException('Too far for delivery');
      }
    }

    let itemsPrice = 0;

    for (const item of dto.items) {
      const storeProduct = await this.storeProductRepo.findOne({
        where: { id: item.store_product_id },
      });

      if (!storeProduct || storeProduct.store_id !== store.id) {
        throw new BadRequestException(
          `Product not found in store: ${item.store_product_id}`,
        );
      }

      if (storeProduct.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product: ${storeProduct.product_id}`,
        );
      }

      itemsPrice += Number(storeProduct.price) * item.quantity;
    }

    return { deliveryPrice, itemsPrice };
  }

  private async buildOrderItems(dto: CreateOrderDto, orderId: string) {
    const items: Partial<OrderItem>[] = [];

    for (const item of dto.items) {
      const storeProduct = await this.storeProductRepo.findOne({
        where: { id: item.store_product_id },
        relations: ['product'],
      });

      if (!storeProduct) continue;

      items.push({
        order_id: orderId,
        product_id: storeProduct.product_id,
        product_name: storeProduct.product.name,
        product_image: storeProduct.product.images?.[0]?.url,
        store_product_id: storeProduct.id,
        quantity: item.quantity,
        price: storeProduct.price,
        total_price: Number(storeProduct.price) * item.quantity,
      });
    }

    return items;
  }

  private async findStoresWithProducts(
    lat: number,
    lng: number,
    items: { store_product_id: string; quantity: number }[],
  ) {
    const allStores = await this.storeRepo.find({
      where: { is_active: true },
      relations: ['deliverySettings', 'storeProducts'],
    });

    const radiusKm = 5;

    return allStores.filter((store) => {
      if (!store.lat || !store.lng) return false;
      const distance = calculateDistance(lat, lng, store.lat, store.lng);
      if (distance > radiusKm * 1000) return false;

      return items.every((item) =>
        store.storeProducts?.some(
          (sp) =>
            sp.id === item.store_product_id &&
            sp.status === 'ACTIVE' &&
            sp.stock >= item.quantity,
        ),
      );
    });
  }

  async findById(id: string) {
    return this.orderRepo.findOne({
      where: { id },
      relations: ['items', 'items.product', 'store', 'customer', 'courier'],
    });
  }

  async findByCustomer(customerId: string, status?: OrderStatus) {
    const where: any = { customer_id: customerId };
    if (status) where.status = status;

    return this.orderRepo.find({
      where,
      relations: ['items', 'store'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStore(storeId: string, status?: OrderStatus) {
    const where: any = { store_id: storeId };
    if (status) where.status = status;

    return this.orderRepo.find({
      where,
      relations: ['items', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCourier(courierId: string, status?: OrderStatus) {
    const where: any = { courier_id: courierId };
    if (status) where.status = status;

    return this.orderRepo.find({
      where,
      relations: ['items', 'store', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async acceptOrder(orderId: string, storeId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, store_id: storeId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order cannot be accepted');
    }

    order.status = OrderStatus.ACCEPTED;
    order.accepted_at = new Date();

    return this.orderRepo.save(order);
  }

  async readyOrder(orderId: string, storeId: string, note?: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, store_id: storeId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.ACCEPTED) {
      throw new BadRequestException('Order is not accepted');
    }

    order.status = OrderStatus.READY;
    order.ready_at = new Date();
    order.store_note = note ?? '';

    return this.orderRepo.save(order);
  }

  async assignCourier(orderId: string, courierId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException('Order is not ready');
    }

    order.courier_id = courierId;
    order.status = OrderStatus.DELIVERING;

    return this.orderRepo.save(order);
  }

  async deliverOrder(orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.status = OrderStatus.DELIVERED;
    order.delivered_at = new Date();
    order.is_paid = true;

    return this.orderRepo.save(order);
  }

  async cancelOrder(orderId: string, storeId: string, reason: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, store_id: storeId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel delivered order');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelled_at = new Date();
    order.cancelled_reason = reason;

    return this.orderRepo.save(order);
  }

  async findNearbyOrders(lat: number, lng: number, radiusKm: number = 10) {
    const stores = await this.storeRepo.find({
      where: { is_active: true },
      relations: ['deliverySettings'],
    });

    const nearbyStoreIds = stores
      .filter((store) => {
        if (!store.lat || !store.lng) return false;
        const distance = calculateDistance(lat, lng, store.lat, store.lng);
        return distance <= radiusKm * 1000;
      })
      .map((store) => store.id);

    if (nearbyStoreIds.length === 0) {
      return [];
    }

    return this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.store', 'store')
      .leftJoinAndSelect('order.customer', 'customer')
      .where('order.store_id IN (:...ids)', { ids: nearbyStoreIds })
      .andWhere('order.status = :status', { status: OrderStatus.READY })
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  async findBroadcastOrders(lat: number, lng: number, radiusKm: number = 5) {
    return this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.store', 'store')
      .leftJoinAndSelect('order.customer', 'customer')
      .where('order.order_type = :type', { type: OrderType.BROADCAST })
      .andWhere('order.status = :status', { status: OrderStatus.PENDING })
      .orderBy('order.createdAt', 'ASC')
      .getMany();
  }
}
