import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { ImageService } from '../image/image.service';
import { UploadFolderEnum } from '../image/enums/upload-folder.enum';

@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly imageService: ImageService,
  ) {}

  @Get()
  async findAll(
    @Query('category_id') categoryId?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (q !== undefined || page !== undefined || limit !== undefined) {
      return this.productService.findAdminCatalog({
        q,
        categoryId,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 12,
      });
    }
    return this.productService.findAll(categoryId);
  }

  @Get('catalog')
  async findCatalog(
    @Query('q') q?: string,
    @Query('category_id') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('price_min') priceMin?: string,
    @Query('price_max') priceMax?: string,
    @Query('sort') sort?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius_km') radiusKm?: string,
    @Query('deliverable') deliverable?: string,
    @Query('free_delivery') freeDelivery?: string,
  ) {
    return this.productService.findCatalog({
      q,
      categoryId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      sort: sort as any,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
      deliverableOnly: deliverable === 'true' || deliverable === '1',
      freeDeliveryOnly: freeDelivery === 'true' || freeDelivery === '1',
    });
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findById(id);
  }

  /** Eng arzon do'konlar — product uchun mavjud do'konlarni narx bo'yicha saralaydi */
  @Get(':id/cheapest-stores')
  async findCheapestStores(
    @Param('id', ParseIntPipe) id: number,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productService.findCheapestStores(
      id,
      lat ? Number(lat) : undefined,
      lng ? Number(lng) : undefined,
      limit ? Number(limit) : 10,
    );
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  async create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateProductDto>,
  ) {
    return this.productService.update(id, dto);
  }

  /** Mahsulotga rasmlar yuklash (1-5 ta) */
  @Post(':id/images')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  @UseInterceptors(FilesInterceptor('images', 5))
  async uploadImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const product = await this.productService.findById(id);
    const existingImages = product.images ?? [];

    const newImages: { url: string; is_main: boolean }[] = [];
    for (const file of files) {
      const url = await this.imageService.processAndSaveImage(file, UploadFolderEnum.PRODUCT);
      newImages.push({ url, is_main: existingImages.length === 0 && newImages.length === 0 });
    }

    return this.productService.update(id, {
      images: [...existingImages, ...newImages],
    });
  }

  /** Mahsulotdan rasm o'chirish (index bo'yicha) */
  @Delete(':id/images/:index')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  async removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
  ) {
    const product = await this.productService.findById(id);
    const images = [...(product.images ?? [])];

    if (index >= 0 && index < images.length) {
      const removed = images.splice(index, 1)[0];
      if (removed?.url) {
        await this.imageService.deleteImage(removed.url).catch(() => {});
      }
    }

    return this.productService.update(id, { images });
  }
}
