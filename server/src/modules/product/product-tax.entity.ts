import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_taxes')
export class ProductTax {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Product, (product) => product.tax, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'bigint', unique: true })
  product_id: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  mxik_code: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  barcode: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  package_code: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  tiftn_code: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  vat_percent: number | null;

  @Column({ type: 'boolean', default: false })
  mark_required: boolean;

  @Column({ type: 'varchar', length: 120, nullable: true })
  origin_country: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  maker_name: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  cert_no: string | null;

  @Column({ type: 'date', nullable: true })
  made_on: string | null;

  @Column({ type: 'date', nullable: true })
  expires_on: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
