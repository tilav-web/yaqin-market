import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BroadcastOffer } from './broadcast-offer.entity';
import { BroadcastRequestItem } from './broadcast-request-item.entity';
import { Product } from '../../product/product.entity';
import { StoreProduct } from '../../store-product/store-product.entity';

@Entity('broadcast_offer_items')
export class BroadcastOfferItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BroadcastOffer, (offer) => offer.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'offer_id' })
  offer: BroadcastOffer;

  @Column({ type: 'uuid' })
  offer_id: string;

  @ManyToOne(() => BroadcastRequestItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_item_id' })
  request_item: BroadcastRequestItem;

  @Column({ type: 'uuid' })
  request_item_id: string;

  @ManyToOne(() => Product, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @Column({ type: 'bigint' })
  product_id: number;

  @ManyToOne(() => StoreProduct, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'store_product_id' })
  store_product: StoreProduct | null;

  @Column({ type: 'uuid', nullable: true })
  store_product_id: string | null;

  @Column()
  product_name: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unit_price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_price: number;
}
