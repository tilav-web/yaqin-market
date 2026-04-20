import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Category } from '../category/category.entity';
import { Unit } from '../unit/unit.entity';
import { StoreProduct } from '../store-product/store-product.entity';
import { ProductTax } from './product-tax.entity';
import type { TranslatableString } from 'src/common/types/translatable';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'jsonb' })
  name: TranslatableString;

  @Column({ type: 'jsonb', nullable: true })
  description: TranslatableString | null;

  @ManyToOne(() => Unit, (unit) => unit.products, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column({ type: 'jsonb', default: [] })
  images: { url: string; is_main: boolean }[];

  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, any>;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'bigint', nullable: true })
  parent_id: number | null;

  @ManyToOne(() => Product, (product) => product.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Product | null;

  @OneToMany(() => Product, (product) => product.parent)
  children: Product[];

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => StoreProduct, (sp) => sp.product)
  storeProducts: StoreProduct[];

  @OneToOne(() => ProductTax, (tax) => tax.product)
  tax: ProductTax | null;

  @Column({ type: 'float', default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  reviews_count: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
