import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UnitService } from './unit.service';
import { AuthGuard } from '../auth/guard/auth.guard';

@Controller('units')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Get()
  async findAll() {
    return this.unitService.findAll();
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() data: { name: string; short_name?: string }) {
    return this.unitService.create(data);
  }
}
