import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository, type FindOptionsWhere } from 'typeorm';
import { StoreProduct, StoreProductStatus } from './store-product.entity';
import { CreateStoreProductDto } from './dto/create-store-product.dto';
import { UpdateStoreProductDto } from './dto/update-store-product.dto';
import { Store } from '../store/entities/store.entity';
import { StoreSubscriptionService } from '../store/store-subscription.service';

type StoreProductCatalogQuery = {
  storeId: string;
  includeUnavailable?: boolean;
  q?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
};

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
    @InjectRepository(StoreProduct)
    private readonly repo: Repository<StoreProduct>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    private readonly subscriptionService: StoreSubscriptionService,
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
      is_prime: dto.is_prime ?? false,
      status:
        dto.is_available === false
          ? StoreProductStatus.UNAVAILABLE
          : StoreProductStatus.AVAILABLE,
    });

    const saved = await this.repo.save(storeProduct);

    // Obunachilarga bildirishnoma yuborish (background)
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
      relations: ['storeProducts', 'storeProducts.product'],
    });
    if (store) {
      const sp = await this.repo.findOne({
        where: { id: saved.id },
        relations: ['product'],
      });
      const productName = sp?.product?.name?.uz ?? 'Yangi mahsulot';
      this.subscriptionService
        .notifySubscribers(storeId, store.name, productName)
        .catch(() => {});
    }

    return saved;
  }

  async findByStore(storeId: string, includeUnavailable: boolean = false) {
    const where: FindOptionsWhere<StoreProduct> = { store_id: storeId };
    if (!includeUnavailable) {
      where.status = StoreProductStatus.AVAILABLE;
    }

    return this.repo.find({
      where,
      relations: ['product', 'product.category', 'product.unit'],
      order: { createdAt: 'DESC' },
    });
  }

  async findCatalog(query: StoreProductCatalogQuery) {
    const page =
      Number.isFinite(query.page) && Number(query.page) > 0
        ? Math.floor(Number(query.page))
        : 1;
    const limit =
      Number.isFinite(query.limit) && Number(query.limit) > 0
        ? Math.min(24, Math.floor(Number(query.limit)))
        : 12;
    const search = query.q?.trim();

    const baseQuery = this.repo
      .createQueryBuilder('storeProduct')
      .innerJoin('storeProduct.product', 'product')
      .leftJoin('product.category', 'category')
      .where('storeProduct.store_id = :storeId', {
        storeId: query.storeId,
      })
      .andWhere('product.is_active = :isActive', { isActive: true });

    if (!query.includeUnavailable) {
      baseQuery.andWhere('storeProduct.status = :status', {
        status: StoreProductStatus.AVAILABLE,
      });
    }

    if (query.categoryId) {
      baseQuery.andWhere('category.id = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (search) {
      const normalizedSearch = `%${search.toLowerCase()}%`;
      baseQuery
        .andWhere(
          new Brackets((catalogQuery) => {
            catalogQuery
              .where("LOWER(product.name->>'uz') LIKE :search")
              .orWhere("LOWER(product.name->>'ru') LIKE :search")
              .orWhere('LOWER(product.slug) LIKE :search')
              .orWhere("LOWER(COALESCE(category.name->>'uz', '')) LIKE :search");
          }),
        )
        .setParameter('search', normalizedSearch);
    }

    const total = await baseQuery.clone().getCount();
    const rows = await baseQuery
      .clone()
      .select('storeProduct.id', 'id')
      .orderBy('storeProduct.is_prime', 'DESC')
      .addOrderBy('storeProduct.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: string }>();

    const ids = rows.map((row) => row.id).filter(Boolean);

    if (!ids.length) {
      return {
        items: [],
        meta: {
          page,
          limit,
          total,
          totalPages: total ? Math.ceil(total / limit) : 0,
          hasMore: false,
        },
      };
    }

    const items = await this.repo.find({
      where: { id: In(ids) },
      relations: ['product', 'product.category', 'product.unit'],
    });

    const sortOrder = new Map(ids.map((id, index) => [id, index]));
    items.sort(
      (left, right) =>
        (sortOrder.get(left.id) ?? 0) - (sortOrder.get(right.id) ?? 0),
    );

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

  async findCategoriesByStore(
    storeId: string,
    includeUnavailable: boolean = false,
  ) {
    const baseQuery = this.repo
      .createQueryBuilder('storeProduct')
      .innerJoin('storeProduct.product', 'product')
      .innerJoin('product.category', 'category')
      .where('storeProduct.store_id = :storeId', { storeId })
      .andWhere('product.is_active = :isActive', { isActive: true });

    if (!includeUnavailable) {
      baseQuery.andWhere('storeProduct.status = :status', {
        status: StoreProductStatus.AVAILABLE,
      });
    }

    const rows = await baseQuery
      .select([
        'category.id AS id',
        'category.name AS name',
        'category.slug AS slug',
        'category.image AS image',
        'category.order_number AS order_number',
        'category.is_active AS is_active',
        'category.createdAt AS "createdAt"',
        'category.updatedAt AS "updatedAt"',
      ])
      .distinct(true)
      .orderBy('category.order_number', 'ASC')
      .addOrderBy('category.createdAt', 'DESC')
      .getRawMany<{
        id: string;
        name: string;
        slug: string;
        image: string | null;
        order_number: string | number;
        is_active: boolean | string;
        createdAt: string;
        updatedAt: string;
      }>();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      image: row.image,
      order_number: Number(row.order_number ?? 0),
      is_active: row.is_active === true || row.is_active === 'true',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
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

    if (dto.is_available !== undefined) {
      storeProduct.status = dto.is_available
        ? StoreProductStatus.AVAILABLE
        : StoreProductStatus.UNAVAILABLE;
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
    return this.repo.save(storeProduct);
  }

  async setAvailability(id: string, storeId: string, isAvailable: boolean) {
    const storeProduct = await this.repo.findOne({
      where: { id, store_id: storeId },
    });

    if (!storeProduct) {
      throw new NotFoundException('Product not found in store');
    }

    storeProduct.status = isAvailable
      ? StoreProductStatus.AVAILABLE
      : StoreProductStatus.UNAVAILABLE;
    return this.repo.save(storeProduct);
  }

  async findAvailableProducts(storeId: string) {
    return this.repo.find({
      where: {
        store_id: storeId,
        status: StoreProductStatus.AVAILABLE,
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
        status: StoreProductStatus.AVAILABLE,
      },
      relations: [
        'product',
        'store',
        'store.deliverySettings',
        'store.workingHours',
      ],
      order: { is_prime: 'DESC', createdAt: 'DESC' },
    });

    return items
      .filter(
        (item) => item.store?.is_active && item.store.lat && item.store.lng,
      )
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

  private getStoreServiceRadiusMeters(store: Store | null | undefined) {
    const settings = store?.deliverySettings?.[0];

    if (!settings?.is_delivery_enabled) {
      return 0;
    }

    return Number(settings?.max_delivery_radius ?? 5000);
  }
}
