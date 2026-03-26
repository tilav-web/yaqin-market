import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Store } from '../store/entities/store.entity';
import { Product } from '../product/product.entity';

export enum StoreProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

@Entity('store_products')
export class StoreProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Store, (store) => store.storeProducts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column()
  store_id: string;

  @ManyToOne(() => Product, (product) => product.storeProducts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'bigint' })
  product_id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({
    type: 'enum',
    enum: StoreProductStatus,
    default: StoreProductStatus.ACTIVE,
  })
  status: StoreProductStatus;

  @Column({ default: false })
  is_prime: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
