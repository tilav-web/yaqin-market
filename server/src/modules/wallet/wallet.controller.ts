import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';

@Controller('wallet')
@UseGuards(AuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  async getBalance(@UserDecorator() user: any) {
    return this.walletService.getBalance(user.id);
  }

  @Post('topup')
  async topup(
    @UserDecorator() user: any,
    @Body('amount') amount: number,
    @Body('description') description?: string,
  ) {
    return this.walletService.topup(user.id, Number(amount), description);
  }

  @Get('transactions')
  async getTransactions(
    @UserDecorator() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.walletService.getTransactions(user.id, Number(page), Number(limit));
  }
}
