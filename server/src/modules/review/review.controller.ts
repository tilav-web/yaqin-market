import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import {
  CreateOrderReviewDto,
  CreateReviewDto,
} from './dto/create-review.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { User } from '../user/user.entity';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { ReviewTarget } from './review.entity';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // ── Public / customer
  @Post()
  @UseGuards(AuthGuard)
  async create(@UserDecorator() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(user.id, dto);
  }

  /** Buyurtma yakunida mahsulotlar + kuryer bir marta baholanadi */
  @Post('order')
  @UseGuards(AuthGuard)
  async createForOrder(
    @UserDecorator() user: User,
    @Body() dto: CreateOrderReviewDto,
  ) {
    return this.reviewService.createForOrder(user.id, dto);
  }

  @Get('store/:storeId')
  async findByStore(@Param('storeId') storeId: string) {
    return this.reviewService.findByStore(storeId);
  }

  @Get('product/:productId')
  async findByProduct(@Param('productId') productId: number) {
    return this.reviewService.findByProduct(Number(productId));
  }

  @Get('courier/:courierId')
  async findByCourier(@Param('courierId') courierId: string) {
    return this.reviewService.findByCourier(courierId);
  }

  @Get('my')
  @UseGuards(AuthGuard)
  async findByUser(@UserDecorator() user: User) {
    return this.reviewService.findByUser(user.id);
  }

  @Get('my/order/:orderId')
  @UseGuards(AuthGuard)
  async findByOrder(
    @UserDecorator() user: User,
    @Param('orderId') orderId: string,
  ) {
    return this.reviewService.findByOrder(user.id, orderId);
  }

  // ── Admin
  @Get('admin/stats')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  async adminStats() {
    return this.reviewService.adminStats();
  }

  @Get('admin/list')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  async adminList(
    @Query('target') target?: ReviewTarget,
    @Query('store_id') store_id?: string,
    @Query('courier_id') courier_id?: string,
    @Query('product_id') product_id?: string,
    @Query('min_rating') min_rating?: string,
    @Query('max_rating') max_rating?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewService.adminList({
      target,
      store_id,
      courier_id,
      product_id: product_id ? Number(product_id) : undefined,
      min_rating: min_rating ? Number(min_rating) : undefined,
      max_rating: max_rating ? Number(max_rating) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Delete('admin/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  async adminDelete(@Param('id') id: string) {
    return this.reviewService.adminDelete(id);
  }
}
