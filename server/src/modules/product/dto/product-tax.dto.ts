import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ProductTaxDto {
  @IsOptional()
  @IsString()
  mxik_code?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  package_code?: string;

  @IsOptional()
  @IsString()
  tiftn_code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  vat_percent?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  mark_required?: boolean;

  @IsOptional()
  @IsString()
  origin_country?: string;

  @IsOptional()
  @IsString()
  maker_name?: string;

  @IsOptional()
  @IsString()
  cert_no?: string;

  @IsOptional()
  @IsDateString()
  made_on?: string;

  @IsOptional()
  @IsDateString()
  expires_on?: string;
}
