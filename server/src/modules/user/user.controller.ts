import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(AuthGuard)
  async findAll() {
    return this.userService.findAll();
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@UserDecorator() user: any) {
    return this.userService.getCurrentUser(user.id);
  }

  @Put('me')
  @UseGuards(AuthGuard)
  async updateProfile(
    @UserDecorator() user: any,
    @Body() data: { first_name?: string; last_name?: string },
  ) {
    return this.userService.updateProfile(user.id, data);
  }
}
