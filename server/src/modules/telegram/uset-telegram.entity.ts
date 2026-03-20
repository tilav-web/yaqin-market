import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('telegrams')
export class Telegram {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', nullable: true })
  telegram_id: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  username: string;

  @OneToOne(() => User, (user) => user.telegram, {
    cascade: true,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'boolean', default: true })
  is_active: boolean; // Botdan foydalanyaptimi yoki bloklaganmi?

  @Column({ type: 'timestamp', nullable: true })
  blocked_at: Date; // Qachon bloklaganini bilish uchun

  @Column({ type: 'timestamp', nullable: true })
  restarted_at: Date; // Qachon qayta start bosganini bilish uchun

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
