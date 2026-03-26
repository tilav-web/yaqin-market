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

@Controller('store-products')
@UseGuards(AuthGuard)
export class StoreProductController {
  constructor(private readonly service: StoreProductService) {}

  @Post()
  async create(
    @Body() dto: CreateStoreProductDto,
    @Query('store_id') storeId: string,
  ) {
    return this.service.create(storeId, dto);
  }

  @Get()
  async findByStore(
    @Query('store_id') storeId: string,
    @Query('include_inactive') includeInactive: boolean = false,
  ) {
    return this.service.findByStore(storeId, includeInactive);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Query('store_id') storeId: string,
    @Body() dto: UpdateStoreProductDto,
  ) {
    return this.service.update(id, storeId, dto);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Query('store_id') storeId: string,
  ) {
    return this.service.delete(id, storeId);
  }

  @Post(':id/price')
  async setPrice(
    @Param('id') id: string,
    @Query('store_id') storeId: string,
    @Body('price') price: number,
  ) {
    return this.service.setPrice(id, storeId, price);
  }

  @Post(':id/prime')
  async setPrime(
    @Param('id') id: string,
    @Query('store_id') storeId: string,
    @Body('is_prime') isPrime: boolean,
  ) {
    return this.service.setPrime(id, storeId, isPrime);
  }
}
