import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('auths')
export class Auth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, length: 9 })
  phone: string;

  @Column({ type: 'enum', enum: AuthRoleEnum, default: AuthRoleEnum.CUSTOMER })
  role: AuthRoleEnum;

  @OneToOne(() => User, (user) => user.auth)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
