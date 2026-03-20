import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';
import { Store } from '../store/entities/store.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  owner: User;

  //   @ManyToOne(() => Order)
  //   @JoinColumn({ name: 'order_id' })
  //   order: Order; // Aynan qaysi buyurtma uchun sharh berilyapti

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @CreateDateColumn()
  createdAt: Date;
}
