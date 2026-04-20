import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity';

export enum NotificationType {
  ORDER = 'ORDER',
  CHAT = 'CHAT',
  CHANGE = 'CHANGE',
  WALLET = 'WALLET',
  BROADCAST = 'BROADCAST',
  REVIEW = 'REVIEW',
  COURIER = 'COURIER',
  SYSTEM = 'SYSTEM',
}

@Entity('notifications')
@Index(['user_id', 'read_at'])
@Index(['user_id', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  /** Data payload — order_id, conversation_id, va hokazo */
  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, string> | null;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
