import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Auth } from '../auth/auth.entity';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
  ) {}

  async findAll() {
    return this.userRepo.find({
      relations: ['auth', 'stores'],
      order: { createdAt: 'DESC' },
    });
  }

  async getCurrentUser(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['auth'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(
    userId: string,
    data: { first_name?: string; last_name?: string },
  ) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['auth'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, data);
    return this.userRepo.save(user);
  }

  async updateRole(userId: string, role: AuthRoleEnum) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['auth'],
    });

    if (!user?.auth) {
      throw new NotFoundException('User auth not found');
    }

    user.auth.role = role;
    await this.authRepo.save(user.auth);

    return this.getCurrentUser(userId);
  }
}
