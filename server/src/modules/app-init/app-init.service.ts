import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Auth } from '../auth/auth.entity';
import { User } from '../user/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { Unit } from '../unit/unit.entity';
import { Category } from '../category/category.entity';

const DEFAULT_UNITS = [
  { name: { uz: 'Dona', ru: 'Штука' }, short_name: { uz: 'dona', ru: 'шт' } },
  { name: { uz: 'Kilogramm', ru: 'Килограмм' }, short_name: { uz: 'kg', ru: 'кг' } },
  { name: { uz: 'Gramm', ru: 'Грамм' }, short_name: { uz: 'g', ru: 'г' } },
  { name: { uz: 'Litr', ru: 'Литр' }, short_name: { uz: 'l', ru: 'л' } },
  { name: { uz: 'Millilitr', ru: 'Миллилитр' }, short_name: { uz: 'ml', ru: 'мл' } },
  { name: { uz: 'Metr', ru: 'Метр' }, short_name: { uz: 'm', ru: 'м' } },
  { name: { uz: 'Santimetr', ru: 'Сантиметр' }, short_name: { uz: 'sm', ru: 'см' } },
  { name: { uz: 'Qadoq', ru: 'Упаковка' }, short_name: { uz: 'qad.', ru: 'уп.' } },
  { name: { uz: 'Paket', ru: 'Пакет' }, short_name: { uz: 'pkt.', ru: 'пкт.' } },
  { name: { uz: "Bog'lam", ru: 'Связка' }, short_name: { uz: "bog'.", ru: 'св.' } },
  { name: { uz: 'Quti', ru: 'Коробка' }, short_name: { uz: 'quti', ru: 'кор.' } },
  { name: { uz: 'Butilka', ru: 'Бутылка' }, short_name: { uz: 'but.', ru: 'бут.' } },
  { name: { uz: 'Tonna', ru: 'Тонна' }, short_name: { uz: 't', ru: 'т' } },
  { name: { uz: 'Juft (par)', ru: 'Пара' }, short_name: { uz: 'juft', ru: 'пар.' } },
  { name: { uz: "O'ram", ru: 'Рулон' }, short_name: { uz: "o'r.", ru: 'рул.' } },
];

const DEFAULT_CATEGORIES = [
  { name: { uz: 'Meva va sabzavot', ru: 'Фрукты и овощи' }, slug: 'meva-va-sabzavot', order_number: 1 },
  { name: { uz: 'Sut mahsulotlari', ru: 'Молочные продукты' }, slug: 'sut-mahsulotlari', order_number: 2 },
  { name: { uz: 'Ichimliklar', ru: 'Напитки' }, slug: 'ichimliklar', order_number: 3 },
  { name: { uz: 'Bakaleya', ru: 'Бакалея' }, slug: 'bakaleya', order_number: 4 },
  { name: { uz: "Go'sht va baliq", ru: 'Мясо и рыба' }, slug: 'gosht-va-baliq', order_number: 5 },
  { name: { uz: 'Non va pishiriqlar', ru: 'Хлеб и выпечка' }, slug: 'non-va-pishiriqlar', order_number: 6 },
  { name: { uz: 'Shirinlik va snack', ru: 'Сладости и снеки' }, slug: 'shirinlik-va-snack', order_number: 7 },
  { name: { uz: 'Muzlatilgan mahsulotlar', ru: 'Замороженные продукты' }, slug: 'muzlatilgan', order_number: 8 },
  { name: { uz: 'Konserva va sous', ru: 'Консервы и соусы' }, slug: 'konserva-va-sous', order_number: 9 },
  { name: { uz: 'Ziravorlar', ru: 'Специи и приправы' }, slug: 'ziravorlar', order_number: 10 },
  { name: { uz: "Uy-ro'zg'or", ru: 'Товары для дома' }, slug: 'uy-rozgor', order_number: 11 },
  { name: { uz: 'Shaxsiy gigiyena', ru: 'Личная гигиена' }, slug: 'shaxsiy-gigiyena', order_number: 12 },
  { name: { uz: 'Bolalar uchun', ru: 'Детские товары' }, slug: 'bolalar-uchun', order_number: 13 },
  { name: { uz: 'Uy hayvonlari', ru: 'Товары для животных' }, slug: 'uy-hayvonlari', order_number: 14 },
  { name: { uz: 'Choy va qahva', ru: 'Чай и кофе' }, slug: 'choy-va-qahva', order_number: 15 },
  { name: { uz: "Yog' va sariyog'", ru: 'Масло и маргарин' }, slug: 'yog-va-sariyog', order_number: 16 },
  { name: { uz: 'Tuxum', ru: 'Яйца' }, slug: 'tuxum', order_number: 17 },
  { name: { uz: 'Makaronlar', ru: 'Макаронные изделия' }, slug: 'makaronlar', order_number: 18 },
];

@Injectable()
export class AppInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppInitService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureSuperAdmin();
    await this.seedUnits();
    await this.seedCategories();
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

  private async seedUnits() {
    const repo = this.dataSource.getRepository(Unit);
    const existing = await repo.count();
    if (existing > 0) return; // allaqachon bor — o'tkazib yuboramiz

    for (const seed of DEFAULT_UNITS) {
      await repo.save(repo.create(seed));
    }
    this.logger.log(`Default units yaratildi: ${DEFAULT_UNITS.length} ta`);
  }

  private async seedCategories() {
    const repo = this.dataSource.getRepository(Category);
    const existing = await repo.count();
    if (existing > 0) return; // allaqachon bor — o'tkazib yuboramiz

    for (const seed of DEFAULT_CATEGORIES) {
      await repo.save(repo.create(seed));
    }
    this.logger.log(`Default kategoriyalar yaratildi: ${DEFAULT_CATEGORIES.length} ta`);
  }
}
