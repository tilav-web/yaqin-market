import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Store } from './store.entity';

@Entity('store_delivery_settings')
export class StoreDeliverySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Store, (store) => store.deliverySettings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column()
  store_id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  min_order_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  delivery_fee: number;

  @Column({ type: 'int', default: 15 })
  preparation_time: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  free_delivery_radius: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 2000 })
  delivery_price_per_km: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 10000 })
  max_delivery_radius: number;

  @Column({ default: true })
  is_delivery_enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
