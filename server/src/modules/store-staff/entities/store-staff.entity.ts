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

export enum StaffRole {
  OWNER = 'OWNER', // do'kon egasi — barcha huquqlar
  MANAGER = 'MANAGER', // boshqaruvchi — xodim qo'shish, moliya, hamma narsa
  OPERATOR = 'OPERATOR', // buyurtma qabul qilish, rad etish, tayyor deb belgilash
  PACKER = 'PACKER', // faqat order yig'ish
  COURIER = 'COURIER', // faqat yetkazib berish
}

@Entity('store_staff')
@Index(['store_id', 'user_id'], { unique: true })
@Index(['user_id', 'is_active'])
export class StoreStaff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ type: 'uuid' })
  store_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'enum', enum: StaffRole, default: StaffRole.OPERATOR })
  role: StaffRole;

  @Column({ default: true })
  is_active: boolean;

  /** Kim qo'shgan (invitation inviter) */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invited_by' })
  invitedBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  invited_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  hired_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  terminated_at: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
