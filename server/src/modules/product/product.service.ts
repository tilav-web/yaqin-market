import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository, type FindOptionsWhere } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { Category } from '../category/category.entity';
import { Unit } from '../unit/unit.entity';
import { ProductTax } from './product-tax.entity';
import { ProductTaxDto } from './dto/product-tax.dto';

type ProductCatalogSort = 'new' | 'price_asc' | 'price_desc' | 'popular';

type ProductCatalogQuery = {
  q?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  priceMin?: number;
  priceMax?: number;
  sort?: ProductCatalogSort;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  /** Faqat user joylashuviga yetkazib beradigan do'konlardagi mahsulotlarni ko'rsatish. */
  deliverableOnly?: boolean;
  /** Faqat tekin yetkazib beradigan do'konlardagi mahsulotlar. */
  freeDeliveryOnly?: boolean;
};

type ProductAdminCatalogSummary = {
  total: number;
  active: number;
  inactive: number;
  categorized: number;
  withUnit: number;
  withTax: number;
};

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductTax)
    private readonly productTaxRepo: Repository<ProductTax>,
  ) {}

  async findAll(categoryId?: string) {
    const where: FindOptionsWhere<Product> = {};
    if (categoryId) {
      where.category = { id: categoryId } as Category;
    }

    return this.productRepo.find({
      where,
      relations: [
        'category',
        'unit',
        'tax',
        'children',
        'children.category',
        'children.unit',
        'children.tax',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findCatalog(query: ProductCatalogQuery = {}) {
    const page =
      Number.isFinite(query.page) && Number(query.page) > 0
        ? Math.floor(Number(query.page))
        : 1;
    const limit =
      Number.isFinite(query.limit) && Number(query.limit) > 0
        ? Math.min(24, Math.floor(Number(query.limit)))
        : 12;
    const search = query.q?.trim();

    const baseQuery = this.productRepo
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .where('product.parent_id IS NULL')
      .andWhere('product.is_active = :isActive', { isActive: true });

    if (query.categoryId) {
      baseQuery.andWhere('category.id = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (search) {
      const normalizedSearch = `%${search.toLowerCase()}%`;

      // Product o'zining nomi/slug/kategoriyasi yoki child variantlarining
      // nomi/slug bo'yicha qidiruv. Raw SQL EXISTS sub-query'dan foydalanamiz —
      // TypeORM subQuery builder parametrlarni to'g'ri uzatmaydi.
      baseQuery
        .andWhere(
          new Brackets((qb) => {
            qb.where("LOWER(product.name->>'uz') LIKE :search")
              .orWhere("LOWER(product.name->>'ru') LIKE :search")
              .orWhere('LOWER(product.slug) LIKE :search')
              .orWhere("LOWER(COALESCE(category.name->>'uz', '')) LIKE :search")
              .orWhere(
                `EXISTS (
                  SELECT 1 FROM products c
                  WHERE c.parent_id = product.id
                    AND (
                      LOWER(c.name->>'uz') LIKE :search
                      OR LOWER(c.name->>'ru') LIKE :search
                      OR LOWER(c.slug) LIKE :search
                    )
                )`,
              );
          }),
        )
        .setParameter('search', normalizedSearch);
    }

    // ── StoreProduct-based filters (price, availability, nearby, delivery) ─
    // Har bir product (yoki uning variant-childrenlari) uchun store_products
    // dan kamida bitta AVAILABLE mos yozuvlari bor yoki yo'qligini tekshiradi.
    const hasUserLocation = query.lat != null && query.lng != null;
    const hasDeliveryFilter =
      hasUserLocation && (query.deliverableOnly || query.freeDeliveryOnly);
    const needsSpFilter =
      query.priceMin != null ||
      query.priceMax != null ||
      (hasUserLocation && (query.radiusKm ?? 0) > 0) ||
      hasDeliveryFilter;

    if (needsSpFilter) {
      const spQuery = baseQuery
        .subQuery()
        .select('1')
        .from('store_products', 'sp')
        .leftJoin('stores', 'st', 'st.id = sp.store_id')
        .leftJoin('store_delivery_settings', 'dset', 'dset.store_id = st.id')
        .where(
          '(sp.product_id = product.id OR sp.product_id IN ' +
            '(SELECT c.id FROM products c WHERE c.parent_id = product.id))',
        )
        .andWhere("sp.status = 'AVAILABLE'")
        .andWhere('st.is_active = true');

      if (query.priceMin != null) {
        spQuery.andWhere('sp.price >= :priceMin', { priceMin: query.priceMin });
      }
      if (query.priceMax != null) {
        spQuery.andWhere('sp.price <= :priceMax', { priceMax: query.priceMax });
      }

      // Distance calculation (meters via Haversine)
      if (hasUserLocation) {
        const distanceExpr = `(6371000 * acos(
          LEAST(1, cos(radians(:lat)) * cos(radians(st.lat)) *
          cos(radians(st.lng) - radians(:lng)) +
          sin(radians(:lat)) * sin(radians(st.lat)))
        ))`;

        // radius_km: oddiy "nearby" filter
        if ((query.radiusKm ?? 0) > 0) {
          spQuery.andWhere(`${distanceExpr} <= :radiusMeters`, {
            radiusMeters: (query.radiusKm as number) * 1000,
          });
        }

        // deliverable: do'kon max_delivery_radius ichiga userni tushiradimi
        if (query.deliverableOnly) {
          spQuery.andWhere(
            `dset.is_delivery_enabled = true AND ${distanceExpr} <= COALESCE(dset.max_delivery_radius, 5000)`,
          );
        }

        // free_delivery: do'kon free_delivery_radius ichiga userni tushiradimi
        if (query.freeDeliveryOnly) {
          spQuery.andWhere(
            `dset.is_delivery_enabled = true AND ${distanceExpr} <= COALESCE(dset.free_delivery_radius, 0)`,
          );
        }

        spQuery.setParameters({ lat: query.lat, lng: query.lng });
      }

      baseQuery.andWhere(`EXISTS ${spQuery.getQuery()}`);
      baseQuery.setParameters(spQuery.getParameters());
    }

    // ── Sort ──────────────────────────────────────────────────────────────
    const sort: ProductCatalogSort = query.sort ?? 'new';
    const sortedQuery = baseQuery.clone().select('product.id', 'id');

    if (sort === 'price_asc' || sort === 'price_desc') {
      sortedQuery
        .addSelect(
          `(SELECT MIN(sp2.price) FROM store_products sp2
            WHERE sp2.status = 'AVAILABLE' AND (
              sp2.product_id = product.id OR
              sp2.product_id IN (SELECT c2.id FROM products c2 WHERE c2.parent_id = product.id)
            ))`,
          'min_price',
        )
        .orderBy(
          'min_price',
          sort === 'price_asc' ? 'ASC' : 'DESC',
          'NULLS LAST',
        );
    } else if (sort === 'popular') {
      sortedQuery
        .addSelect(
          `(SELECT COUNT(*) FROM store_products sp3
            WHERE sp3.status = 'AVAILABLE' AND (
              sp3.product_id = product.id OR
              sp3.product_id IN (SELECT c3.id FROM products c3 WHERE c3.parent_id = product.id)
            ))`,
          'sp_count',
        )
        .orderBy('sp_count', 'DESC', 'NULLS LAST')
        .addOrderBy('product.createdAt', 'DESC');
    } else {
      sortedQuery.orderBy('product.createdAt', 'DESC');
    }

    const total = await baseQuery.clone().getCount();
    const rows = await sortedQuery
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: string | number }>();

    const ids = rows
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id));

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

    const items = await this.productRepo.find({
      where: { id: In(ids) },
      relations: [
        'category',
        'unit',
        'tax',
        'children',
        'children.category',
        'children.unit',
        'children.tax',
        'storeProducts',
        'storeProducts.store',
        'children.storeProducts',
        'children.storeProducts.store',
      ],
    });

    const sortOrder = new Map(ids.map((id, index) => [id, index]));
    items.sort(
      (left, right) =>
        (sortOrder.get(Number(left.id)) ?? 0) -
        (sortOrder.get(Number(right.id)) ?? 0),
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

  async findAdminCatalog(query: ProductCatalogQuery = {}) {
    const page =
      Number.isFinite(query.page) && Number(query.page) > 0
        ? Math.floor(Number(query.page))
        : 1;
    const limit =
      Number.isFinite(query.limit) && Number(query.limit) > 0
        ? Math.min(24, Math.floor(Number(query.limit)))
        : 12;
    const search = query.q?.trim();

    const baseQuery = this.productRepo
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .leftJoin('product.unit', 'unit')
      .leftJoin('product.tax', 'tax')
      .leftJoin('product.parent', 'parent');

    if (query.categoryId) {
      baseQuery.andWhere('category.id = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (search) {
      const normalizedSearch = `%${search.toLowerCase()}%`;
      baseQuery.andWhere(
        new Brackets((productQuery) => {
          productQuery
            .where("LOWER(product.name->>'uz') LIKE :search")
            .orWhere("LOWER(product.name->>'ru') LIKE :search")
            .orWhere('LOWER(product.slug) LIKE :search')
            .orWhere("LOWER(COALESCE(category.name->>'uz', '')) LIKE :search")
            .orWhere("LOWER(COALESCE(unit.name->>'uz', '')) LIKE :search")
            .orWhere("LOWER(COALESCE(parent.name->>'uz', '')) LIKE :search");
        }),
      );
      baseQuery.setParameter('search', normalizedSearch);
    }

    const [total, active, categorized, withUnit, withTax] = await Promise.all([
      baseQuery.clone().getCount(),
      baseQuery
        .clone()
        .andWhere('product.is_active = :isActive', { isActive: true })
        .getCount(),
      baseQuery.clone().andWhere('product.category_id IS NOT NULL').getCount(),
      baseQuery.clone().andWhere('product.unit_id IS NOT NULL').getCount(),
      baseQuery.clone().andWhere('tax.id IS NOT NULL').getCount(),
    ]);

    const rows = await baseQuery
      .clone()
      .select('product.id', 'id')
      .orderBy('product.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: string | number }>();

    const ids = rows
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id));

    const summary: ProductAdminCatalogSummary = {
      total,
      active,
      inactive: Math.max(total - active, 0),
      categorized,
      withUnit,
      withTax,
    };

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
        summary,
      };
    }

    const items = await this.productRepo.find({
      where: { id: In(ids) },
      relations: [
        'category',
        'unit',
        'tax',
        'parent',
        'children',
        'children.category',
        'children.unit',
        'children.tax',
      ],
    });

    const sortOrder = new Map(ids.map((id, index) => [id, index]));
    items.sort(
      (left, right) =>
        (sortOrder.get(Number(left.id)) ?? 0) -
        (sortOrder.get(Number(right.id)) ?? 0),
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
      summary,
    };
  }

  async findById(id: number) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: [
        'category',
        'unit',
        'tax',
        'parent',
        'children',
        'children.category',
        'children.unit',
        'children.tax',
      ],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  /**
   * Product (va uning variantlari) mavjud bo'lgan do'konlarni narx bo'yicha
   * arzondan qimmatga saralab qaytaradi. userLat/userLng berilsa masofa va
   * yetkazib berish holati ham qo'shiladi.
   */
  async findCheapestStores(
    productId: number,
    userLat?: number,
    userLng?: number,
    limit = 10,
  ) {
    const safeLimit = Math.min(
      20,
      Math.max(1, Math.floor(Number(limit) || 10)),
    );
    const hasLocation =
      userLat != null &&
      userLng != null &&
      Number.isFinite(userLat) &&
      Number.isFinite(userLng);

    const params: unknown[] = [productId];
    let distanceSelect = 'NULL::float AS distance_meters';
    if (hasLocation) {
      distanceSelect = `(6371000 * acos(
        LEAST(1, cos(radians($2)) * cos(radians(st.lat)) *
        cos(radians(st.lng) - radians($3)) +
        sin(radians($2)) * sin(radians(st.lat)))
      )) AS distance_meters`;
      params.push(userLat, userLng);
    }

    const sql = `
      SELECT
        sp.id AS store_product_id,
        sp.price AS price,
        p.id AS variant_id,
        p.name AS variant_name,
        p.slug AS variant_slug,
        p.images AS variant_images,
        p.parent_id AS parent_id,
        u.short_name AS unit_short_name,
        u.name AS unit_name,
        st.id AS store_id,
        st.name AS store_name,
        st.address AS store_address,
        st.lat AS store_lat,
        st.lng AS store_lng,
        st.logo AS store_logo,
        st.is_prime AS store_is_prime,
        dset.max_delivery_radius AS max_radius,
        dset.free_delivery_radius AS free_radius,
        dset.is_delivery_enabled AS delivery_enabled,
        ${distanceSelect}
      FROM store_products sp
      INNER JOIN stores st ON st.id = sp.store_id
      INNER JOIN products p ON p.id = sp.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      LEFT JOIN store_delivery_settings dset ON dset.store_id = st.id
      WHERE sp.status = 'AVAILABLE'
        AND st.is_active = true
        AND (sp.product_id = $1 OR sp.product_id IN (
          SELECT c.id FROM products c WHERE c.parent_id = $1
        ))
      ORDER BY sp.price ASC
      LIMIT ${safeLimit}
    `;

    type CheapestRow = {
      store_product_id: string;
      price: string | number;
      variant_id: string | number;
      variant_name: Record<string, string>;
      variant_slug: string;
      variant_images: { url: string; is_main?: boolean }[] | null;
      parent_id: string | number | null;
      unit_short_name: Record<string, string> | null;
      unit_name: Record<string, string> | null;
      store_id: string;
      store_name: string;
      store_address: string | null;
      store_lat: string | number | null;
      store_lng: string | number | null;
      store_logo: string | null;
      store_is_prime: boolean;
      max_radius: string | number | null;
      free_radius: string | number | null;
      delivery_enabled: boolean | null;
      distance_meters: string | number | null;
    };

    const rows: CheapestRow[] = await this.productRepo.manager.query(
      sql,
      params,
    );

    return rows.map((r) => {
      const price = Number(r.price);
      const distance =
        r.distance_meters != null ? Number(r.distance_meters) : null;
      const maxRadius = r.max_radius != null ? Number(r.max_radius) : 5000;
      const freeRadius = r.free_radius != null ? Number(r.free_radius) : 0;
      const deliveryEnabled = r.delivery_enabled === true;

      return {
        store_product_id: r.store_product_id,
        price,
        variant: {
          id: Number(r.variant_id),
          name: r.variant_name,
          slug: r.variant_slug,
          images: r.variant_images ?? [],
          parent_id: r.parent_id != null ? Number(r.parent_id) : null,
          unit:
            r.unit_short_name || r.unit_name
              ? { short_name: r.unit_short_name, name: r.unit_name }
              : null,
        },
        store: {
          id: r.store_id,
          name: r.store_name,
          address: r.store_address,
          lat: r.store_lat != null ? Number(r.store_lat) : null,
          lng: r.store_lng != null ? Number(r.store_lng) : null,
          logo: r.store_logo,
          is_prime: r.store_is_prime === true,
        },
        delivery: {
          enabled: deliveryEnabled,
          max_radius_m: r.max_radius != null ? Number(r.max_radius) : null,
          free_radius_m: r.free_radius != null ? Number(r.free_radius) : null,
        },
        distance_meters: distance,
        is_deliverable:
          distance != null && deliveryEnabled ? distance <= maxRadius : null,
        is_free_delivery:
          distance != null && deliveryEnabled ? distance <= freeRadius : null,
      };
    });
  }

  async create(dto: CreateProductDto) {
    const product = this.productRepo.create({
      slug: dto.slug?.trim() || this.slugify(dto.name.uz),
      name: dto.name,
      description: dto.description || null,
      images: dto.images || [],
      attributes: dto.attributes,
      is_active: dto.is_active ?? true,
      parent_id: dto.parent_id,
    });

    if (dto.unit_id) {
      product.unit = { id: dto.unit_id } as Unit;
    }

    if (dto.category_id) {
      product.category = { id: dto.category_id } as Category;
    }

    const savedProduct = await this.productRepo.save(product);
    await this.syncProductTax(savedProduct.id, dto.tax);

    return this.findById(savedProduct.id);
  }

  async update(id: number, data: Partial<CreateProductDto>) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['tax'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (data.slug !== undefined) {
      product.slug = data.slug?.trim() || product.slug;
    }

    if (data.name !== undefined) {
      product.name = data.name;
    }

    if (data.description !== undefined) {
      product.description = data.description || null;
    }

    if (data.images !== undefined) {
      product.images = data.images;
    }

    if (data.attributes !== undefined) {
      product.attributes = data.attributes;
    }

    if (data.is_active !== undefined) {
      product.is_active = data.is_active;
    }

    if (data.parent_id !== undefined) {
      product.parent_id = data.parent_id ?? null;
    }

    if (data.name && !data.slug) {
      product.slug = this.slugify(data.name.uz);
    }

    if (data.unit_id !== undefined) {
      product.unit = data.unit_id
        ? ({ id: data.unit_id } as Unit)
        : (null as unknown as Unit);
    }

    if (data.category_id !== undefined) {
      product.category = data.category_id
        ? ({ id: data.category_id } as Category)
        : (null as unknown as Category);
    }

    await this.productRepo.save(product);
    if (data.tax !== undefined) {
      await this.syncProductTax(id, data.tax);
    }

    return this.findById(id);
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private async syncProductTax(
    productId: number,
    taxDto?: ProductTaxDto,
  ): Promise<void> {
    if (taxDto === undefined) {
      return;
    }

    const normalized = this.normalizeProductTax(taxDto);
    const existing = await this.productTaxRepo.findOne({
      where: { product_id: productId },
    });

    if (!normalized) {
      if (existing) {
        await this.productTaxRepo.remove(existing);
      }
      return;
    }

    const tax =
      existing ??
      this.productTaxRepo.create({
        product_id: productId,
      });

    Object.assign(tax, normalized);
    await this.productTaxRepo.save(tax);
  }

  private normalizeProductTax(
    dto?: ProductTaxDto,
  ): Omit<
    ProductTax,
    'id' | 'product' | 'product_id' | 'createdAt' | 'updatedAt'
  > | null {
    if (!dto) {
      return null;
    }

    const normalized = {
      mxik_code: dto.mxik_code?.trim() || null,
      barcode: dto.barcode?.trim() || null,
      package_code: dto.package_code?.trim() || null,
      tiftn_code: dto.tiftn_code?.trim() || null,
      vat_percent:
        dto.vat_percent !== undefined && dto.vat_percent !== null
          ? Number(dto.vat_percent)
          : null,
      mark_required: Boolean(dto.mark_required),
      origin_country: dto.origin_country?.trim() || null,
      maker_name: dto.maker_name?.trim() || null,
      cert_no: dto.cert_no?.trim() || null,
      made_on: dto.made_on?.trim() || null,
      expires_on: dto.expires_on?.trim() || null,
    };

    const hasValue = Object.entries(normalized).some(([key, value]) => {
      if (key === 'mark_required') {
        return value === true;
      }

      if (typeof value === 'number') {
        return Number.isFinite(value);
      }

      return value !== null && value !== '';
    });

    return hasValue ? normalized : null;
  }
}
