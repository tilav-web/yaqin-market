import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Review, ReviewTarget } from './review.entity';
import { Store } from '../store/entities/store.entity';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { OrderItem } from '../order/entities/order-item.entity';
import { Product } from '../product/product.entity';
import { User } from '../user/user.entity';
import {
  CreateOrderReviewDto,
  CreateReviewDto,
} from './dto/create-review.dto';

export interface AdminReviewFilter {
  target?: ReviewTarget;
  store_id?: string;
  product_id?: number;
  courier_id?: string;
  min_rating?: number;
  max_rating?: number;
  page?: number;
  limit?: number;
}

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ─── Buyurtma yakunida to'liq baholash ──────────────────────────────────
  async createForOrder(userId: string, dto: CreateOrderReviewDto) {
    const order = await this.orderRepo.findOne({
      where: { id: dto.order_id, customer_id: userId },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Faqat yetkazilgan buyurtmalarni baholash mumkin',
      );
    }

    const productReviews = dto.products ?? [];
    const courierReview = dto.courier;
    if (productReviews.length === 0 && !courierReview) {
      throw new BadRequestException('Hech bo\'lmaganda bitta baho kerak');
    }

    const created: Review[] = [];

    // ── Mahsulot sharhlari
    if (productReviews.length > 0) {
      const validItems = await this.orderItemRepo.find({
        where: { order: { id: order.id } },
      });
      const validProductIds = new Set(
        validItems
          .map((i) => Number(i.product_id))
          .filter((n) => Number.isFinite(n)),
      );

      for (const pr of productReviews) {
        if (!validProductIds.has(Number(pr.product_id))) {
          // Buyurtmada bunday mahsulot yo'q — o'tkazib yuboramiz
          continue;
        }
        const existing = await this.reviewRepo.findOne({
          where: {
            owner_id: userId,
            order_id: order.id,
            target: ReviewTarget.PRODUCT,
            product_id: pr.product_id,
          },
        });
        if (existing) continue;

        const review = this.reviewRepo.create({
          target: ReviewTarget.PRODUCT,
          rating: pr.rating,
          comment: pr.comment ?? null,
          owner_id: userId,
          order_id: order.id,
          product_id: pr.product_id,
          store_id: order.store_id ?? null,
        });
        created.push(await this.reviewRepo.save(review));
      }
    }

    // ── Kuryer sharhi
    if (courierReview && order.courier_id) {
      const existing = await this.reviewRepo.findOne({
        where: {
          owner_id: userId,
          order_id: order.id,
          target: ReviewTarget.COURIER,
        },
      });
      if (!existing) {
        const review = this.reviewRepo.create({
          target: ReviewTarget.COURIER,
          rating: courierReview.rating,
          comment: courierReview.comment ?? null,
          owner_id: userId,
          order_id: order.id,
          courier_id: order.courier_id,
        });
        created.push(await this.reviewRepo.save(review));
      }
    }

    // ── Aggregatsiya
    if (order.store_id) await this.recalculateStoreRating(order.store_id);
    if (order.courier_id) await this.recalculateCourierRating(order.courier_id);

    const productIds = Array.from(
      new Set(productReviews.map((p) => Number(p.product_id))),
    ).filter((n) => Number.isFinite(n));
    for (const pid of productIds) await this.recalculateProductRating(pid);

    return { created: created.length, reviews: created };
  }

  // ─── Eski API — backward compat ─────────────────────────────────────────
  async create(userId: string, dto: CreateReviewDto) {
    const order = await this.orderRepo.findOne({
      where: { id: dto.order_id, customer_id: userId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Can only review delivered orders');
    }

    const existing = await this.reviewRepo.findOne({
      where: {
        owner_id: userId,
        order_id: order.id,
        target: ReviewTarget.STORE,
        store_id: dto.store_id,
      },
    });
    if (existing)
      throw new BadRequestException('Siz bu buyurtma uchun allaqachon sharh qoldirgansiz');

    const review = this.reviewRepo.create({
      target: dto.product_id ? ReviewTarget.PRODUCT : ReviewTarget.STORE,
      rating: dto.rating,
      comment: dto.comment ?? null,
      owner_id: userId,
      order_id: order.id,
      store_id: dto.store_id,
      product_id: dto.product_id ?? null,
    });
    const saved = await this.reviewRepo.save(review);

    await this.recalculateStoreRating(dto.store_id);
    if (dto.product_id) await this.recalculateProductRating(dto.product_id);

    return saved;
  }

  // ─── Ochiq queries ───────────────────────────────────────────────────────
  async findByStore(storeId: string) {
    return this.reviewRepo.find({
      where: { store_id: storeId },
      relations: ['owner', 'product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProduct(productId: number) {
    return this.reviewRepo.find({
      where: { product_id: productId, target: ReviewTarget.PRODUCT },
      relations: ['owner', 'store'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCourier(courierId: string) {
    return this.reviewRepo.find({
      where: { courier_id: courierId, target: ReviewTarget.COURIER },
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string) {
    return this.reviewRepo.find({
      where: { owner_id: userId },
      relations: ['store', 'product', 'courier', 'order'],
      order: { createdAt: 'DESC' },
    });
  }

  /** User shu order uchun qoldirgan barcha sharhlar (product + courier) */
  async findByOrder(userId: string, orderId: string) {
    return this.reviewRepo.find({
      where: { owner_id: userId, order_id: orderId },
    });
  }

  // ─── Admin queries ───────────────────────────────────────────────────────
  async adminList(filter: AdminReviewFilter) {
    const page = Math.max(1, Math.floor(Number(filter.page) || 1));
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(Number(filter.limit) || 20)),
    );

    const qb = this.reviewRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.owner', 'owner')
      .leftJoinAndSelect('owner.auth', 'ownerAuth')
      .leftJoinAndSelect('r.product', 'product')
      .leftJoinAndSelect('r.store', 'store')
      .leftJoinAndSelect('r.courier', 'courier')
      .leftJoinAndSelect('courier.auth', 'courierAuth')
      .orderBy('r.createdAt', 'DESC');

    if (filter.target) qb.andWhere('r.target = :target', { target: filter.target });
    if (filter.store_id) qb.andWhere('r.store_id = :sid', { sid: filter.store_id });
    if (filter.courier_id) qb.andWhere('r.courier_id = :cid', { cid: filter.courier_id });
    if (filter.product_id) qb.andWhere('r.product_id = :pid', { pid: filter.product_id });
    if (filter.min_rating)
      qb.andWhere('r.rating >= :mr', { mr: Number(filter.min_rating) });
    if (filter.max_rating)
      qb.andWhere('r.rating <= :xr', { xr: Number(filter.max_rating) });

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: total ? Math.ceil(total / limit) : 0,
        hasMore: page * limit < total,
      },
    };
  }

  async adminDelete(reviewId: string) {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Sharh topilmadi');
    await this.reviewRepo.remove(review);

    if (review.store_id) await this.recalculateStoreRating(review.store_id);
    if (review.product_id) await this.recalculateProductRating(Number(review.product_id));
    if (review.courier_id) await this.recalculateCourierRating(review.courier_id);

    return { success: true };
  }

  async adminStats() {
    const totalReviews = await this.reviewRepo.count();

    const byTarget = await this.reviewRepo
      .createQueryBuilder('r')
      .select('r.target', 'target')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(r.rating)', 'avg')
      .groupBy('r.target')
      .getRawMany<{ target: string; count: string; avg: string | null }>();

    const lowRating = await this.reviewRepo.count({ where: { rating: In([1, 2]) } });

    return {
      total: totalReviews,
      low_rating: lowRating,
      by_target: byTarget.map((b) => ({
        target: b.target,
        count: Number(b.count),
        avg: Math.round(parseFloat(b.avg || '0') * 10) / 10,
      })),
    };
  }

  // ─── Aggregatsiya metodlari ──────────────────────────────────────────────
  private async recalculateStoreRating(storeId: string) {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.store_id = :storeId', { storeId })
      .andWhere('r.target IN (:...targets)', {
        targets: [ReviewTarget.PRODUCT, ReviewTarget.STORE],
      })
      .getRawOne<{ avg: string | null; count: string | null }>();

    const avgRating = parseFloat(result?.avg || '0');
    const count = parseInt(result?.count || '0', 10);

    await this.storeRepo.update(storeId, {
      rating: Math.round(avgRating * 10) / 10,
      reviews_count: count,
    });
  }

  private async recalculateProductRating(productId: number) {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.product_id = :pid', { pid: productId })
      .andWhere('r.target = :t', { t: ReviewTarget.PRODUCT })
      .getRawOne<{ avg: string | null; count: string | null }>();

    const avgRating = parseFloat(result?.avg || '0');
    const count = parseInt(result?.count || '0', 10);

    await this.productRepo.update(productId, {
      rating: Math.round(avgRating * 10) / 10,
      reviews_count: count,
    });
  }

  private async recalculateCourierRating(courierId: string) {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.courier_id = :cid', { cid: courierId })
      .andWhere('r.target = :t', { t: ReviewTarget.COURIER })
      .getRawOne<{ avg: string | null; count: string | null }>();

    const avgRating = parseFloat(result?.avg || '0');
    const count = parseInt(result?.count || '0', 10);

    await this.userRepo.update(courierId, {
      courier_rating: Math.round(avgRating * 10) / 10,
      courier_reviews_count: count,
    });
  }
}
