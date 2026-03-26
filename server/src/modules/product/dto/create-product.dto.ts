import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  slug: string;

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
  @IsNumber()
  category_id?: number;
}
