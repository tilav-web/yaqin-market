import { User } from 'src/modules/user/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Profile Ma'lumotlari ---
  @Column()
  name: string; // Savdo nomi

  @Column({ unique: true })
  slug: string; // yaqin-market.uz/lazzat-food

  @Column({ nullable: true })
  owner_name: string; // Masalan: "Eshmatov Toshmat"

  @Column({ nullable: true })
  legal_name: string; // MCHJ yoki YaTT nomi

  @Column()
  phone: string; // Aloqa uchun telefon

  // --- Rasmlar (Alohida ustunlar) ---
  @Column({ nullable: true })
  logo: string; // URL: https://cdn.../logo.png

  @Column({ nullable: true })
  banner: string; // URL: https://cdn.../banner.jpg

  // --- Holat ---
  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'float', default: 0 })
  rating: number; // O'rtacha baho (masalan: 4.7)

  @Column({ type: 'int', default: 0 })
  reviews_count: number; // Jami baholaganlar soni

  @ManyToOne(() => User, (user) => user.stores)
  owner: User;

  @CreateDateColumn()
  createdAt: Date;
}
