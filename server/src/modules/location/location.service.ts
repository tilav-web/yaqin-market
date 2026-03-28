import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { User } from '../user/user.entity';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
  ) {}

  async findByUser(userId: string) {
    return this.locationRepo.find({
      where: { user: { id: userId } },
      order: { is_default: 'DESC' },
    });
  }

  async create(userId: string, dto: CreateLocationDto) {
    const location = this.locationRepo.create({
      ...dto,
      user: { id: userId } as User,
    });

    if (dto.is_default) {
      await this.clearDefault(userId);
    }

    return this.locationRepo.save(location);
  }

  async update(id: string, userId: string, data: Partial<CreateLocationDto>) {
    const location = await this.locationRepo.findOne({
      where: { id, user: { id: userId } },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    if (data.is_default) {
      await this.clearDefault(userId);
    }

    Object.assign(location, data);
    return this.locationRepo.save(location);
  }

  async remove(id: string, userId: string) {
    const location = await this.locationRepo.findOne({
      where: { id, user: { id: userId } },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    await this.locationRepo.remove(location);
    return { success: true };
  }

  async setDefault(id: string, userId: string) {
    const location = await this.locationRepo.findOne({
      where: { id, user: { id: userId } },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    await this.clearDefault(userId);

    location.is_default = true;
    return this.locationRepo.save(location);
  }

  private async clearDefault(userId: string) {
    await this.locationRepo
      .createQueryBuilder()
      .update(Location)
      .set({ is_default: false })
      .where('user_id = :userId AND is_default = true', { userId })
      .execute();
  }
}
