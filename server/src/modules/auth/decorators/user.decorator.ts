import {
  createParamDecorator,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { Auth } from '../auth.entity';

type AuthenticatedRequest = Request & {
  user?: Auth;
};

export const AuthDec = createParamDecorator((_, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  const auth = req.user;

  if (!auth) {
    throw new NotFoundException('User not found!');
  }

  return auth as Auth;
});

export const UserDecorator = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const auth = req.user;

    if (!auth) {
      throw new NotFoundException('User not found!');
    }

    if (!auth.user) throw new NotFoundException('User not found!');

    return auth.user;
  },
);
