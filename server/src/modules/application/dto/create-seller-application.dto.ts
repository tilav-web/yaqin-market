import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SellerLegalDto } from './seller-legal.dto';

export class CreateSellerApplicationDto {
  @IsString()
  store_name: string;

  @IsOptional()
  @IsString()
  owner_name?: string;

  @IsOptional()
  @IsString()
  legal_name?: string;

  @IsString()
  phone: string;

  @IsString()
  store_phone: string;

  @IsOptional()
  @IsString()
  store_address?: string;

  @IsOptional()
  @IsNumber()
  store_lat?: number;

  @IsOptional()
  @IsNumber()
  store_lng?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @ValidateNested()
  @Type(() => SellerLegalDto)
  legal: SellerLegalDto;
}
