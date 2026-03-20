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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
