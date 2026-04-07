import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Message } from './message.entity';

export enum ConversationType {
  ORDER = 'ORDER',
  BROADCAST = 'BROADCAST',
  STORE_INQUIRY = 'STORE_INQUIRY',
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ConversationType })
  type: ConversationType;

  /** order_id, broadcast_request_id yoki store_id */
  @Column({ type: 'uuid', nullable: true })
  reference_id: string | null;

  @Column({ type: 'uuid' })
  buyer_id: string;

  @Column({ type: 'uuid' })
  seller_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ type: 'text', nullable: true })
  last_message_preview: string | null;

  @Column({ type: 'timestamp', nullable: true })
  last_message_at: Date | null;

  @Column({ type: 'int', default: 0 })
  unread_buyer: number;

  @Column({ type: 'int', default: 0 })
  unread_seller: number;

  @OneToMany(() => Message, (msg) => msg.conversation)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
