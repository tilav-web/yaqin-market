import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ClickAction } from '../enums/click-action.enum';

export class ClickWebhookDto {
  @IsString()
  @IsNotEmpty()
  click_trans_id: string;

  @IsString()
  @IsNotEmpty()
  service_id: string;

  @IsOptional()
  @IsString()
  click_paydoc_id?: string;

  @IsString()
  @IsNotEmpty()
  merchant_trans_id: string;

  @IsOptional()
  @IsString()
  merchant_prepare_id?: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @Type(() => Number)
  @IsEnum(ClickAction)
  action: ClickAction;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  error?: number;

  @IsOptional()
  @IsString()
  error_note?: string;

  @IsString()
  @IsNotEmpty()
  sign_time: string;

  @IsString()
  @IsNotEmpty()
  sign_string: string;
}
