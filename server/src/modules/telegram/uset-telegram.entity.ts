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

  @Column({ type: 'bigint', nullable: true, unique: true })
  telegram_id: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  first_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  last_name: string;

  @OneToOne(() => User, (user) => user.telegram, {
    cascade: true,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  blocked_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  restarted_at: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
