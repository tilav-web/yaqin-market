import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './unit.entity';

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
  ) {}

  async findAll() {
    return this.unitRepo.find({ order: { name: 'ASC' } });
  }

  async findById(id: number) {
    const unit = await this.unitRepo.findOne({ where: { id } });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return unit;
  }

  async create(data: { name: string; short_name?: string }) {
    const unit = this.unitRepo.create(data);
    return this.unitRepo.save(unit);
  }
}
