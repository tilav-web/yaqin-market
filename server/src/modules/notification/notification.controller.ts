import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { User } from '../user/user.entity';
import { NotificationService } from './notification.service';
import { NotificationType } from './notification.entity';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('my')
  async list(
    @UserDecorator() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('filter') filter?: 'all' | 'unread',
    @Query('type') type?: NotificationType,
  ) {
    return this.notificationService.list(user.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      filter,
      type,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@UserDecorator() user: User) {
    return this.notificationService.getUnreadCount(user.id);
  }

  @Post(':id/read')
  async markRead(@UserDecorator() user: User, @Param('id') id: string) {
    return this.notificationService.markRead(user.id, id);
  }

  @Post('read-all')
  async markAllRead(@UserDecorator() user: User) {
    return this.notificationService.markAllRead(user.id);
  }

  @Delete(':id')
  async delete(@UserDecorator() user: User, @Param('id') id: string) {
    return this.notificationService.delete(user.id, id);
  }

  @Delete()
  async deleteAll(@UserDecorator() user: User) {
    return this.notificationService.deleteAll(user.id);
  }

  /** Mobile FCM token saqlash */
  @Post('fcm-token')
  async saveFcmToken(
    @UserDecorator() user: User,
    @Body('token') token: string,
  ) {
    return this.notificationService.saveFcmToken(user.id, token);
  }
}
