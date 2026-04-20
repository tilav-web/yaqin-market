import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Bitta mahsulot uchun baho */
export class ProductRatingDto {
  @IsNotEmpty()
  @IsNumber()
  product_id: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

/** Kuryer uchun baho */
export class CourierRatingDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

/** Bir buyurtma yakunida to'liq baholash — mahsulotlar + kuryer */
export class CreateOrderReviewDto {
  @IsNotEmpty()
  @IsString()
  order_id: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProductRatingDto)
  products?: ProductRatingDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CourierRatingDto)
  courier?: CourierRatingDto;
}

/** Bitta oddiy sharh — eski API backward-compat */
export class CreateReviewDto {
  @IsNotEmpty()
  @IsString()
  order_id: string;

  @IsNotEmpty()
  @IsString()
  store_id: string;

  @IsOptional()
  @IsNumber()
  product_id?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
