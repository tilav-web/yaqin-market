import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ConversationType } from '../entities/conversation.entity';

export class StartConversationDto {
  @IsEnum(ConversationType)
  type: ConversationType;

  /** order_id, broadcast_request_id, yoki store_id */
  @IsOptional()
  @IsUUID()
  reference_id?: string;

  /** Seller user ID (ORDER/BROADCAST uchun avtomatik aniqlanadi, STORE_INQUIRY uchun kerak) */
  @IsOptional()
  @IsUUID()
  seller_id?: string;
}

export class SendMessageDto {
  @IsString()
  content: string;
}
