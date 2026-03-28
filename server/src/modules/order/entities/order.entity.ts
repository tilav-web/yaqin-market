import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Store } from '../../store/entities/store.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  READY = 'READY',
  DELIVERING = 'DELIVERING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CLICK = 'CLICK',
  PAYME = 'PAYME',
}

export enum OrderType {
  DIRECT = 'DIRECT',
  BROADCAST = 'BROADCAST',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  order_number: string;

  @Column({
    type: 'enum',
    enum: OrderType,
    default: OrderType.DIRECT,
  })
  order_type: OrderType;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ nullable: true })
  customer_id: string;

  @ManyToOne(() => Store, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ nullable: true })
  store_id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'courier_id' })
  courier: User;

  @Column({ nullable: true })
  courier_id: string;

  @Column({ type: 'uuid', nullable: true })
  source_broadcast_request_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  source_broadcast_offer_id: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  items_price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  delivery_price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_price: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  payment_method: PaymentMethod;

  @Column({ default: false })
  is_paid: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  delivery_lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  delivery_lng: number;

  @Column()
  delivery_address: string;

  @Column({ type: 'text', nullable: true })
  delivery_details: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  customer_note: string;

  @Column({ type: 'text', nullable: true })
  store_note: string;

  @Column({ type: 'timestamp', nullable: true })
  accepted_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  ready_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivered_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date;

  @Column({ nullable: true })
  cancelled_reason: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
