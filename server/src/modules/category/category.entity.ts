import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Product } from '../product/product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', unique: true })
  slug: string; // URL uchun (masalan: "shirinliklar-va-pishiriqlar")

  @Column({ type: 'varchar', nullable: true })
  image: string; // Faqat 1 ta rasm URL manzili

  @Column({ type: 'int', default: 0 })
  order_number: number; // Tartib raqami (Front-endda qaysi biri birinchi chiqishini belgilaydi)

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
