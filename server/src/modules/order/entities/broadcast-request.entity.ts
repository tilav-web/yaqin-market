import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { BroadcastRequestItem } from './broadcast-request-item.entity';
import { BroadcastOffer } from './broadcast-offer.entity';

export enum BroadcastRequestStatus {
  OPEN = 'OPEN',
  SELECTED = 'SELECTED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('broadcast_requests')
export class BroadcastRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ type: 'varchar', length: 140, default: 'Yangi so‘rov' })
  title: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({
    type: 'enum',
    enum: BroadcastRequestStatus,
    default: BroadcastRequestStatus.OPEN,
  })
  status: BroadcastRequestStatus;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 5 })
  radius_km: number;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  delivery_lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  delivery_lng: number;

  @Column()
  delivery_address: string;

  @Column({ type: 'text', nullable: true })
  delivery_details: string | null;

  @Column({ type: 'uuid', nullable: true })
  selected_offer_id: string | null;

  @Column({ type: 'timestamp', nullable: true })
  selected_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date | null;

  @OneToMany(() => BroadcastRequestItem, (item) => item.request, {
    cascade: true,
  })
  items: BroadcastRequestItem[];

  @OneToMany(() => BroadcastOffer, (offer) => offer.request)
  offers: BroadcastOffer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
