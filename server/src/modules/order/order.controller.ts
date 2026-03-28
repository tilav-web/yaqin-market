import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserDecorator } from '../auth/decorators/user.decorator';
import { OrderStatus } from './entities/order.entity';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { AuthDec } from '../auth/decorators/user.decorator';
import { CreateBroadcastRequestDto } from './dto/create-broadcast-request.dto';
import { CreateBroadcastOfferDto } from './dto/create-broadcast-offer.dto';
import { SelectBroadcastOfferDto } from './dto/select-broadcast-offer.dto';
import { User } from '../user/user.entity';
import { Auth } from '../auth/auth.entity';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  private getManagedStoreId(user: User) {
    const storeId = user.stores?.[0]?.id;

    if (!storeId) {
      throw new Error('Store not found');
    }

    return storeId;
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    AuthRoleEnum.CUSTOMER,
    AuthRoleEnum.SELLER,
    AuthRoleEnum.COURIER,
    AuthRoleEnum.SUPER_ADMIN,
  )
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @UserDecorator() user: User,
  ) {
    return this.orderService.create(createOrderDto, user.id);
  }

  @Get('my')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    AuthRoleEnum.CUSTOMER,
    AuthRoleEnum.SELLER,
    AuthRoleEnum.COURIER,
    AuthRoleEnum.SUPER_ADMIN,
  )
  async getMyOrders(
    @UserDecorator() user: User,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orderService.findByCustomer(user.id, status);
  }

  @Get('store/my')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async getMyStoreOrders(
    @UserDecorator() user: User,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orderService.findByStore(this.getManagedStoreId(user), status);
  }

  @Get('courier/nearby')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.COURIER, AuthRoleEnum.SUPER_ADMIN)
  async getNearbyOrders(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius: number = 10,
  ) {
    return this.orderService.findNearbyOrders(
      Number(lat),
      Number(lng),
      Number(radius),
    );
  }

  @Get('courier/my')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.COURIER, AuthRoleEnum.SUPER_ADMIN)
  async getMyDeliveryOrders(
    @UserDecorator() user: User,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orderService.findByCourier(user.id, status);
  }

  @Get('broadcast-requests/my')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    AuthRoleEnum.CUSTOMER,
    AuthRoleEnum.SELLER,
    AuthRoleEnum.COURIER,
    AuthRoleEnum.SUPER_ADMIN,
  )
  async getMyBroadcastRequests(@UserDecorator() user: User) {
    return this.orderService.findMyBroadcastRequests(user.id);
  }

  @Get('broadcast-requests/store/feed')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async getBroadcastFeed(
    @UserDecorator() user: User,
    @Query('radius') radius: number = 10,
  ) {
    return this.orderService.findStoreBroadcastFeed(user.id, Number(radius));
  }

  @Post('broadcast-requests')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    AuthRoleEnum.CUSTOMER,
    AuthRoleEnum.SELLER,
    AuthRoleEnum.COURIER,
    AuthRoleEnum.SUPER_ADMIN,
  )
  async createBroadcastRequest(
    @Body() dto: CreateBroadcastRequestDto,
    @UserDecorator() user: User,
  ) {
    return this.orderService.createBroadcastRequest(dto, user.id);
  }

  @Get('broadcast-requests/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    AuthRoleEnum.CUSTOMER,
    AuthRoleEnum.SELLER,
    AuthRoleEnum.COURIER,
    AuthRoleEnum.SUPER_ADMIN,
  )
  async getBroadcastRequestById(
    @Param('id') id: string,
    @AuthDec() auth: Auth,
    @UserDecorator() user: User,
  ) {
    return this.orderService.findBroadcastRequestById(id, user.id, auth.role);
  }

  @Get('broadcast-requests/:id/offers')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    AuthRoleEnum.CUSTOMER,
    AuthRoleEnum.SELLER,
    AuthRoleEnum.COURIER,
    AuthRoleEnum.SUPER_ADMIN,
  )
  async getBroadcastOffers(
    @Param('id') id: string,
    @AuthDec() auth: Auth,
    @UserDecorator() user: User,
  ) {
    return this.orderService.findBroadcastOffers(id, user.id, auth.role);
  }

  @Post('broadcast-requests/:id/offers')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async createBroadcastOffer(
    @Param('id') id: string,
    @Body() dto: CreateBroadcastOfferDto,
    @UserDecorator() user: User,
  ) {
    return this.orderService.createOrUpdateBroadcastOffer(id, user.id, dto);
  }

  @Post('broadcast-requests/:id/select-offer')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    AuthRoleEnum.CUSTOMER,
    AuthRoleEnum.SELLER,
    AuthRoleEnum.COURIER,
    AuthRoleEnum.SUPER_ADMIN,
  )
  async selectBroadcastOffer(
    @Param('id') id: string,
    @Body() dto: SelectBroadcastOfferDto,
    @UserDecorator() user: User,
  ) {
    return this.orderService.selectBroadcastOffer(
      id,
      dto.offer_id,
      user.id,
      dto.payment_method,
    );
  }

  @Post(':id/accept')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async acceptOrder(@Param('id') id: string, @UserDecorator() user: User) {
    return this.orderService.acceptOrder(id, this.getManagedStoreId(user));
  }

  @Post(':id/ready')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async readyOrder(
    @Param('id') id: string,
    @Body('note') note: string,
    @UserDecorator() user: User,
  ) {
    return this.orderService.readyOrder(id, this.getManagedStoreId(user), note);
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.SELLER, AuthRoleEnum.SUPER_ADMIN)
  async cancelOrder(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @UserDecorator() user: User,
  ) {
    return this.orderService.cancelOrder(
      id,
      this.getManagedStoreId(user),
      reason,
    );
  }

  @Post(':id/deliver')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.COURIER, AuthRoleEnum.SUPER_ADMIN)
  async deliverOrder(@Param('id') id: string, @UserDecorator() user: User) {
    return this.orderService.deliverOrder(id, user.id);
  }

  @Post(':id/assign-courier')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(AuthRoleEnum.COURIER, AuthRoleEnum.SUPER_ADMIN)
  async assignCourier(@Param('id') id: string, @UserDecorator() user: User) {
    return this.orderService.assignCourier(id, user.id);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.orderService.findById(id);
  }
}
