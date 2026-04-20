import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';
import { Store } from '../store/entities/store.entity';
import { Order } from '../order/entities/order.entity';

export enum ReviewTarget {
  PRODUCT = 'PRODUCT',
  COURIER = 'COURIER',
  STORE = 'STORE',
}

@Entity('reviews')
@Index(['target', 'store_id'])
@Index(['target', 'courier_id'])
@Index(['target', 'product_id'])
@Index(['owner_id', 'order_id'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReviewTarget,
    default: ReviewTarget.PRODUCT,
  })
  target: ReviewTarget;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  owner: User;

  @Column({ type: 'uuid', nullable: true })
  owner_id: string;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @Column({ type: 'uuid', nullable: true })
  order_id: string | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @Column({ type: 'bigint', nullable: true })
  product_id: number | null;

  @ManyToOne(() => Store, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'store_id' })
  store: Store | null;

  @Column({ type: 'uuid', nullable: true })
  store_id: string | null;

  /** Target=COURIER holatda kuryer (User) FK */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'courier_id' })
  courier: User | null;

  @Column({ type: 'uuid', nullable: true })
  courier_id: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
