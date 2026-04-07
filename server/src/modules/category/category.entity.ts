import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Product } from '../product/product.entity';
import type { TranslatableString } from 'src/common/types/translatable';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  name: TranslatableString;

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
