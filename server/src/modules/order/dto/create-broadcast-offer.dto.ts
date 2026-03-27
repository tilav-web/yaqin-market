import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBroadcastOfferItemDto {
  @IsString()
  request_item_id: string;

  @IsNumber()
  @Min(0)
  unit_price: number;

  @IsOptional()
  @IsString()
  store_product_id?: string;
}

export class CreateBroadcastOfferDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBroadcastOfferItemDto)
  items: CreateBroadcastOfferItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  delivery_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  estimated_minutes?: number;

  @IsOptional()
  @IsString()
  message?: string;
}
