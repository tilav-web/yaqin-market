import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreProduct, StoreProductStatus } from './store-product.entity';
import { CreateStoreProductDto } from './dto/create-store-product.dto';
import { UpdateStoreProductDto } from './dto/update-store-product.dto';

@Injectable()
export class StoreProductService {
  constructor(
    @InjectRepository(StoreProduct) private readonly repo: Repository<StoreProduct>,
  ) {}

  async create(storeId: string, dto: CreateStoreProductDto) {
    const existing = await this.repo.findOne({
      where: { store_id: storeId, product_id: dto.product_id },
    });

    if (existing) {
      throw new Error('Product already exists in this store');
    }

    const storeProduct = this.repo.create({
      store_id: storeId,
      product_id: dto.product_id,
      price: dto.price,
      stock: dto.stock ?? 0,
      status: dto.price > 0 ? StoreProductStatus.ACTIVE : StoreProductStatus.INACTIVE,
    });

    return this.repo.save(storeProduct);
  }

  async findByStore(storeId: string, includeInactive: boolean = false) {
    const where: any = { store_id: storeId };
    if (!includeInactive) {
      where.status = StoreProductStatus.ACTIVE;
    }

    return this.repo.find({
      where,
      relations: ['product', 'product.category', 'product.unit'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: ['product', 'product.category', 'product.unit'],
    });
  }

  async update(id: string, storeId: string, dto: UpdateStoreProductDto) {
    const storeProduct = await this.repo.findOne({
      where: { id, store_id: storeId },
    });

    if (!storeProduct) {
      throw new NotFoundException('Product not found in store');
    }

    if (dto.price !== undefined) {
      storeProduct.price = dto.price;
      if (dto.price > 0) {
        storeProduct.status = StoreProductStatus.ACTIVE;
      } else {
        storeProduct.status = StoreProductStatus.INACTIVE;
      }
    }

    if (dto.status !== undefined) {
      storeProduct.status = dto.status ? StoreProductStatus.ACTIVE : StoreProductStatus.INACTIVE;
    }

    if (dto.is_prime !== undefined) {
      storeProduct.is_prime = dto.is_prime;
    }

    return this.repo.save(storeProduct);
  }

  async delete(id: string, storeId: string) {
    const result = await this.repo.delete({ id, store_id: storeId });
    if (result.affected === 0) {
      throw new NotFoundException('Product not found in store');
    }
    return { success: true };
  }

  async setPrice(id: string, storeId: string, price: number) {
    const storeProduct = await this.repo.findOne({
      where: { id, store_id: storeId },
    });

    if (!storeProduct) {
      throw new NotFoundException('Product not found in store');
    }

    storeProduct.price = price;
    storeProduct.status = price > 0 ? StoreProductStatus.ACTIVE : StoreProductStatus.INACTIVE;

    return this.repo.save(storeProduct);
  }

  async findAvailableProducts(storeId: string, lat?: number, lng?: number) {
    return this.repo.find({
      where: {
        store_id: storeId,
        status: StoreProductStatus.ACTIVE,
      },
      relations: ['product', 'product.category'],
    });
  }

  async setPrime(id: string, storeId: string, isPrime: boolean) {
    const storeProduct = await this.repo.findOne({
      where: { id, store_id: storeId },
    });

    if (!storeProduct) {
      throw new NotFoundException('Product not found in store');
    }

    storeProduct.is_prime = isPrime;
    return this.repo.save(storeProduct);
  }
}
