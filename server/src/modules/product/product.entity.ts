import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Category } from '../category/category.entity';
import { Unit } from '../unit/unit.entity';
import { StoreProduct } from '../store-product/store-product.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

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
  parent_id: number;

  @ManyToOne(() => Product, (product) => product.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Product;

  @OneToMany(() => Product, (product) => product.parent)
  children: Product[];

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => StoreProduct, (sp) => sp.product)
  storeProducts: StoreProduct[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
