import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Store } from '../../store/entities/store.entity';
import { StaffRole } from './store-staff.entity';

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('store_staff_invitations')
@Index(['invitee_id', 'status'])
@Index(['store_id', 'status'])
export class StoreStaffInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ type: 'uuid' })
  store_id: string;

  /** Taklifni yuborgan (owner/manager) */
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'inviter_id' })
  inviter: User | null;

  @Column({ type: 'uuid', nullable: true })
  inviter_id: string | null;

  /** Taklif qilinayotgan user */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitee_id' })
  invitee: User;

  @Column({ type: 'uuid' })
  invitee_id: string;

  @Column({ type: 'enum', enum: StaffRole })
  role: StaffRole;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'timestamp', nullable: true })
  responded_at: Date | null;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
