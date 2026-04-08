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
    return this.unitRepo.find({ order: { id: 'ASC' } });
  }

  async findById(id: number) {
    const unit = await this.unitRepo.findOne({ where: { id } });
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  async create(data: { name: { uz: string; ru: string }; short_name?: { uz: string; ru: string } }) {
    const unit = this.unitRepo.create(data);
    return this.unitRepo.save(unit);
  }

  async update(id: number, data: { name?: { uz: string; ru: string }; short_name?: { uz: string; ru: string } }) {
    const unit = await this.findById(id);
    Object.assign(unit, data);
    return this.unitRepo.save(unit);
  }

  async remove(id: number) {
    const unit = await this.findById(id);
    await this.unitRepo.remove(unit);
    return { success: true };
  }
}
