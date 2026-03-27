import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Order, OrderStatus, OrderType, PaymentMethod } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Store } from '../store/entities/store.entity';
import { StoreProduct, StoreProductStatus } from '../store-product/store-product.entity';
import { StoreDeliverySettings } from '../store/entities/store-delivery-settings.entity';
import {
  BroadcastRequest,
  BroadcastRequestStatus,
} from './entities/broadcast-request.entity';
import { BroadcastRequestItem } from './entities/broadcast-request-item.entity';
import {
  BroadcastOffer,
  BroadcastOfferStatus,
} from './entities/broadcast-offer.entity';
import { BroadcastOfferItem } from './entities/broadcast-offer-item.entity';
import { Product } from '../product/product.entity';
import { CreateBroadcastRequestDto } from './dto/create-broadcast-request.dto';
import { CreateBroadcastOfferDto } from './dto/create-broadcast-offer.dto';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';

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
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(StoreProduct)
    private readonly storeProductRepo: Repository<StoreProduct>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(BroadcastRequest)
    private readonly broadcastRequestRepo: Repository<BroadcastRequest>,
    @InjectRepository(BroadcastRequestItem)
    private readonly broadcastRequestItemRepo: Repository<BroadcastRequestItem>,
    @InjectRepository(BroadcastOffer)
    private readonly broadcastOfferRepo: Repository<BroadcastOffer>,
    @InjectRepository(BroadcastOfferItem)
    private readonly broadcastOfferItemRepo: Repository<BroadcastOfferItem>,
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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = queryRunner.manager.create(Order, {
        order_number: `ORD-${Date.now()}`,
        order_type: OrderType.DIRECT,
        customer_id: customerId,
        store_id: dto.store_id,
        items_price: itemsPrice,
        delivery_price: deliveryPrice,
        total_price: itemsPrice + deliveryPrice,
        payment_method: dto.payment_method || PaymentMethod.CASH,
        delivery_lat: dto.delivery_lat,
        delivery_lng: dto.delivery_lng,
        delivery_address: dto.delivery_address,
        delivery_details: dto.delivery_details,
        customer_note: dto.note,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await queryRunner.manager.save(order);
      const orderItems: Partial<OrderItem>[] = [];

      for (const item of dto.items) {
        const storeProduct = await queryRunner.manager.findOne(StoreProduct, {
          where: { id: item.store_product_id },
          relations: ['product'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!storeProduct || storeProduct.store_id !== dto.store_id) {
          throw new BadRequestException(
            `Product not found in store: ${item.store_product_id}`,
          );
        }

        if (
          storeProduct.status === StoreProductStatus.INACTIVE ||
          storeProduct.stock < item.quantity
        ) {
          throw new BadRequestException(
            `Insufficient stock for product: ${storeProduct.product_id}`,
          );
        }

        storeProduct.stock -= item.quantity;
        storeProduct.status = this.resolveStoreProductStatus(
          Number(storeProduct.price),
          Number(storeProduct.stock),
        );
        await queryRunner.manager.save(storeProduct);

        orderItems.push({
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

      await queryRunner.manager.save(OrderItem, orderItems);
      await queryRunner.commitTransaction();

      return this.findById(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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

    const queryRunner = this.dataSource.createQueryRunner();
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
        storeProduct.status = this.resolveStoreProductStatus(
          Number(storeProduct.price),
          Number(storeProduct.stock),
        );
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
      relations: [
        'items',
        'items.product',
        'store',
        'store.deliverySettings',
        'customer',
        'courier',
      ],
    });
  }

  async findByCustomer(customerId: string, status?: OrderStatus) {
    const where: any = { customer_id: customerId };
    if (status) where.status = status;

    return this.orderRepo.find({
      where,
      relations: ['items', 'store', 'courier'],
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

    if (order.courier_id && order.courier_id !== courierId) {
      throw new BadRequestException('Order already assigned');
    }

    order.courier_id = courierId;
    order.status = OrderStatus.DELIVERING;

    return this.orderRepo.save(order);
  }

  async deliverOrder(orderId: string, courierId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, courier_id: courierId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.DELIVERING) {
      throw new BadRequestException('Order is not in delivery');
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

  async createBroadcastRequest(dto: CreateBroadcastRequestDto, customerId: string) {
    if (!dto.items.length) {
      throw new BadRequestException('At least one item is required');
    }

    const productIds = dto.items.map((item) => item.product_id);
    const products = await this.productRepo.find({
      where: {
        id: In(productIds),
      },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));

    const missingProductId = dto.items.find(
      (item) => !productMap.has(item.product_id),
    )?.product_id;

    if (missingProductId) {
      throw new NotFoundException(`Product not found: ${missingProductId}`);
    }

    const request = this.broadcastRequestRepo.create({
      customer_id: customerId,
      title: dto.title?.trim() || 'Yangi bozordan so‘rov',
      note: dto.note?.trim() || null,
      radius_km: dto.radius_km ?? 5,
      delivery_lat: dto.delivery_lat,
      delivery_lng: dto.delivery_lng,
      delivery_address: dto.delivery_address,
      delivery_details: dto.delivery_details ?? null,
      expires_at: new Date(
        Date.now() + (dto.expires_in_minutes ?? 120) * 60 * 1000,
      ),
    });

    const savedRequest = await this.broadcastRequestRepo.save(request);

    const items = dto.items.map((item) => {
      const product = productMap.get(item.product_id)!;

      return this.broadcastRequestItemRepo.create({
        request_id: savedRequest.id,
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
      });
    });

    await this.broadcastRequestItemRepo.save(items);

    return this.findBroadcastRequestById(
      savedRequest.id,
      customerId,
      AuthRoleEnum.CUSTOMER,
    );
  }

  async findMyBroadcastRequests(customerId: string) {
    const requests = await this.broadcastRequestRepo.find({
      where: { customer_id: customerId },
      relations: [
        'items',
        'offers',
        'offers.store',
        'offers.items',
      ],
      order: { createdAt: 'DESC' },
    });

    return requests.map((request) => this.decorateBroadcastRequest(request));
  }

  async findStoreBroadcastFeed(sellerId: string, radiusKm: number = 10) {
    const store = await this.storeRepo.findOne({
      where: { owner_id: sellerId },
      relations: ['deliverySettings'],
    });

    if (!store?.lat || !store?.lng) {
      return [];
    }

    const requests = await this.broadcastRequestRepo.find({
      where: { status: BroadcastRequestStatus.OPEN },
      relations: [
        'items',
        'offers',
        'offers.items',
        'offers.store',
      ],
      order: { createdAt: 'DESC' },
    });

    return requests
      .map((request) => this.decorateBroadcastRequest(request))
      .filter((request) => {
        if (request.status !== BroadcastRequestStatus.OPEN) {
          return false;
        }

        const distanceMeters = calculateDistance(
          Number(store.lat),
          Number(store.lng),
          Number(request.delivery_lat),
          Number(request.delivery_lng),
        );

        const withinFeedRadius = distanceMeters <= radiusKm * 1000;
        const withinRequestRadius =
          distanceMeters <= Number(request.radius_km) * 1000;

        return withinFeedRadius && withinRequestRadius;
      })
      .map((request) => ({
        ...request,
        my_offer:
          request.offers?.find((offer) => offer.seller_id === sellerId) ?? null,
      }));
  }

  async findBroadcastRequestById(
    id: string,
    userId: string,
    role: AuthRoleEnum,
  ) {
    const request = await this.broadcastRequestRepo.findOne({
      where: { id },
      relations: [
        'items',
        'offers',
        'offers.items',
        'offers.store',
      ],
    });

    if (!request) {
      throw new NotFoundException('Broadcast request not found');
    }

    if (
      role === AuthRoleEnum.CUSTOMER &&
      request.customer_id !== userId
    ) {
      throw new NotFoundException('Broadcast request not found');
    }

    return this.decorateBroadcastRequest(request);
  }

  async findBroadcastOffers(
    requestId: string,
    userId: string,
    role: AuthRoleEnum,
  ) {
    const request = await this.broadcastRequestRepo.findOne({
      where: { id: requestId },
      relations: ['offers', 'offers.items', 'offers.store'],
    });

    if (!request) {
      throw new NotFoundException('Broadcast request not found');
    }

    if (
      role === AuthRoleEnum.CUSTOMER &&
      request.customer_id !== userId
    ) {
      throw new NotFoundException('Broadcast request not found');
    }

    return request.offers.sort(
      (left, right) => Number(left.total_price) - Number(right.total_price),
    );
  }

  async createOrUpdateBroadcastOffer(
    requestId: string,
    sellerId: string,
    dto: CreateBroadcastOfferDto,
  ) {
    if (!dto.items.length) {
      throw new BadRequestException('At least one offer item is required');
    }

    const request = await this.broadcastRequestRepo.findOne({
      where: { id: requestId },
      relations: ['items'],
    });

    if (!request) {
      throw new NotFoundException('Broadcast request not found');
    }

    this.ensureBroadcastRequestIsOpen(request);

    const store = await this.storeRepo.findOne({
      where: { owner_id: sellerId },
    });

    if (!store) {
      throw new NotFoundException('Seller store not found');
    }

    const requestItemMap = new Map(request.items.map((item) => [item.id, item]));
    let subtotalPrice = 0;

    const existingOffer = await this.broadcastOfferRepo.findOne({
      where: {
        request_id: requestId,
        store_id: store.id,
      },
      relations: ['items'],
    });

    const preparedItems: BroadcastOfferItem[] = [];

    for (const offerItem of dto.items) {
      const requestItem = requestItemMap.get(offerItem.request_item_id);
      if (!requestItem) {
        throw new BadRequestException(
          `Request item not found: ${offerItem.request_item_id}`,
        );
      }

      let matchedStoreProduct: StoreProduct | null = null;

      if (offerItem.store_product_id) {
        matchedStoreProduct = await this.storeProductRepo.findOne({
          where: {
            id: offerItem.store_product_id,
            store_id: store.id,
          },
        });

        if (!matchedStoreProduct) {
          throw new BadRequestException('Store product not found for offer item');
        }
      } else {
        matchedStoreProduct =
          (await this.storeProductRepo.findOne({
            where: {
              store_id: store.id,
              product_id: requestItem.product_id,
            },
          })) ?? null;
      }

      const totalPrice = Number(offerItem.unit_price) * requestItem.quantity;
      subtotalPrice += totalPrice;

      preparedItems.push(
        this.broadcastOfferItemRepo.create({
          request_item_id: requestItem.id,
          product_id: requestItem.product_id,
          product_name: requestItem.product_name,
          quantity: requestItem.quantity,
          unit_price: offerItem.unit_price,
          total_price: totalPrice,
          store_product_id: matchedStoreProduct?.id ?? null,
        }),
      );
    }

    const offer =
      existingOffer ??
      this.broadcastOfferRepo.create({
        request_id: request.id,
        store_id: store.id,
        seller_id: sellerId,
      });

    offer.seller_id = sellerId;
    offer.message = dto.message?.trim() || null;
    offer.delivery_price = dto.delivery_price ?? 0;
    offer.estimated_minutes = dto.estimated_minutes ?? 30;
    offer.subtotal_price = subtotalPrice;
    offer.total_price = subtotalPrice + Number(offer.delivery_price);
    offer.status = BroadcastOfferStatus.PENDING;

    const savedOffer = await this.broadcastOfferRepo.save(offer);

    if (existingOffer?.items?.length) {
      await this.broadcastOfferItemRepo.delete({ offer_id: existingOffer.id });
    }

    preparedItems.forEach((item) => {
      item.offer_id = savedOffer.id;
    });

    await this.broadcastOfferItemRepo.save(preparedItems);

    return this.broadcastOfferRepo.findOne({
      where: { id: savedOffer.id },
      relations: ['items', 'store'],
    });
  }

  async selectBroadcastOffer(
    requestId: string,
    offerId: string,
    customerId: string,
    paymentMethod: PaymentMethod = PaymentMethod.CASH,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const request = await queryRunner.manager.findOne(BroadcastRequest, {
        where: {
          id: requestId,
          customer_id: customerId,
        },
        relations: ['items'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!request) {
        throw new NotFoundException('Broadcast request not found');
      }

      this.ensureBroadcastRequestIsOpen(request);

      const offer = await queryRunner.manager.findOne(BroadcastOffer, {
        where: {
          id: offerId,
          request_id: requestId,
          status: BroadcastOfferStatus.PENDING,
        },
        relations: ['items'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!offer) {
        throw new NotFoundException('Broadcast offer not found');
      }

      const order = queryRunner.manager.create(Order, {
        order_number: `BRC-${Date.now()}`,
        order_type: OrderType.BROADCAST,
        customer_id: customerId,
        store_id: offer.store_id,
        items_price: offer.subtotal_price,
        delivery_price: offer.delivery_price,
        total_price: offer.total_price,
        payment_method: paymentMethod,
        delivery_lat: request.delivery_lat,
        delivery_lng: request.delivery_lng,
        delivery_address: request.delivery_address,
        delivery_details: request.delivery_details,
        customer_note: request.note,
        status: OrderStatus.PENDING,
      } as Partial<Order>);

      const savedOrder = await queryRunner.manager.save(order);

      for (const item of offer.items) {
        if (item.store_product_id) {
          const storeProduct = await queryRunner.manager.findOne(StoreProduct, {
            where: {
              id: item.store_product_id,
              store_id: offer.store_id,
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (!storeProduct || storeProduct.stock < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for product: ${item.product_name}`,
            );
          }

          storeProduct.stock -= item.quantity;
          storeProduct.status = this.resolveStoreProductStatus(
            Number(storeProduct.price),
            Number(storeProduct.stock),
          );
          await queryRunner.manager.save(storeProduct);
        }

        await queryRunner.manager.save(OrderItem, {
          order_id: savedOrder.id,
          product_id: item.product_id,
          product_name: item.product_name,
          store_product_id: item.store_product_id ?? undefined,
          quantity: item.quantity,
          price: item.unit_price,
          total_price: item.total_price,
        });
      }

      await queryRunner.manager.update(
        BroadcastOffer,
        { request_id: requestId },
        { status: BroadcastOfferStatus.REJECTED },
      );

      await queryRunner.manager.update(
        BroadcastOffer,
        { id: offer.id },
        { status: BroadcastOfferStatus.SELECTED },
      );

      request.status = BroadcastRequestStatus.SELECTED;
      request.selected_offer_id = offer.id;
      request.selected_at = new Date();
      await queryRunner.manager.save(request);

      await queryRunner.commitTransaction();
      return this.findById(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private decorateBroadcastRequest(request: BroadcastRequest) {
    const now = Date.now();
    const expiresAt = request.expires_at?.getTime() ?? null;
    const isExpired = expiresAt !== null && expiresAt < now;
    const normalizedStatus =
      request.status === BroadcastRequestStatus.OPEN && isExpired
        ? BroadcastRequestStatus.EXPIRED
        : request.status;

    return {
      ...request,
      status: normalizedStatus,
      offers: [...(request.offers ?? [])].sort(
        (left, right) => Number(left.total_price) - Number(right.total_price),
      ),
    };
  }

  private ensureBroadcastRequestIsOpen(request: BroadcastRequest) {
    if (request.status !== BroadcastRequestStatus.OPEN) {
      throw new BadRequestException('Broadcast request is not open');
    }

    if (request.expires_at && request.expires_at.getTime() < Date.now()) {
      throw new BadRequestException('Broadcast request expired');
    }
  }

  private resolveStoreProductStatus(price: number, stock: number) {
    if (price <= 0) {
      return StoreProductStatus.INACTIVE;
    }

    if (stock <= 0) {
      return StoreProductStatus.OUT_OF_STOCK;
    }

    return StoreProductStatus.ACTIVE;
  }
}
