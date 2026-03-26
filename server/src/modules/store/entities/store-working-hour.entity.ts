import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

@Entity('store_working_hours')
export class StoreWorkingHour {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column()
  store_id: string;

  @Column({ type: 'enum', enum: DayOfWeek })
  day_of_week: DayOfWeek;

  @Column({ type: 'time' })
  open_time: string;

  @Column({ type: 'time' })
  close_time: string;

  @Column({ default: true })
  is_open: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
