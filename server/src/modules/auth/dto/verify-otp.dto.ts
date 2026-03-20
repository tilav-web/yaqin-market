import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^(\+?998)?\d{9}$/, {
    message: 'Invalid phone number format',
  })
  phone: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'Invalid otp format',
  })
  otp: string;
}
