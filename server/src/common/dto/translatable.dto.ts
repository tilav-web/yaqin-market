import { IsString } from 'class-validator';

export class TranslatableStringDto {
  @IsString()
  uz: string;

  @IsString()
  ru: string;
}
