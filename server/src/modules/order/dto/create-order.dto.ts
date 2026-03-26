import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, OrderType } from '../entities/order.entity';

export class CreateOrderItemDto {
  @IsNotEmpty()
  @IsString()
  store_product_id: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsEnum(OrderType)
  order_type?: OrderType;

  @IsOptional()
  @IsString()
  store_id?: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsNotEmpty()
  @IsNumber()
  delivery_lat: number;

  @IsNotEmpty()
  @IsNumber()
  delivery_lng: number;

  @IsNotEmpty()
  @IsString()
  delivery_address: string;

  @IsOptional()
  @IsString()
  delivery_details?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;
}
