import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  QueryRunner,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import {
  Order,
  OrderStatus,
  OrderType,
  PaymentMethod,
} from './entities/order.entity';
import { OrderItem, OrderItemStatus } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Store } from '../store/entities/store.entity';
import {
  StoreProduct,
  StoreProductStatus,
} from '../store-product/store-product.entity';
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
import { BroadcastGateway } from './broadcast.gateway';
import { BroadcastVisibleRequest } from './types/broadcast-visible-request.type';
import { NotificationService } from '../notification/notification.service';

const PRIME_BROADCAST_VISIBILITY_DELAY_MS = 0;
const DEFAULT_BROADCAST_VISIBILITY_DELAY_MS = 10000;
const SOCKET_FEED_RADIUS_KM = 12;

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

function calculateDeliveryCharge(
  settings: StoreDeliverySettings,
  distanceMeters: number,
) {
  const freeRadius = Number(settings.free_delivery_radius ?? 0);
  const baseFee = Number(settings.delivery_fee ?? 0);
  const pricePerKm = Number(settings.delivery_price_per_km ?? 0);

  if (distanceMeters <= freeRadius) {
    return 0;
  }

  const extraKm = Math.max(0, (distanceMeters - freeRadius) / 1000);
  return Math.ceil(baseFee + pricePerKm * extraKm);
}

@Injectable()
export class OrderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly broadcastGateway: BroadcastGateway,
    private readonly notificationService: NotificationService,
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

        const product = await queryRunner.manager.findOne(Product, {
          where: { id: storeProduct.product_id },
        });

        storeProduct.stock -= item.quantity;
        storeProduct.status = this.resolveStoreProductStatus(
          Number(storeProduct.price),
          Number(storeProduct.stock),
        );
        await queryRunner.manager.save(storeProduct);

        orderItems.push({
          order_id: savedOrder.id,
          product_id: storeProduct.product_id,
          product_name: product?.name ?? 'Mahsulot',
          product_image: product?.images?.[0]?.url,
          store_product_id: storeProduct.id,
          quantity: item.quantity,
          price: storeProduct.price,
          total_price: Number(storeProduct.price) * item.quantity,
        });
      }

      await queryRunner.manager.save(OrderItem, orderItems);
      await queryRunner.commitTransaction();

      const createdOrder = await this.findById(savedOrder.id);

      // Notify seller about new direct order
      if (store.owner_id) {
        this.broadcastGateway.emitToSellerUser(store.owner_id, 'order:new-direct', {
          order_id: savedOrder.id,
          order_number: savedOrder.order_number,
          notification_type: 'DIRECT',
        });
        void this.notificationService.sendToUser(store.owner_id, {
          title: "Yangi buyurtma 🛒",
          body: `${savedOrder.order_number} - to'g'ridan-to'g'ri buyurtma keldi`,
          data: { order_id: savedOrder.id, type: 'NEW_DIRECT_ORDER', notification_type: 'DIRECT' },
        });
      }

      return createdOrder;
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
        payment_method: dto.payment_method ?? PaymentMethod.CASH,
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
          lock: { mode: 'pessimistic_write' },
        });

        if (!storeProduct || storeProduct.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for: ${item.store_product_id}`,
          );
        }

        const product = await queryRunner.manager.findOne(Product, {
          where: { id: storeProduct.product_id },
        });

        storeProduct.stock -= item.quantity;
        storeProduct.status = this.resolveStoreProductStatus(
          Number(storeProduct.price),
          Number(storeProduct.stock),
        );
        await queryRunner.manager.save(storeProduct);

        await queryRunner.manager.save(OrderItem, {
          order_id: savedOrder.id,
          product_id: storeProduct.product_id,
          product_name: product?.name ?? 'Mahsulot',
          product_image: product?.images?.[0]?.url,
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
    const deliverySettings = store.deliverySettings?.[0] as
      | StoreDeliverySettings
      | undefined;
    let deliveryPrice = 0;

    if (deliverySettings?.is_delivery_enabled) {
      const distance = calculateDistance(
        store.lat,
        store.lng,
        dto.delivery_lat,
        dto.delivery_lng,
      );

      if (distance > Number(deliverySettings.max_delivery_radius)) {
        throw new BadRequestException('Too far for delivery');
      }

      deliveryPrice = calculateDeliveryCharge(deliverySettings, distance);
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
            sp.status === StoreProductStatus.ACTIVE &&
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
    const where: FindOptionsWhere<Order> = { customer_id: customerId };
    if (status) where.status = status;

    return this.orderRepo.find({
      where,
      relations: ['items', 'store', 'courier'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStore(storeId: string, status?: OrderStatus) {
    const where: FindOptionsWhere<Order> = { store_id: storeId };
    if (status) where.status = status;

    return this.orderRepo.find({
      where,
      relations: ['items', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCourier(courierId: string, status?: OrderStatus) {
    const where: FindOptionsWhere<Order> = { courier_id: courierId };
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
      relations: ['store'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order cannot be accepted');
    }

    if (order.payment_method !== PaymentMethod.CASH && !order.is_paid) {
      throw new BadRequestException(
        'Online to`lov qilinmagan buyurtmani qabul qilib bo`lmaydi',
      );
    }

    order.status = OrderStatus.ACCEPTED;
    order.accepted_at = new Date();

    const saved = await this.orderRepo.save(order);

    this.broadcastGateway.emitToCustomerUser(order.customer_id, 'order:status-changed', {
      order_id: orderId,
      status: OrderStatus.ACCEPTED,
      store_name: order.store?.name,
      notification_type: order.order_type,
    });

    void this.notificationService.sendToUser(order.customer_id, {
      title: "Buyurtma qabul qilindi ✅",
      body: `${order.store?.name ?? 'Do\'kon'} buyurtmangizni qabul qildi`,
      data: { order_id: orderId, type: 'ORDER_ACCEPTED' },
    });

    return saved;
  }

  async acceptOrderItems(
    orderId: string,
    storeId: string,
    acceptedItemIds: string[],
  ) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, store_id: storeId },
      relations: ['items', 'store'],
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING)
      throw new BadRequestException('Order cannot be accepted');

    if (order.payment_method !== PaymentMethod.CASH && !order.is_paid) {
      throw new BadRequestException('Online to`lov qilinmagan buyurtmani qabul qilib bo`lmaydi');
    }

    const acceptedSet = new Set(acceptedItemIds);
    const rejectedItems = order.items.filter(item => !acceptedSet.has(item.id));
    const acceptedItems = order.items.filter(item => acceptedSet.has(item.id));

    if (acceptedItems.length === 0) {
      throw new BadRequestException('Kamida bitta mahsulot tanlanishi kerak');
    }

    // Update item statuses
    for (const item of order.items) {
      item.status = acceptedSet.has(item.id)
        ? OrderItemStatus.ACCEPTED
        : OrderItemStatus.REJECTED;
    }
    await this.orderItemRepo.save(order.items);

    // Recalculate prices for accepted items
    const newItemsPrice = acceptedItems.reduce(
      (sum, item) => sum + Number(item.total_price),
      0,
    );
    order.items_price = newItemsPrice;
    order.total_price = newItemsPrice + Number(order.delivery_price);
    order.status = OrderStatus.ACCEPTED;
    order.accepted_at = new Date();
    await this.orderRepo.save(order);

    this.broadcastGateway.emitToCustomerUser(order.customer_id, 'order:status-changed', {
      order_id: orderId,
      status: OrderStatus.ACCEPTED,
      store_name: order.store?.name,
      accepted_items: acceptedItemIds,
      rejected_items: rejectedItems.map(i => i.id),
      notification_type: order.order_type,
      has_rejected_items: rejectedItems.length > 0,
    });

    void this.notificationService.sendToUser(order.customer_id, {
      title: rejectedItems.length > 0
        ? `Qisman qabul qilindi ⚠️`
        : `Buyurtma qabul qilindi ✅`,
      body: rejectedItems.length > 0
        ? `${order.store?.name} ${acceptedItems.length} ta mahsulotni yetkazib bera oladi. ${rejectedItems.length} ta qoldi.`
        : `${order.store?.name} barcha mahsulotlarni yetkazib beradi`,
      data: {
        order_id: orderId,
        type: 'ORDER_PARTIAL_ACCEPTED',
        rejected_count: String(rejectedItems.length),
      },
    });

    return {
      order: await this.findById(orderId),
      rejected_items: rejectedItems,
      has_rejected_items: rejectedItems.length > 0,
    };
  }

  async readyOrder(orderId: string, storeId: string, note?: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, store_id: storeId },
      relations: ['store'],
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

    const saved = await this.orderRepo.save(order);

    this.broadcastGateway.emitToCustomerUser(order.customer_id, 'order:status-changed', {
      order_id: orderId,
      status: OrderStatus.READY,
      store_name: order.store?.name,
      notification_type: order.order_type,
    });

    void this.notificationService.sendToUser(order.customer_id, {
      title: "Buyurtma tayyor 🎉",
      body: `${order.store?.name ?? 'Do\'kon'} buyurtmangizni tayyor qildi`,
      data: { order_id: orderId, type: 'ORDER_READY' },
    });

    return saved;
  }

  async assignCourier(orderId: string, courierId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['store'],
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

    const saved = await this.orderRepo.save(order);

    this.broadcastGateway.emitToCustomerUser(order.customer_id, 'order:status-changed', {
      order_id: orderId,
      status: OrderStatus.DELIVERING,
      courier_id: courierId,
      notification_type: order.order_type,
    });

    void this.notificationService.sendToUser(order.customer_id, {
      title: "Buyurtma yo'lda 🚗",
      body: "Kuryer buyurtmangizni olib ketdi, tez orada yetib keladi",
      data: { order_id: orderId, type: 'ORDER_DELIVERING', courier_id: courierId },
    });

    return saved;
  }

  async deliverOrder(orderId: string, courierId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, courier_id: courierId },
      relations: ['store'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.DELIVERING) {
      throw new BadRequestException('Order is not in delivery');
    }

    if (order.payment_method !== PaymentMethod.CASH && !order.is_paid) {
      throw new BadRequestException(
        'Online to`lov tasdiqlanmagan buyurtmani yakunlab bo`lmaydi',
      );
    }

    order.status = OrderStatus.DELIVERED;
    order.delivered_at = new Date();

    if (order.payment_method === PaymentMethod.CASH) {
      order.is_paid = true;
    }

    const saved = await this.orderRepo.save(order);

    this.broadcastGateway.emitToCustomerUser(order.customer_id, 'order:status-changed', {
      order_id: orderId,
      status: OrderStatus.DELIVERED,
      notification_type: order.order_type,
    });

    void this.notificationService.sendToUser(order.customer_id, {
      title: "Buyurtma yetkazildi 🎉",
      body: "Buyurtmangiz muvaffaqiyatli yetkazildi!",
      data: { order_id: orderId, type: 'ORDER_DELIVERED' },
    });

    return saved;
  }

  async getCourierLocation(orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, status: OrderStatus.DELIVERING },
      relations: ['courier'],
    });

    if (!order) throw new NotFoundException('Order not found or not in delivery');
    if (!order.courier) throw new NotFoundException('Courier not assigned');

    return {
      courier_id: order.courier_id,
      lat: order.courier.current_lat,
      lng: order.courier.current_lng,
      last_update: order.courier.last_location_update,
    };
  }

  async cancelOrder(orderId: string, storeId: string, reason: string) {
    await this.cancelOrderWithInventoryRestore(orderId, {
      storeId,
      reason,
    });

    return this.findById(orderId);
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

  async findBroadcastOrders() {
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

  async createBroadcastRequest(
    dto: CreateBroadcastRequestDto,
    customerId: string,
  ) {
    if (!dto.items.length) {
      throw new BadRequestException('At least one item is required');
    }

    const productIds = dto.items.map((item) => String(item.product_id));
    const products = await this.productRepo
      .createQueryBuilder('product')
      .where('product.id IN (:...ids)', { ids: productIds })
      .getMany();
    const productMap = new Map(
      products.map((product) => [String(product.id), product]),
    );

    const missingProductId = dto.items.find(
      (item) => !productMap.has(String(item.product_id)),
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
      prime_visible_at: new Date(),
      regular_visible_at: new Date(
        Date.now() + DEFAULT_BROADCAST_VISIBILITY_DELAY_MS,
      ),
      expires_at: new Date(
        Date.now() + (dto.expires_in_minutes ?? 120) * 60 * 1000,
      ),
    });

    const savedRequest = await this.broadcastRequestRepo.save(request);

    const items = dto.items.map((item) => {
      const product = productMap.get(String(item.product_id))!;

      return this.broadcastRequestItemRepo.create({
        request_id: savedRequest.id,
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
      });
    });

    await this.broadcastRequestItemRepo.save(items);

    const createdRequest = await this.findBroadcastRequestById(
      savedRequest.id,
      customerId,
      AuthRoleEnum.CUSTOMER,
    );

    void this.scheduleBroadcastRequestNotifications(savedRequest.id);

    return createdRequest;
  }

  async findMyBroadcastRequests(customerId: string) {
    const requests = await this.broadcastRequestRepo.find({
      where: { customer_id: customerId },
      relations: ['items', 'offers', 'offers.store', 'offers.items'],
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
      relations: ['items', 'offers', 'offers.items', 'offers.store'],
      order: { createdAt: 'DESC' },
    });

    return requests
      .map((request) => this.decorateBroadcastRequest(request))
      .filter((request) => {
        return this.isBroadcastRequestVisibleToStore(request, store, radiusKm);
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
      relations: ['items', 'offers', 'offers.items', 'offers.store'],
    });

    if (!request) {
      throw new NotFoundException('Broadcast request not found');
    }

    if (this.isBroadcastRequestOwner(request, userId)) {
      return this.decorateBroadcastRequest(request);
    }

    if (role === AuthRoleEnum.SUPER_ADMIN) {
      return this.decorateBroadcastRequest(request);
    }

    if (role !== AuthRoleEnum.SELLER) {
      throw new NotFoundException('Broadcast request not found');
    }

    const store = await this.storeRepo.findOne({
      where: { owner_id: userId },
      relations: ['deliverySettings'],
    });

    if (
      !store ||
      !this.isBroadcastRequestVisibleToStore(
        this.decorateBroadcastRequest(request),
        store,
        SOCKET_FEED_RADIUS_KM,
      )
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
      !this.isBroadcastRequestOwner(request, userId) &&
      role !== AuthRoleEnum.SUPER_ADMIN
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
      relations: ['deliverySettings'],
    });

    if (!store) {
      throw new NotFoundException('Seller store not found');
    }

    if (
      !this.isBroadcastRequestVisibleToStore(
        request,
        store,
        SOCKET_FEED_RADIUS_KM,
      )
    ) {
      throw new NotFoundException(
        'Broadcast request not available for this store',
      );
    }

    const requestItemMap = new Map(
      request.items.map((item) => [item.id, item]),
    );
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
          throw new BadRequestException(
            'Store product not found for offer item',
          );
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

    const savedOfferWithRelations = await this.broadcastOfferRepo.findOne({
      where: { id: savedOffer.id },
      relations: ['items', 'store'],
    });

    this.broadcastGateway.emitToCustomerUser(
      request.customer_id,
      'broadcast:offer_updated',
      {
        requestId,
        offerId: savedOffer.id,
      },
    );

    this.broadcastGateway.emitToSellerUser(
      sellerId,
      'broadcast:request_updated',
      {
        requestId,
        offerId: savedOffer.id,
      },
    );

    return savedOfferWithRelations;
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
        lock: { mode: 'pessimistic_write' },
      });

      if (!request) {
        throw new NotFoundException('Broadcast request not found');
      }

      request.items = await queryRunner.manager.find(BroadcastRequestItem, {
        where: { request_id: request.id },
      });

      this.ensureBroadcastRequestIsOpen(request);

      const offer = await queryRunner.manager.findOne(BroadcastOffer, {
        where: {
          id: offerId,
          request_id: requestId,
          status: BroadcastOfferStatus.PENDING,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!offer) {
        throw new NotFoundException('Broadcast offer not found');
      }

      offer.items = await queryRunner.manager.find(BroadcastOfferItem, {
        where: { offer_id: offer.id },
      });

      const order = queryRunner.manager.create(Order, {
        order_number: `BRC-${Date.now()}`,
        order_type: OrderType.BROADCAST,
        customer_id: customerId,
        store_id: offer.store_id,
        source_broadcast_request_id: request.id,
        source_broadcast_offer_id: offer.id,
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
      await this.notifyBroadcastSelection(requestId, request.customer_id);
      return this.findById(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelOrderWithInventoryRestore(
    orderId: string,
    options: {
      reason: string;
      storeId?: string;
      reopenBroadcastRequest?: boolean;
    },
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const whereClause: {
        id: string;
        store_id?: string;
      } = {
        id: orderId,
      };

      if (options.storeId) {
        whereClause.store_id = options.storeId;
      }

      const order = await queryRunner.manager.findOne(Order, {
        where: whereClause,
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status === OrderStatus.DELIVERED) {
        throw new BadRequestException('Cannot cancel delivered order');
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Order already cancelled');
      }

      const items = await queryRunner.manager.find(OrderItem, {
        where: { order_id: order.id },
      });

      await this.restoreInventoryForOrderItems(queryRunner, items);

      order.status = OrderStatus.CANCELLED;
      order.cancelled_at = new Date();
      order.cancelled_reason = options.reason;
      await queryRunner.manager.save(order);

      if (
        options.reopenBroadcastRequest &&
        order.order_type === OrderType.BROADCAST &&
        order.source_broadcast_request_id &&
        order.source_broadcast_offer_id
      ) {
        await this.reopenBroadcastRequestSelection(queryRunner, order);
      }

      await queryRunner.commitTransaction();
      return order;
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

  private isBroadcastRequestOwner(
    request: Pick<BroadcastRequest, 'customer_id'>,
    userId: string,
  ) {
    return request.customer_id === userId;
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

  private getStoreServiceRadiusMeters(store: Store | null | undefined) {
    const settings = store?.deliverySettings?.[0];

    if (!settings?.is_delivery_enabled) {
      return 0;
    }

    return Number(settings.max_delivery_radius ?? 0);
  }

  private getBroadcastVisibilityDelayMs(store: Store) {
    return store.is_prime
      ? PRIME_BROADCAST_VISIBILITY_DELAY_MS
      : DEFAULT_BROADCAST_VISIBILITY_DELAY_MS;
  }

  private isBroadcastRequestVisibleToStore(
    request: BroadcastVisibleRequest,
    store: Store,
    feedRadiusKm: number = SOCKET_FEED_RADIUS_KM,
  ) {
    if (!store.is_active || !store.lat || !store.lng) {
      return false;
    }

    if (request.status !== BroadcastRequestStatus.OPEN) {
      return false;
    }

    const distanceMeters = calculateDistance(
      Number(store.lat),
      Number(store.lng),
      Number(request.delivery_lat),
      Number(request.delivery_lng),
    );

    const withinFeedRadius = distanceMeters <= feedRadiusKm * 1000;
    const withinRequestRadius =
      distanceMeters <= Number(request.radius_km) * 1000;
    const withinStoreRadius =
      distanceMeters <= this.getStoreServiceRadiusMeters(store);
    const visibleFrom =
      store.is_prime || this.getBroadcastVisibilityDelayMs(store) === 0
        ? request.prime_visible_at
        : request.regular_visible_at;
    const visibleByDelay =
      visibleFrom !== null &&
      visibleFrom !== undefined &&
      Date.now() >= new Date(visibleFrom).getTime();

    return (
      withinFeedRadius &&
      withinRequestRadius &&
      withinStoreRadius &&
      visibleByDelay
    );
  }

  private async scheduleBroadcastRequestNotifications(requestId: string) {
    const stores = await this.storeRepo.find({
      where: { is_active: true },
      relations: ['deliverySettings'],
    });

    for (const store of stores) {
      if (!store.owner_id) {
        continue;
      }

      const freshRequest = await this.broadcastRequestRepo.findOne({
        where: { id: requestId },
      });

      if (!freshRequest) {
        continue;
      }

      const visibleFrom =
        store.is_prime || this.getBroadcastVisibilityDelayMs(store) === 0
          ? freshRequest.prime_visible_at
          : freshRequest.regular_visible_at;
      const delayMs = Math.max(
        0,
        new Date(visibleFrom ?? new Date()).getTime() - Date.now(),
      );

      setTimeout(() => {
        void (async () => {
          const latestRequest = await this.broadcastRequestRepo.findOne({
            where: { id: requestId },
            relations: ['items', 'offers', 'offers.items', 'offers.store'],
          });

          if (!latestRequest) {
            return;
          }

          const decoratedRequest = this.decorateBroadcastRequest(latestRequest);

          if (
            this.isBroadcastRequestVisibleToStore(
              decoratedRequest,
              store,
              SOCKET_FEED_RADIUS_KM,
            )
          ) {
            this.broadcastGateway.emitToSellerUser(
              store.owner_id,
              'broadcast:request_created',
              {
                requestId,
              },
            );
          }
        })();
      }, delayMs);
    }
  }

  private async notifyBroadcastSelection(
    requestId: string,
    customerId: string,
  ) {
    const request = await this.broadcastRequestRepo.findOne({
      where: { id: requestId },
      relations: ['offers'],
    });

    this.broadcastGateway.emitToCustomerUser(
      customerId,
      'broadcast:request_updated',
      {
        requestId,
      },
    );

    for (const offer of request?.offers ?? []) {
      if (!offer.seller_id) {
        continue;
      }

      this.broadcastGateway.emitToSellerUser(
        offer.seller_id,
        'broadcast:request_updated',
        {
          requestId,
        },
      );
    }
  }

  private async restoreInventoryForOrderItems(
    queryRunner: QueryRunner,
    items: OrderItem[],
  ) {
    for (const item of items) {
      if (!item.store_product_id) {
        continue;
      }

      const storeProduct = await queryRunner.manager.findOne(StoreProduct, {
        where: { id: item.store_product_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!storeProduct) {
        continue;
      }

      storeProduct.stock += Number(item.quantity);
      storeProduct.status = this.resolveStoreProductStatus(
        Number(storeProduct.price),
        Number(storeProduct.stock),
      );
      await queryRunner.manager.save(storeProduct);
    }
  }

  private async reopenBroadcastRequestSelection(
    queryRunner: QueryRunner,
    order: Order,
  ) {
    const request = await queryRunner.manager.findOne(BroadcastRequest, {
      where: { id: order.source_broadcast_request_id ?? undefined },
      lock: { mode: 'pessimistic_write' },
    });

    if (!request) {
      return;
    }

    if (
      request.status !== BroadcastRequestStatus.SELECTED ||
      request.selected_offer_id !== order.source_broadcast_offer_id
    ) {
      return;
    }

    if (request.expires_at && request.expires_at.getTime() < Date.now()) {
      request.status = BroadcastRequestStatus.EXPIRED;
      await queryRunner.manager.save(request);
      return;
    }

    request.status = BroadcastRequestStatus.OPEN;
    request.selected_offer_id = null;
    request.selected_at = null;
    await queryRunner.manager.save(request);

    await queryRunner.manager
      .createQueryBuilder()
      .update(BroadcastOffer)
      .set({ status: BroadcastOfferStatus.PENDING })
      .where('request_id = :requestId', { requestId: request.id })
      .andWhere('status IN (:...statuses)', {
        statuses: [
          BroadcastOfferStatus.SELECTED,
          BroadcastOfferStatus.REJECTED,
        ],
      })
      .execute();
  }
}
