import { IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class UpdateStoreProductDto {
  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  is_prime?: boolean;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
