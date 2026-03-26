import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentProvider } from './payment.entity';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create')
  @UseGuards(AuthGuard)
  async create(
    @Body('order_id') orderId: string,
    @Body('provider') provider: PaymentProvider,
  ) {
    return this.paymentService.createPayment(orderId, provider);
  }

  @Post('click/prepare')
  async clickPrepare(@Body() payload: any) {
    return this.paymentService.prepareClick(payload);
  }

  @Post('click/complete')
  async clickComplete(@Body() payload: any) {
    return this.paymentService.completeClick(payload);
  }

  @Post('payme')
  async paymeCheck(@Body() payload: any) {
    return this.paymentService.checkPayme(payload);
  }
}
