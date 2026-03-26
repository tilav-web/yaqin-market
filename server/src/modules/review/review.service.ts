import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { Store } from '../store/entities/store.entity';
import { Order } from '../order/entities/order.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    const order = await this.orderRepo.findOne({
      where: { id: dto.order_id, customer_id: userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Can only review delivered orders');
    }

    const existing = await this.reviewRepo.findOne({
      where: { owner: { id: userId }, store: { id: dto.store_id } },
    });

    if (existing) {
      throw new BadRequestException('You already reviewed this store for this order');
    }

    const review = this.reviewRepo.create({
      rating: dto.rating,
      comment: dto.comment,
      owner: { id: userId } as any,
      store: { id: dto.store_id } as any,
      product: dto.product_id ? ({ id: dto.product_id } as any) : undefined,
    });

    const saved = await this.reviewRepo.save(review);

    await this.recalculateStoreRating(dto.store_id);

    return saved;
  }

  async findByStore(storeId: string) {
    return this.reviewRepo.find({
      where: { store: { id: storeId } },
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProduct(productId: number) {
    return this.reviewRepo.find({
      where: { product: { id: productId } },
      relations: ['owner', 'store'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string) {
    return this.reviewRepo.find({
      where: { owner: { id: userId } },
      relations: ['store', 'product'],
      order: { createdAt: 'DESC' },
    });
  }

  private async recalculateStoreRating(storeId: string) {
    const result = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.store_id = :storeId', { storeId })
      .getRawOne();

    const avgRating = parseFloat(result?.avg || '0');
    const count = parseInt(result?.count || '0', 10);

    await this.storeRepo.update(storeId, {
      rating: Math.round(avgRating * 10) / 10,
      reviews_count: count,
    });
  }
}
