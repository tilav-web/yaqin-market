import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Auth } from '../auth/auth.entity';
import { Telegram } from '../telegram/uset-telegram.entity';
import { Location } from '../location/location.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Store } from '../store/entities/store.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, default: '-' })
  first_name: string;

  @Column({ type: 'varchar', length: 255, default: '-' })
  last_name: string;

  @OneToOne(() => Auth, (auth) => auth.user, { cascade: true, nullable: true })
  @JoinColumn({ name: 'auth_id' })
  auth: Auth;

  @OneToOne(() => Telegram, (telegram) => telegram.user)
  telegram: Telegram;

  @OneToMany(() => Location, (location) => location.user)
  locations: Location[];

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;

  @OneToMany(() => Store, (store) => store.owner)
  stores: Store[];

  // FCM push notification token (mobile)
  @Column({ type: 'varchar', nullable: true })
  fcm_token: string | null;

  // Courier real-time location
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  current_lat: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  current_lng: number | null;

  @Column({ type: 'timestamp', nullable: true })
  last_location_update: Date | null;

  // Courier rating aggregatsiya
  @Column({ type: 'float', default: 0 })
  courier_rating: number;

  @Column({ type: 'int', default: 0 })
  courier_reviews_count: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
