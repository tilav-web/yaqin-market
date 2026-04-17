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

/**
 * Seller stock sonini yuritmaydi — faqat "mavjud" yoki "yo'q" deb belgilaydi.
 *  - AVAILABLE   — do'konda bor
 *  - UNAVAILABLE — hozircha yo'q (tezda qayta ochilishi mumkin)
 * Mahsulotni do'kondan butunlay olib tashlash = store_product rekordini DELETE qilish.
 */
export enum StoreProductStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
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

  @Column({
    type: 'enum',
    enum: StoreProductStatus,
    default: StoreProductStatus.AVAILABLE,
  })
  status: StoreProductStatus;

  @Column({ default: false })
  is_prime: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
