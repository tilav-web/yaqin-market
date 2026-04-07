import { Controller, Post, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { StoreSubscriptionService } from './store-subscription.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { User } from '../user/user.entity';

@Controller('stores')
@UseGuards(AuthGuard)
export class StoreSubscriptionController {
  constructor(private readonly service: StoreSubscriptionService) {}

  @Get('subscriptions/my')
  async getMySubscriptions(@UserDecorator() user: User) {
    return this.service.getMySubscriptions(user.id);
  }

  @Post(':id/subscribe')
  async subscribe(@Param('id') storeId: string, @UserDecorator() user: User) {
    return this.service.subscribe(user.id, storeId);
  }

  @Delete(':id/subscribe')
  async unsubscribe(@Param('id') storeId: string, @UserDecorator() user: User) {
    return this.service.unsubscribe(user.id, storeId);
  }

  @Get(':id/subscribed')
  async checkSubscription(@Param('id') storeId: string, @UserDecorator() user: User) {
    const subscribed = await this.service.isSubscribed(user.id, storeId);
    return { subscribed };
  }
}
