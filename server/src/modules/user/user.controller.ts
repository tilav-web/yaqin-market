import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { User } from './user.entity';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  async findAll(
    @Query('q') q?: string,
    @Query('role') role?: AuthRoleEnum,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (
      q !== undefined ||
      role !== undefined ||
      page !== undefined ||
      limit !== undefined
    ) {
      return this.userService.findAdminCatalog({
        q,
        role,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      });
    }

    return this.userService.findAll();
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@UserDecorator() user: User) {
    return this.userService.getCurrentUser(user.id);
  }

  @Put('me')
  @UseGuards(AuthGuard)
  async updateProfile(
    @UserDecorator() user: User,
    @Body() data: { first_name?: string; last_name?: string },
  ) {
    return this.userService.updateProfile(user.id, data);
  }

  @Put(':id/role')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  async updateRole(@Param('id') id: string, @Body('role') role: AuthRoleEnum) {
    return this.userService.updateRole(id, role);
  }
}
