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

export class CreateBroadcastRequestItemDto {
  @IsNumber()
  product_id: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateBroadcastRequestDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  radius_km?: number;

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
  @IsNumber()
  @Min(10)
  expires_in_minutes?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBroadcastRequestItemDto)
  items: CreateBroadcastRequestItemDto[];
}
