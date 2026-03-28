import { IsIn, IsOptional, IsString } from 'class-validator';
import { RoleApplicationStatus } from '../role-application.entity';

export class ReviewApplicationDto {
  @IsIn([RoleApplicationStatus.APPROVED, RoleApplicationStatus.REJECTED])
  status: RoleApplicationStatus.APPROVED | RoleApplicationStatus.REJECTED;

  @IsOptional()
  @IsString()
  reason?: string;
}
