import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { UpdateDeliverySettingsDto } from './dto/update-delivery-settings.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { DayOfWeek } from './entities/store-working-hour.entity';

@Controller('stores')
export class StoreServiceController {
  constructor(private readonly service: StoreService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() data: any, @UserDecorator() user: any) {
    return this.service.create(user.id, data);
  }

  @Get('my')
  @UseGuards(AuthGuard)
  async getMyStores(@UserDecorator() user: any) {
    return this.service.findByOwner(user.id);
  }

  @Get('nearby')
  async getNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius: number = 5,
  ) {
    return this.service.findNearby(Number(lat), Number(lng), Number(radius));
  }

  @Get('prime')
  async getPrime(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius: number = 5,
  ) {
    return this.service.findPrime(Number(lat), Number(lng), Number(radius));
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  async update(
    @Param('id') id: string,
    @Body() data: any,
    @UserDecorator() user: any,
  ) {
    return this.service.update(id, user.id, data);
  }

  @Put(':id/delivery-settings')
  @UseGuards(AuthGuard)
  async updateDeliverySettings(
    @Param('id') id: string,
    @Body() data: UpdateDeliverySettingsDto,
    @UserDecorator() user: any,
  ) {
    return this.service.updateDeliverySettings(id, user.id, data);
  }

  @Put(':id/working-hours')
  @UseGuards(AuthGuard)
  async updateWorkingHours(
    @Param('id') id: string,
    @Body()
    hours: {
      day_of_week: DayOfWeek;
      open_time: string;
      close_time: string;
      is_open: boolean;
    }[],
    @UserDecorator() user: any,
  ) {
    return this.service.updateWorkingHours(id, user.id, hours);
  }

  @Put(':id/active')
  @UseGuards(AuthGuard)
  async setActive(
    @Param('id') id: string,
    @Body('is_active') isActive: boolean,
    @UserDecorator() user: any,
  ) {
    return this.service.setActive(id, user.id, isActive);
  }

  @Put(':id/prime')
  @UseGuards(AuthGuard)
  async setPrime(
    @Param('id') id: string,
    @Body('is_prime') isPrime: boolean,
    @UserDecorator() user: any,
  ) {
    return this.service.setPrime(id, user.id, isPrime);
  }

  @Get()
  async getAll() {
    return this.service.findAll();
  }
}
