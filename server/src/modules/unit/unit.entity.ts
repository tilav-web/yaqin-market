import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Product } from '../product/product.entity';
import { TranslatableString } from 'src/common/types/translatable';

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'jsonb' })
  name: TranslatableString; // Masalan: { uz: "dona", ru: "штука" }

  @Column({ type: 'jsonb', nullable: true })
  short_name: TranslatableString | null; // Masalan: { uz: "d.", ru: "шт." }

  @OneToMany(() => Product, (product) => product.unit)
  products: Product[];
}
