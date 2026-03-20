import { User } from 'src/modules/user/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  frozen_balance: number; // Buyurtma berilganda pul yechilmaydi, vaqtincha "muzlatiladi"

  @OneToOne(() => User, (user) => user.wallet)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
