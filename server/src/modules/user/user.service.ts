import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Auth } from '../auth/auth.entity';

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
      relations: ['auth'],
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
}
