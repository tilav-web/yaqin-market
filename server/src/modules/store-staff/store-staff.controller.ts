import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { User } from '../user/user.entity';
import { StoreStaffService } from './store-staff.service';
import { InviteStaffDto, RespondInvitationDto } from './dto/invite-staff.dto';
import { StaffRole } from './entities/store-staff.entity';

@Controller('store-staff')
@UseGuards(AuthGuard)
export class StoreStaffController {
  constructor(private readonly staffService: StoreStaffService) {}

  // ─── Seller: user qidirish ───────────────────────────────────────────────
  @Get('search-users')
  async searchUsers(
    @Query('q') q: string,
    @Query('store_id') storeId: string,
    @UserDecorator() user: User,
  ) {
    // assertCanManageStaff controller ichida
    await this.staffService.assertCanManageStaff(user.id, storeId);
    return this.staffService.searchUsers(q, storeId);
  }

  // ─── Seller: invite ──────────────────────────────────────────────────────
  @Post('invitations')
  async invite(@UserDecorator() user: User, @Body() dto: InviteStaffDto) {
    return this.staffService.invite(user.id, dto);
  }

  @Delete('invitations/:id')
  async cancelInvitation(@UserDecorator() user: User, @Param('id') id: string) {
    return this.staffService.cancelInvitation(user.id, id);
  }

  @Get('invitations/store/:storeId')
  async listStoreInvitations(
    @UserDecorator() user: User,
    @Param('storeId') storeId: string,
  ) {
    return this.staffService.listStoreInvitations(user.id, storeId);
  }

  // ─── User (invitee) ──────────────────────────────────────────────────────
  @Get('invitations/my')
  async myInvitations(@UserDecorator() user: User) {
    return this.staffService.myInvitations(user.id);
  }

  @Post('invitations/:id/respond')
  async respond(
    @UserDecorator() user: User,
    @Param('id') id: string,
    @Body() dto: RespondInvitationDto,
  ) {
    return this.staffService.respond(user.id, id, dto.action);
  }

  // ─── Xodim ro'yxati (Seller panel) ───────────────────────────────────────
  @Get('stores/:storeId')
  async listStoreStaff(
    @UserDecorator() user: User,
    @Param('storeId') storeId: string,
  ) {
    return this.staffService.listStoreStaff(user.id, storeId);
  }

  @Put('stores/:storeId/staff/:userId/role')
  async updateRole(
    @UserDecorator() user: User,
    @Param('storeId') storeId: string,
    @Param('userId') userId: string,
    @Body('role') role: StaffRole,
  ) {
    return this.staffService.updateRole(user.id, storeId, userId, role);
  }

  @Delete('stores/:storeId/staff/:userId')
  async removeStaff(
    @UserDecorator() user: User,
    @Param('storeId') storeId: string,
    @Param('userId') userId: string,
  ) {
    return this.staffService.removeStaff(user.id, storeId, userId);
  }

  // ─── User: men qaysi do'konlarda xodimman ────────────────────────────────
  @Get('my-stores')
  async myStores(@UserDecorator() user: User) {
    return this.staffService.myStores(user.id);
  }
}
