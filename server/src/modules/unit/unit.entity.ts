import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Product } from '../product/product.entity';

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn('increment') // ID raqam bo'lgani qulay
  id: number;

  @Column({ unique: true })
  name: string; // Masalan: "dona", "kg", "litr"

  @Column({ nullable: true })
  short_name: string; // Masalan: "d.", "kg.", "l."

  @OneToMany(() => Product, (product) => product.unit)
  products: Product[];
}
