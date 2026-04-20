import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import {
  StartConversationDto,
  SendMessageDto,
} from './dto/start-conversation.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { User } from '../user/user.entity';

@Controller('conversations')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** Barcha suhbatlarim */
  @Get()
  async getMyConversations(@UserDecorator() user: User) {
    return this.chatService.getMyConversations(user.id);
  }

  /** O'qilmagan xabarlar soni */
  @Get('unread')
  async getUnreadCount(@UserDecorator() user: User) {
    return this.chatService.getUnreadCount(user.id);
  }

  /** Suhbat boshlash yoki mavjudini qaytarish */
  @Post()
  async startConversation(
    @UserDecorator() user: User,
    @Body() dto: StartConversationDto,
  ) {
    return this.chatService.startOrGetConversation(user.id, dto);
  }

  /** Suhbat ma'lumoti */
  @Get(':id')
  async getConversation(@Param('id') id: string, @UserDecorator() user: User) {
    return this.chatService.getConversation(id, user.id);
  }

  /** Suhbat xabarlari */
  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @UserDecorator() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      id,
      user.id,
      page ? Number(page) : 1,
      limit ? Math.min(Number(limit), 50) : 30,
    );
  }

  /** REST orqali xabar yuborish (WebSocket ishlamagan hollarda fallback) */
  @Post(':id/messages')
  async sendMessage(
    @Param('id') id: string,
    @UserDecorator() user: User,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(id, user.id, dto);
  }
}
