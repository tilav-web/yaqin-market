import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^(\+?998)?\d{9}$/, {
    message: 'Invalid phone number format',
  })
  phone: string;
}
