import { IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class UpdateStoreProductDto {
  @IsOptional()
  @IsNumber()
  price?: number;

  /** true = do'konda mavjud (AVAILABLE), false = hozircha yo'q (UNAVAILABLE). */
  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @IsOptional()
  @IsBoolean()
  is_prime?: boolean;
}
