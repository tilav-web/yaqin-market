import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StaffRole } from '../entities/store-staff.entity';

export class InviteStaffDto {
  @IsNotEmpty()
  @IsString()
  store_id: string;

  @IsNotEmpty()
  @IsString()
  invitee_id: string;

  @IsNotEmpty()
  @IsEnum(StaffRole)
  role: StaffRole;

  @IsOptional()
  @IsString()
  message?: string;
}

export class RespondInvitationDto {
  @IsNotEmpty()
  @IsEnum(['ACCEPT', 'REJECT'])
  action: 'ACCEPT' | 'REJECT';
}
