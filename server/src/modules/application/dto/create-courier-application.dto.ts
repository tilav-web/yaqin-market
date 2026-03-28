import { IsOptional, IsString } from 'class-validator';

export class CreateCourierApplicationDto {
  @IsString()
  requested_store_id: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  transport_type?: string;

  @IsOptional()
  @IsString()
  vehicle_number?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
