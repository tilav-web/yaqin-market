import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductTaxDto } from './product-tax.dto';

export class CreateProductDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  unit_id?: number;

  @IsOptional()
  @IsArray()
  images?: { url: string; is_main: boolean }[];

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  parent_id?: number;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductTaxDto)
  tax?: ProductTaxDto;
}
