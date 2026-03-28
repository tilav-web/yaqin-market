import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { User } from '../user/user.entity';

@Controller('locations')
@UseGuards(AuthGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('my')
  async getMyLocations(@UserDecorator() user: User) {
    return this.locationService.findByUser(user.id);
  }

  @Post()
  async create(@UserDecorator() user: User, @Body() dto: CreateLocationDto) {
    return this.locationService.create(user.id, dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @UserDecorator() user: User,
    @Body() data: Partial<CreateLocationDto>,
  ) {
    return this.locationService.update(id, user.id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @UserDecorator() user: User) {
    return this.locationService.remove(id, user.id);
  }

  @Put(':id/default')
  async setDefault(@Param('id') id: string, @UserDecorator() user: User) {
    return this.locationService.setDefault(id, user.id);
  }
}
