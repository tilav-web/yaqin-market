import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';

export enum BroadcastTarget {
  ALL = 'ALL',
  CUSTOMERS = 'CUSTOMERS',
  SELLERS = 'SELLERS',
  COURIERS = 'COURIERS',
  SPECIFIC = 'SPECIFIC',
}

export class BroadcastNotificationDto {
  @IsNotEmpty()
  @IsEnum(BroadcastTarget)
  target: BroadcastTarget;

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  body: string;

  /** Ixtiyoriy ekstra data payload (masalan order_id) */
  @IsOptional()
  data?: Record<string, string>;

  /** target=SPECIFIC bo'lganda aniq user id lar */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  user_ids?: string[];

  /** role filteri — target=ALL bo'lganda ishlatilishi mumkin */
  @IsOptional()
  @IsEnum(AuthRoleEnum, { each: true })
  roles?: AuthRoleEnum[];

  /** Faqat FCM tokeni bor userlarga */
  @IsOptional()
  @IsBoolean()
  only_with_token?: boolean;

  /** Customer uchun: minimal yetkazilgan buyurtma soni */
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_delivered_orders?: number;

  /** Oxirgi N kun ichida faol bo'lganlar (user.updatedAt asosida) */
  @IsOptional()
  @IsNumber()
  @Min(1)
  active_last_days?: number;

  /** Test rejim — yubormay sanab chiqaradi */
  @IsOptional()
  @IsBoolean()
  dry_run?: boolean;
}
