import { IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type, Transform, type TransformFnParams } from 'class-transformer';
import { TranslatableStringDto } from 'src/common/dto/translatable.dto';

function normalizeBoolean({ value }: TransformFnParams): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

export class CreateCategoryDto {
  @ValidateNested()
  @Type(() => TranslatableStringDto)
  name: TranslatableStringDto;

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
  @Transform(normalizeBoolean)
  @IsBoolean()
  is_active?: boolean;
}
