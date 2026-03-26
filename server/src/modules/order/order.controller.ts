import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { OrderStatus } from './entities/order.entity';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto, @UserDecorator() user: any) {
    return this.orderService.create(createOrderDto, user.id);
  }

  @Get('my')
  async getMyOrders(
    @UserDecorator() user: any,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orderService.findByCustomer(user.id, status);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.orderService.findById(id);
  }

  @Post(':id/accept')
  async acceptOrder(
    @Param('id') id: string,
    @UserDecorator() user: any,
  ) {
    const store = user.stores?.[0];
    if (!store) throw new Error('Store not found');
    return this.orderService.acceptOrder(id, store.id);
  }

  @Post(':id/ready')
  async readyOrder(
    @Param('id') id: string,
    @Body('note') note: string,
    @UserDecorator() user: any,
  ) {
    const store = user.stores?.[0];
    if (!store) throw new Error('Store not found');
    return this.orderService.readyOrder(id, store.id, note);
  }

  @Post(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @UserDecorator() user: any,
  ) {
    const store = user.stores?.[0];
    if (!store) throw new Error('Store not found');
    return this.orderService.cancelOrder(id, store.id, reason);
  }

  @Get('store/my')
  async getMyStoreOrders(
    @UserDecorator() user: any,
    @Query('status') status?: OrderStatus,
  ) {
    const store = user.stores?.[0];
    if (!store) throw new Error('Store not found');
    return this.orderService.findByStore(store.id, status);
  }

  @Get('courier/nearby')
  async getNearbyOrders(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius: number = 10,
  ) {
    return this.orderService.findNearbyOrders(Number(lat), Number(lng), Number(radius));
  }

  @Get('courier/my')
  async getMyDeliveryOrders(
    @UserDecorator() user: any,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orderService.findByCourier(user.id, status);
  }

  @Post(':id/deliver')
  async deliverOrder(@Param('id') id: string) {
    return this.orderService.deliverOrder(id);
  }

  @Post(':id/assign-courier')
  async assignCourier(
    @Param('id') id: string,
    @Body('courier_id') courierId: string,
  ) {
    return this.orderService.assignCourier(id, courierId);
  }
}
