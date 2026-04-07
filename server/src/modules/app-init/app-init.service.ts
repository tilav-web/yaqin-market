import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Auth } from '../auth/auth.entity';
import { User } from '../user/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';

@Injectable()
export class AppInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppInitService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureSuperAdmin();
  }

  private async ensureSuperAdmin() {
    const phone = this.config.get<string>('ADMIN_PHONE');
    const firstName = this.config.get<string>('ADMIN_FIRST_NAME') ?? 'Admin';
    const lastName = this.config.get<string>('ADMIN_LAST_NAME') ?? 'User';

    if (!phone) {
      this.logger.warn('ADMIN_PHONE not set in .env — skipping super admin init');
      return;
    }

    const authRepo = this.dataSource.getRepository(Auth);
    const userRepo = this.dataSource.getRepository(User);
    const walletRepo = this.dataSource.getRepository(Wallet);

    // Phone bo'yicha topamiz — unique bo'lgani uchun telefon o'zgarmaydi
    let auth = await authRepo.findOne({ where: { phone } });

    if (!auth) {
      auth = authRepo.create({ phone, role: AuthRoleEnum.SUPER_ADMIN, is_verified: true });
      auth = await authRepo.save(auth);
    } else if (auth.role !== AuthRoleEnum.SUPER_ADMIN || !auth.is_verified) {
      auth.role = AuthRoleEnum.SUPER_ADMIN;
      auth.is_verified = true;
      auth = await authRepo.save(auth);
    }

    let user = await userRepo.findOne({ where: { auth: { id: auth.id } } });
    if (!user) {
      user = userRepo.create({ first_name: firstName, last_name: lastName, auth });
      await userRepo.save(user);
      this.logger.log(`Super admin yaratildi: ${lastName} ${firstName} (${phone})`);
    }

    const wallet = await walletRepo.findOne({ where: { user: { id: user.id } } });
    if (!wallet) {
      await walletRepo.save(walletRepo.create({ balance: 0, frozen_balance: 0, user }));
    }
  }
}
