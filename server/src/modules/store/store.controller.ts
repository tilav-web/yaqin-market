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
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateDeliverySettingsDto } from './dto/update-delivery-settings.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { AuthDec } from '../auth/decorators/user.decorator';
import { DayOfWeek } from './entities/store-working-hour.entity';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { Auth } from '../auth/auth.entity';
import { User } from '../user/user.entity';
import { Store } from './entities/store.entity';

@Controller('stores')
export class StoreServiceController {
  constructor(private readonly service: StoreService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async create(@Body() data: CreateStoreDto, @AuthDec() auth: Auth) {
    return this.service.create(auth, data);
  }

  @Get('my')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async getMyStores(@UserDecorator() user: User) {
    return this.service.findByOwner(user.id);
  }

  @Get('nearby')
  async getNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius?: number,
  ) {
    const normalizedRadius = radius !== undefined ? Number(radius) : undefined;
    return this.service.findNearby(Number(lat), Number(lng), normalizedRadius);
  }

  @Get('prime')
  async getPrime(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius?: number,
  ) {
    const normalizedRadius = radius !== undefined ? Number(radius) : undefined;
    return this.service.findPrime(Number(lat), Number(lng), normalizedRadius);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() data: Partial<Store>,
    @AuthDec() auth: Auth,
  ) {
    return this.service.update(id, auth, data);
  }

  @Get(':id/delivery-quote')
  async getDeliveryQuote(
    @Param('id') id: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.service.getDeliveryQuote(id, Number(lat), Number(lng));
  }

  @Put(':id/delivery-settings')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async updateDeliverySettings(
    @Param('id') id: string,
    @Body() data: UpdateDeliverySettingsDto,
    @AuthDec() auth: Auth,
  ) {
    return this.service.updateDeliverySettings(id, auth, data);
  }

  @Put(':id/working-hours')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async updateWorkingHours(
    @Param('id') id: string,
    @Body()
    hours: {
      day_of_week: DayOfWeek;
      open_time: string;
      close_time: string;
      is_open: boolean;
    }[],
    @AuthDec() auth: Auth,
  ) {
    return this.service.updateWorkingHours(id, auth, hours);
  }

  @Put(':id/active')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async setActive(
    @Param('id') id: string,
    @Body('is_active') isActive: boolean,
    @AuthDec() auth: Auth,
  ) {
    return this.service.setActive(id, auth, isActive);
  }

  @Put(':id/prime')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  async setPrime(
    @Param('id') id: string,
    @Body('is_prime') isPrime: boolean,
    @AuthDec() auth: Auth,
  ) {
    return this.service.setPrime(id, auth, isPrime);
  }

  @Get()
  async getAll(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (q !== undefined || page !== undefined || limit !== undefined) {
      return this.service.findAdminCatalog({
        q,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      });
    }

    return this.service.findAll();
  }
}
