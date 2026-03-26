import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

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
