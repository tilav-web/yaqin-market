import {
  Controller,
  Body,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentService } from './payment.service';
import { PaymentProvider } from './payment.entity';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { ClickWebhookDto } from './dto/click-webhook.dto';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('create')
  @UseGuards(AuthGuard)
  async create(
    @Body('order_id') orderId: string,
    @Body('provider') provider: PaymentProvider,
  ) {
    return this.paymentService.createPayment(orderId, provider);
  }

  @Get('click/url')
  @UseGuards(AuthGuard)
  async getClickUrl(
    @Query('order_id') orderId: string,
    @UserDecorator() user: { id: string },
  ) {
    return this.paymentService.getClickPaymentUrl(orderId, user.id);
  }

  @Post('click/prepare')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/json')
  async clickPrepare(@Body() payload: ClickWebhookDto, @Req() req: Request) {
    if (!this.isAllowedIp(req)) {
      return this.blockByIp(req);
    }

    return this.paymentService.prepareClick(payload);
  }

  @Post('click/complete')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/json')
  async clickComplete(@Body() payload: ClickWebhookDto, @Req() req: Request) {
    if (!this.isAllowedIp(req)) {
      return this.blockByIp(req);
    }

    return this.paymentService.completeClick(payload);
  }

  @Post('payme')
  async paymeCheck(
    @Body()
    payload: {
      id: number;
      method: string;
      params: Record<string, unknown>;
    },
  ) {
    return this.paymentService.checkPayme(payload);
  }

  private isAllowedIp(req?: Request): boolean {
    const ip = this.resolveClientIp(req);
    const allowedIps = this.getAllowedIps();

    if (allowedIps === null) {
      return true;
    }

    if (!ip) {
      return false;
    }

    return allowedIps.has(ip);
  }

  private blockByIp(req?: Request) {
    const ip = this.resolveClientIp(req);
    this.logger.warn(
      `Blocked CLICK webhook from unauthorized ip=${ip ?? 'unknown'}`,
    );

    return this.paymentService.getClickErrorResponse(-8, 'IP_NOT_ALLOWED');
  }

  private resolveClientIp(req?: Request): string | null {
    if (!req) {
      return null;
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const headerValue = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;
    const candidateFromHeader = headerValue?.split(',')[0]?.trim();
    const rawIp = candidateFromHeader || req.ip || req.socket?.remoteAddress;

    if (!rawIp) {
      return null;
    }

    return this.normalizeIp(rawIp);
  }

  private normalizeIp(ip: string) {
    if (ip.startsWith('::ffff:')) {
      return ip.replace('::ffff:', '');
    }

    return ip;
  }

  private getAllowedIps(): Set<string> | null {
    const envIps = process.env.CLICK_ALLOWED_IPS;

    if (!envIps || envIps.trim() === '') {
      return null;
    }

    const parsed = envIps
      .split(',')
      .map((ip) => this.normalizeIp(ip.trim()))
      .filter(Boolean);

    if (parsed.length === 0) {
      return null;
    }

    return new Set(parsed);
  }
}
