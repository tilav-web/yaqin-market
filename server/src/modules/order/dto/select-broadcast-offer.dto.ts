import { IsEnum, IsString, IsOptional } from 'class-validator';
import { PaymentMethod } from '../entities/order.entity';

export class SelectBroadcastOfferDto {
  @IsString()
  offer_id: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;
}
