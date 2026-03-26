import {
  createParamDecorator,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { Auth } from '../auth.entity';
import { User } from '../../user/user.entity';

export const AuthDec = createParamDecorator((_, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request>();
  if (!req.user) throw new NotFoundException('User not found!');
  return req.user as Auth;
});

export const UserDecorator = createParamDecorator((_, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request>();
  if (!req.user) throw new NotFoundException('User not found!');
  const auth = req.user as Auth;
  if (!auth.user) throw new NotFoundException('User not found!');
  return auth.user as User;
});
