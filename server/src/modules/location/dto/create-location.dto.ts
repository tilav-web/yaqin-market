import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class CreateLocationDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  address_line: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsOptional()
  @IsObject()
  details?: { entrance?: string; floor?: string; apartment?: string };

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
