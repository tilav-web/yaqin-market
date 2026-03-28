import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository, type FindOptionsWhere } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { Category } from '../category/category.entity';
import { Unit } from '../unit/unit.entity';

type ProductCatalogQuery = {
  q?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
};

type ProductAdminCatalogSummary = {
  total: number;
  active: number;
  inactive: number;
  categorized: number;
  withUnit: number;
};

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
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
        'children',
        'children.category',
        'children.unit',
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
      const childSearchSubQuery = baseQuery
        .subQuery()
        .select('1')
        .from(Product, 'child')
        .leftJoin('child.category', 'childCategory')
        .where('child.parent_id = product.id')
        .andWhere(
          new Brackets((childQuery) => {
            childQuery
              .where('LOWER(child.name) LIKE :search')
              .orWhere("LOWER(COALESCE(child.description, '')) LIKE :search")
              .orWhere('LOWER(child.slug) LIKE :search')
              .orWhere("LOWER(COALESCE(childCategory.name, '')) LIKE :search");
          }),
        )
        .getQuery();

      baseQuery
        .andWhere(
          new Brackets((productQuery) => {
            productQuery
              .where('LOWER(product.name) LIKE :search')
              .orWhere("LOWER(COALESCE(product.description, '')) LIKE :search")
              .orWhere('LOWER(product.slug) LIKE :search')
              .orWhere("LOWER(COALESCE(category.name, '')) LIKE :search")
              .orWhere(`EXISTS ${childSearchSubQuery}`);
          }),
        )
        .setParameter('search', normalizedSearch);
    }

    const total = await baseQuery.clone().getCount();
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
        'children',
        'children.category',
        'children.unit',
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
            .where('LOWER(product.name) LIKE :search')
            .orWhere("LOWER(COALESCE(product.description, '')) LIKE :search")
            .orWhere('LOWER(product.slug) LIKE :search')
            .orWhere("LOWER(COALESCE(category.name, '')) LIKE :search")
            .orWhere("LOWER(COALESCE(unit.name, '')) LIKE :search")
            .orWhere("LOWER(COALESCE(unit.short_name, '')) LIKE :search")
            .orWhere("LOWER(COALESCE(parent.name, '')) LIKE :search");
        }),
      );
      baseQuery.setParameter('search', normalizedSearch);
    }

    const [total, active, categorized, withUnit] = await Promise.all([
      baseQuery.clone().getCount(),
      baseQuery
        .clone()
        .andWhere('product.is_active = :isActive', { isActive: true })
        .getCount(),
      baseQuery.clone().andWhere('product.category_id IS NOT NULL').getCount(),
      baseQuery.clone().andWhere('product.unit_id IS NOT NULL').getCount(),
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
        'parent',
        'children',
        'children.category',
        'children.unit',
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
        'parent',
        'children',
        'children.category',
        'children.unit',
      ],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    const product = this.productRepo.create({
      slug: dto.slug?.trim() || this.slugify(dto.name),
      name: dto.name,
      description: dto.description,
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

    return this.productRepo.save(product);
  }

  async update(id: number, data: Partial<CreateProductDto>) {
    const product = await this.productRepo.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    Object.assign(product, data);

    if (data.name && !data.slug) {
      product.slug = this.slugify(data.name);
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

    return this.productRepo.save(product);
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}
