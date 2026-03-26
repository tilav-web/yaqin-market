import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { JwtTypeEnum } from 'src/enums/jwt-type.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    const jwtSecret = configService.get('JWT_SECRET') as string;

    if (!jwtSecret) {
      throw new BadRequestException('JWT SECRET not found check your .env');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: {
    id: string;
    role: AuthRoleEnum;
    type: JwtTypeEnum;
  }) {
    if (payload.type !== JwtTypeEnum.ACCESS)
      throw new UnauthorizedException('There is an error in the token.');

    if (!payload.id) {
      throw new UnauthorizedException('User not found!');
    }

    const auth = await this.authService.findAuthWithUser(payload.id);
    return auth;
  }
}
