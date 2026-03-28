import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentProvider {
  CLICK = 'CLICK',
  PAYME = 'PAYME',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  order_id: string;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider: PaymentProvider;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  transaction_id: string;

  @Column({ type: 'bigint', nullable: true })
  provider_create_time: number | null;

  @Column({ type: 'bigint', nullable: true })
  provider_perform_time: number | null;

  @Column({ type: 'bigint', nullable: true })
  provider_cancel_time: number | null;

  @Column({ type: 'int', nullable: true })
  cancel_reason: number | null;

  @Column({ type: 'jsonb', nullable: true })
  raw_response: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
