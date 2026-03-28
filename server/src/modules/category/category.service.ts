import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { ImageService } from '../image/image.service';

@Injectable()
export class CategoryService {
  private readonly listCacheKey = 'category:list';
  private readonly itemCacheKey = (id: string) => `category:${id}`;
  private readonly listTtlMs: number;
  private readonly itemTtlMs: number;

  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly imageService: ImageService,
    configService: ConfigService,
  ) {
    this.listTtlMs = Number(configService.get('CATEGORY_LIST_TTL_MS', 60_000));
    this.itemTtlMs = Number(configService.get('CATEGORY_ITEM_TTL_MS', 120_000));
  }

  async findAll() {
    return this.cache.wrap(
      this.listCacheKey,
      async () => {
        return this.repository.find({
          order: {
            order_number: 'ASC',
            createdAt: 'DESC',
          },
        });
      },
      this.listTtlMs,
    );
  }

  async findOne(id: string) {
    const cached = await this.cache.get<Category>(this.itemCacheKey(id));
    if (cached) return cached;

    const category = await this.repository.findOne({ where: { id } });

    if (!category) throw new NotFoundException('Category not found');
    await this.cache.set(this.itemCacheKey(id), category, this.itemTtlMs);
    return category;
  }

  async create(dto: CreateCategoryDto, imageFilename?: string) {
    const slug = dto.slug?.trim() || this.slugify(dto.name);

    const existing = await this.repository.findOne({
      where: [{ name: dto.name }, { slug }],
    });
    if (existing) {
      if (imageFilename) await this.imageService.deleteImage(imageFilename);
      throw new BadRequestException('Category name or slug already exists');
    }

    const category = this.repository.create({
      name: dto.name,
      slug,
      image: imageFilename || dto.image,
      order_number: dto.order_number ?? 0,
      is_active: dto.is_active ?? true,
    });
    const saved = await this.repository.save(category);

    await this.cache.del(this.listCacheKey);
    await this.cache.set(this.itemCacheKey(saved.id), saved, this.itemTtlMs);

    return saved;
  }

  async update(id: string, dto: UpdateCategoryDto, newImageFilename?: string) {
    const category = await this.repository.findOne({ where: { id } });
    if (!category) {
      if (newImageFilename)
        await this.imageService.deleteImage(newImageFilename);
      throw new NotFoundException('Category not found');
    }

    if (dto.name || dto.slug) {
      const existing = await this.repository.findOne({
        where: [
          dto.name ? { name: dto.name } : undefined,
          dto.slug ? { slug: dto.slug } : undefined,
        ].filter(Boolean) as { name?: string; slug?: string }[],
      });

      if (existing && existing.id !== id) {
        if (newImageFilename)
          await this.imageService.deleteImage(newImageFilename);
        throw new BadRequestException('Category name or slug already exists');
      }
    }

    // If new image is provided, delete the old one
    if (newImageFilename && category.image) {
      await this.imageService.deleteImage(category.image);
    }

    const updated = this.repository.merge(category, {
      ...dto,
      slug: dto.slug?.trim() ?? category.slug,
      image: newImageFilename || dto.image || category.image,
    });

    const saved = await this.repository.save(updated);

    await this.cache.del(this.listCacheKey);
    await this.cache.del(this.itemCacheKey(id));
    await this.cache.set(this.itemCacheKey(saved.id), saved, this.itemTtlMs);

    return saved;
  }

  async remove(id: string) {
    const category = await this.repository.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    if (category.image) {
      await this.imageService.deleteImage(category.image);
    }

    await this.repository.remove(category);
    await this.cache.del(this.listCacheKey);
    await this.cache.del(this.itemCacheKey(id));

    return { success: true };
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
