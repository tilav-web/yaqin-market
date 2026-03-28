import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { CreateSellerApplicationDto } from './dto/create-seller-application.dto';
import { CreateCourierApplicationDto } from './dto/create-courier-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';

@Controller('applications')
@UseGuards(AuthGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get('me')
  async getMyApplications(@UserDecorator() user: any) {
    return this.applicationService.getMyApplications(user.id);
  }

  @Post('seller')
  async submitSellerApplication(
    @UserDecorator() user: any,
    @Body() dto: CreateSellerApplicationDto,
  ) {
    return this.applicationService.submitSellerApplication(user.id, dto);
  }

  @Post('courier')
  async submitCourierApplication(
    @UserDecorator() user: any,
    @Body() dto: CreateCourierApplicationDto,
  ) {
    return this.applicationService.submitCourierApplication(user.id, dto);
  }

  @Get('seller')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  async getSellerApplications() {
    return this.applicationService.getSellerApplications();
  }

  @Put('seller/:id/review')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  async reviewSellerApplication(
    @Param('id') id: string,
    @UserDecorator() user: any,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.applicationService.reviewSellerApplication(id, user.id, dto);
  }

  @Get('courier/store/my')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER)
  async getStoreCourierApplications(@UserDecorator() user: any) {
    return this.applicationService.getCourierApplicationsForSeller(user.id);
  }

  @Put('courier/:id/review')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER)
  async reviewCourierApplication(
    @Param('id') id: string,
    @UserDecorator() user: any,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.applicationService.reviewCourierApplication(id, user.id, dto);
  }
}
