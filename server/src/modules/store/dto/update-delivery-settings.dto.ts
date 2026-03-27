import { IsNumber, IsOptional, IsBoolean, IsString } from 'class-validator';

export class UpdateDeliverySettingsDto {
  @IsOptional()
  @IsNumber()
  min_order_amount?: number;

  @IsOptional()
  @IsNumber()
  delivery_fee?: number;

  @IsOptional()
  @IsNumber()
  preparation_time?: number;

  @IsOptional()
  @IsNumber()
  free_delivery_radius?: number;

  @IsOptional()
  @IsNumber()
  delivery_price_per_km?: number;

  @IsOptional()
  @IsNumber()
  max_delivery_radius?: number;

  @IsOptional()
  @IsString()
  delivery_note?: string;

  @IsOptional()
  @IsBoolean()
  is_delivery_enabled?: boolean;
}
