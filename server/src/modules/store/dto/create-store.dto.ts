import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  owner_name?: string;

  @IsOptional()
  @IsString()
  legal_name?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  banner?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  free_delivery_radius?: number;

  @IsOptional()
  @IsNumber()
  delivery_price_per_km?: number;

  @IsOptional()
  @IsNumber()
  max_delivery_radius?: number;
}
