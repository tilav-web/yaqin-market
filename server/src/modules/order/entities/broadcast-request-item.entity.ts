import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../product/product.entity';
import { BroadcastRequest } from './broadcast-request.entity';

@Entity('broadcast_request_items')
export class BroadcastRequestItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BroadcastRequest, (request) => request.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request: BroadcastRequest;

  @Column({ type: 'uuid' })
  request_id: string;

  @ManyToOne(() => Product, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @Column({ type: 'bigint' })
  product_id: number;

  @Column()
  product_name: string;

  @Column({ type: 'int' })
  quantity: number;
}
