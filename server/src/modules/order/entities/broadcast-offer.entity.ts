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
import { BroadcastRequest } from './broadcast-request.entity';
import { BroadcastOfferItem } from './broadcast-offer-item.entity';
import { Store } from '../../store/entities/store.entity';
import { User } from '../../user/user.entity';

export enum BroadcastOfferStatus {
  PENDING = 'PENDING',
  SELECTED = 'SELECTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

@Entity('broadcast_offers')
export class BroadcastOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BroadcastRequest, (request) => request.offers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request: BroadcastRequest;

  @Column({ type: 'uuid' })
  request_id: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ type: 'uuid' })
  store_id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'seller_id' })
  seller: User | null;

  @Column({ type: 'uuid', nullable: true })
  seller_id: string | null;

  @Column({
    type: 'enum',
    enum: BroadcastOfferStatus,
    default: BroadcastOfferStatus.PENDING,
  })
  status: BroadcastOfferStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal_price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  delivery_price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_price: number;

  @Column({ type: 'int', default: 30 })
  estimated_minutes: number;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @OneToMany(() => BroadcastOfferItem, (item) => item.offer, { cascade: true })
  items: BroadcastOfferItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
