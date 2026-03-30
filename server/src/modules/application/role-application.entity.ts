import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Store } from '../store/entities/store.entity';
import { SellerLegal } from './seller-legal.entity';

export enum RoleApplicationType {
  SELLER = 'SELLER',
  COURIER = 'COURIER',
}

export enum RoleApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('role_applications')
export class RoleApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: RoleApplicationType })
  type: RoleApplicationType;

  @Column({
    type: 'enum',
    enum: RoleApplicationStatus,
    default: RoleApplicationStatus.PENDING,
  })
  status: RoleApplicationStatus;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  store_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  owner_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  legal_name: string | null;

  @ManyToOne(() => SellerLegal, (sellerLegal) => sellerLegal.applications, {
    nullable: true,
  })
  @JoinColumn({ name: 'seller_legal_id' })
  sellerLegal: SellerLegal | null;

  @Column({ nullable: true })
  seller_legal_id: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  store_phone: string | null;

  @Column({ type: 'text', nullable: true })
  store_address: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  store_lat: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  store_lng: number | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  transport_type: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  vehicle_number: string | null;

  @ManyToOne(() => Store, { nullable: true })
  @JoinColumn({ name: 'requested_store_id' })
  requestedStore: Store | null;

  @Column({ nullable: true })
  requested_store_id: string | null;

  @ManyToOne(() => Store, { nullable: true })
  @JoinColumn({ name: 'approved_store_id' })
  approvedStore: Store | null;

  @Column({ nullable: true })
  approved_store_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewedBy: User | null;

  @Column({ nullable: true })
  reviewed_by_user_id: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
