import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { WalletTransactionTypeEnum } from '../enums/wallet-transaction-type.enum';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number; // Masalan: +10000 yoki -5000

  @Column({ type: 'enum', enum: WalletTransactionTypeEnum })
  type: string;

  @Column({ type: 'text', nullable: true })
  description: string; // "№123-buyurtma uchun to'lov"

  @ManyToOne(() => Wallet)
  wallet: Wallet;

  @CreateDateColumn()
  createdAt: Date;
}
