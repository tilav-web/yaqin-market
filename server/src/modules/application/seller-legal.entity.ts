import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Store } from '../store/entities/store.entity';
import { RoleApplication } from './role-application.entity';

export enum SellerLegalType {
  LEGAL_ENTITY = 'LEGAL_ENTITY',
  SOLE_PROPRIETOR = 'SOLE_PROPRIETOR',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
}

@Entity('seller_legals')
export class SellerLegal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ unique: true })
  user_id: string;

  @OneToOne(() => Store, { nullable: true })
  @JoinColumn({ name: 'store_id' })
  store: Store | null;

  @Column({ nullable: true, unique: true })
  store_id: string | null;

  @Column({
    type: 'enum',
    enum: SellerLegalType,
    default: SellerLegalType.SOLE_PROPRIETOR,
  })
  type: SellerLegalType;

  @Column({ type: 'varchar', length: 255 })
  official_name: string;

  @Column({ type: 'varchar', length: 32, nullable: true, unique: true })
  tin: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  reg_no: string | null;

  @Column({ type: 'text', nullable: true })
  reg_address: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  bank_name: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  bank_account: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  license_no: string | null;

  @Column({ type: 'date', nullable: true })
  license_until: string | null;

  @OneToMany(() => RoleApplication, (application) => application.sellerLegal)
  applications: RoleApplication[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
