import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { User } from '../user/user.entity';

@Controller('wallet')
@UseGuards(AuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  async getBalance(@UserDecorator() user: User) {
    return this.walletService.getBalance(user.id);
  }

  @Post('topup')
  async topup(
    @UserDecorator() user: User,
    @Body('amount') amount: number,
    @Body('description') description?: string,
  ) {
    return this.walletService.topup(user.id, Number(amount), description);
  }

  /** Seller uchun — qaytimlardan yig'ilgan jami summa */
  @Get('waived-changes')
  async getWaivedChanges(@UserDecorator() user: User) {
    return this.walletService.getWaivedChangeTotal(user.id);
  }

  @Get('transactions')
  async getTransactions(
    @UserDecorator() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.walletService.getTransactions(
      user.id,
      Number(page),
      Number(limit),
    );
  }
}
