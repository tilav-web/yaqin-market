import { IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateStoreProductDto {
  @IsNumber()
  product_id: number;

  @IsNumber()
  price: number;

  /** true = do'konda mavjud (AVAILABLE), false = hozircha yo'q (UNAVAILABLE). Default: true */
  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @IsOptional()
  @IsBoolean()
  is_prime?: boolean;
}

export class UpdateStoreProductDto {
  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @IsOptional()
  @IsBoolean()
  is_prime?: boolean;
}
