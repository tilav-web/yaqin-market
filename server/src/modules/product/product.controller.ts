import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AuthGuard } from '../auth/guard/auth.guard';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll(@Query('category_id') categoryId?: number) {
    return this.productService.findAll(categoryId ? Number(categoryId) : undefined);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateProductDto>,
  ) {
    return this.productService.update(id, dto);
  }
}
