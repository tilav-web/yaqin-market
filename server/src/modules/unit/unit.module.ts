import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from './unit.entity';
import { UnitService } from './unit.service';
import { UnitController } from './unit.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Unit])],
  controllers: [UnitController],
  providers: [UnitService],
  exports: [UnitService],
})
export class UnitModule {}
