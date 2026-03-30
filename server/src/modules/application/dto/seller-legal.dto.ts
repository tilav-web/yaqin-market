import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { SellerLegalType } from '../seller-legal.entity';

export class SellerLegalDto {
  @IsEnum(SellerLegalType)
  type: SellerLegalType;

  @IsString()
  official_name: string;

  @IsOptional()
  @IsString()
  tin?: string;

  @IsOptional()
  @IsString()
  reg_no?: string;

  @IsOptional()
  @IsString()
  reg_address?: string;

  @IsOptional()
  @IsString()
  bank_name?: string;

  @IsOptional()
  @IsString()
  bank_account?: string;

  @IsOptional()
  @IsString()
  license_no?: string;

  @IsOptional()
  @IsDateString()
  license_until?: string;
}
