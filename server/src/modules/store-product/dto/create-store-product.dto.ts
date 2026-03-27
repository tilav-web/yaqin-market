import { IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateStoreProductDto {
  @IsNumber()
  product_id: number;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  is_prime?: boolean;
}

export class UpdateStoreProductDto {
  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  is_prime?: boolean;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
