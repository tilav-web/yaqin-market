import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, default: '-' })
  label: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  lng: number;

  @Column({ type: 'text' })
  address_line: string;

  @Column({ type: 'varchar', nullable: true })
  landmark: string; // Mo'ljal

  @Column({ type: 'jsonb', nullable: true })
  details: { entrance?: string; floor?: string; apartment?: string };

  @Column({ default: false })
  is_default: boolean;

  @ManyToOne(() => User, (user) => user.locations)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
