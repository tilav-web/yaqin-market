import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async findAll(categoryId?: number) {
    const where: any = {};
    if (categoryId) {
      where.category = { id: categoryId };
    }

    return this.productRepo.find({
      where,
      relations: ['category', 'unit', 'children'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'unit', 'parent', 'children'],
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
      product.unit = { id: dto.unit_id } as any;
    }

    if (dto.category_id) {
      product.category = { id: dto.category_id } as any;
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
      product.unit = data.unit_id ? ({ id: data.unit_id } as any) : null;
    }

    if (data.category_id !== undefined) {
      product.category = data.category_id
        ? ({ id: data.category_id } as any)
        : null;
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
