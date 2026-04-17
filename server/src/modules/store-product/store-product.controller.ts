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
} from '@nestjs/common';
import { StoreProductService } from './store-product.service';
import { CreateStoreProductDto } from './dto/create-store-product.dto';
import { UpdateStoreProductDto } from './dto/update-store-product.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';

@Controller('store-products')
export class StoreProductController {
  constructor(private readonly service: StoreProductService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async create(
    @Body() dto: CreateStoreProductDto,
    @Query('store_id') storeId: string,
  ) {
    return this.service.create(storeId, dto);
  }

  @Get()
  async findByStore(
    @Query('store_id') storeId: string,
    @Query('include_unavailable') includeUnavailable?: string,
  ) {
    return this.service.findByStore(storeId, includeUnavailable === 'true');
  }

  @Get('categories')
  async findCategoriesByStore(
    @Query('store_id') storeId: string,
    @Query('include_unavailable') includeUnavailable?: string,
  ) {
    return this.service.findCategoriesByStore(
      storeId,
      includeUnavailable === 'true',
    );
  }

  @Get('catalog')
  async findCatalog(
    @Query('store_id') storeId: string,
    @Query('q') q?: string,
    @Query('category_id') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('include_unavailable') includeUnavailable?: string,
  ) {
    return this.service.findCatalog({
      storeId,
      q,
      categoryId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
      includeUnavailable: includeUnavailable === 'true',
    });
  }

  @Get('product/:productId/nearby')
  @UseGuards(AuthGuard)
  async findNearbyByProduct(
    @Param('productId') productId: string,
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius?: number,
  ) {
    const normalizedRadius = radius !== undefined ? Number(radius) : undefined;
    return this.service.findNearbyByProduct(
      Number(productId),
      Number(lat),
      Number(lng),
      normalizedRadius,
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async update(
    @Param('id') id: string,
    @Query('store_id') storeId: string,
    @Body() dto: UpdateStoreProductDto,
  ) {
    return this.service.update(id, storeId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async delete(@Param('id') id: string, @Query('store_id') storeId: string) {
    return this.service.delete(id, storeId);
  }

  @Post(':id/price')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async setPrice(
    @Param('id') id: string,
    @Query('store_id') storeId: string,
    @Body('price') price: number,
  ) {
    return this.service.setPrice(id, storeId, price);
  }

  @Post(':id/availability')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async setAvailability(
    @Param('id') id: string,
    @Query('store_id') storeId: string,
    @Body('is_available') isAvailable: boolean,
  ) {
    return this.service.setAvailability(id, storeId, isAvailable);
  }

  @Post(':id/prime')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async setPrime(
    @Param('id') id: string,
    @Query('store_id') storeId: string,
    @Body('is_prime') isPrime: boolean,
  ) {
    return this.service.setPrime(id, storeId, isPrime);
  }
}
