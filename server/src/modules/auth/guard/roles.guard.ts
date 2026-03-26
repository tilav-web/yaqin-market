import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import type { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AuthRoleEnum[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { role?: AuthRoleEnum } | undefined;

    if (!user) throw new UnauthorizedException('Unauthorized');
    if (!user.role || !roles.includes(user.role)) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}
