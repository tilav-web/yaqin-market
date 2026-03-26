import { User } from 'src/modules/user/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { StoreDeliverySettings } from './store-delivery-settings.entity';
import { StoreWorkingHour } from './store-working-hour.entity';
import { StoreProduct } from '../../store-product/store-product.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Profile Ma'lumotlari ---
  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  owner_name: string;

  @Column({ nullable: true })
  legal_name: string;

  @Column()
  phone: string;

  // --- Joylashuv ---
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  lng: number;

  @Column({ type: 'text', nullable: true })
  address: string;

  // --- Rasmlar ---
  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  banner: string;

  // --- Holat ---
  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_prime: boolean;

  @Column({ type: 'float', default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  reviews_count: number;

  // --- Relation ---
  @ManyToOne(() => User, (user) => user.stores)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ nullable: true })
  owner_id: string;

  @OneToMany(() => StoreDeliverySettings, (settings) => settings.store)
  deliverySettings: StoreDeliverySettings[];

  @OneToMany(() => StoreProduct, (sp) => sp.store)
  storeProducts: StoreProduct[];

  @OneToMany(() => StoreWorkingHour, (wh) => wh.store)
  workingHours: StoreWorkingHour[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
