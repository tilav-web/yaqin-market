import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order_number?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  is_active?: boolean;
}
