import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreProduct, StoreProductStatus } from './store-product.entity';
import { CreateStoreProductDto } from './dto/create-store-product.dto';
import { UpdateStoreProductDto } from './dto/update-store-product.dto';
import { Store } from '../store/entities/store.entity';

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

    const stock = dto.stock ?? 0;
    const storeProduct = this.repo.create({
      store_id: storeId,
      product_id: dto.product_id,
      price: dto.price,
      stock,
      is_prime: dto.is_prime ?? false,
      status: this.resolveStatus(dto.price, stock),
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
    }

    if (dto.stock !== undefined) {
      storeProduct.stock = dto.stock;
    }

    if (dto.status !== undefined) {
      storeProduct.status = dto.status ? StoreProductStatus.ACTIVE : StoreProductStatus.INACTIVE;
    } else if (dto.price !== undefined || dto.stock !== undefined) {
      storeProduct.status = this.resolveStatus(
        Number(storeProduct.price),
        Number(storeProduct.stock),
      );
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
    storeProduct.status = this.resolveStatus(price, Number(storeProduct.stock));

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

  async findNearbyByProduct(
    productId: number,
    lat: number,
    lng: number,
    radiusKm?: number,
  ) {
    const items = await this.repo.find({
      where: {
        product_id: productId,
        status: StoreProductStatus.ACTIVE,
      },
      relations: ['product', 'store', 'store.deliverySettings', 'store.workingHours'],
      order: { is_prime: 'DESC', createdAt: 'DESC' },
    });

    return items
      .filter((item) => item.store?.is_active && item.store.lat && item.store.lng)
      .map((item) => {
        const distanceMeters = calculateDistance(
          lat,
          lng,
          Number(item.store.lat),
          Number(item.store.lng),
        );

        return {
          ...item,
          distance_meters: distanceMeters,
          service_radius_meters: this.getStoreServiceRadiusMeters(item.store),
        };
      })
      .filter((item) => {
        const withinStoreRadius =
          item.distance_meters <= Number(item.service_radius_meters ?? 0);
        const withinQueryRadius =
          typeof radiusKm === 'number' && radiusKm > 0
            ? item.distance_meters <= radiusKm * 1000
            : true;

        return withinStoreRadius && withinQueryRadius;
      })
      .sort((left, right) => {
        if (left.is_prime !== right.is_prime) {
          return left.is_prime ? -1 : 1;
        }

        return left.distance_meters - right.distance_meters;
      });
  }

  private resolveStatus(price: number, stock: number) {
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

    return Number(settings?.max_delivery_radius ?? 5000);
  }
}
