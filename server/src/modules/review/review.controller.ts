import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { User } from '../user/user.entity';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(@UserDecorator() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(user.id, dto);
  }

  @Get('store/:storeId')
  async findByStore(@Param('storeId') storeId: string) {
    return this.reviewService.findByStore(storeId);
  }

  @Get('product/:productId')
  async findByProduct(@Param('productId') productId: number) {
    return this.reviewService.findByProduct(Number(productId));
  }

  @Get('my')
  @UseGuards(AuthGuard)
  async findByUser(@UserDecorator() user: User) {
    return this.reviewService.findByUser(user.id);
  }
}
