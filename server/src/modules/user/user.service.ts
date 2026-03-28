import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { User } from './user.entity';
import { Auth } from '../auth/auth.entity';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
  ) {}

  async findAll() {
    return this.userRepo.find({
      relations: ['auth', 'stores'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAdminCatalog(
    query: {
      q?: string;
      role?: AuthRoleEnum;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page =
      Number.isFinite(query.page) && Number(query.page) > 0
        ? Math.floor(Number(query.page))
        : 1;
    const limit =
      Number.isFinite(query.limit) && Number(query.limit) > 0
        ? Math.min(24, Math.floor(Number(query.limit)))
        : 10;
    const search = query.q?.trim();

    const baseQuery = this.userRepo
      .createQueryBuilder('user')
      .leftJoin('user.auth', 'auth')
      .leftJoin('user.stores', 'store')
      .distinct(true);

    if (query.role) {
      baseQuery.andWhere('auth.role = :role', { role: query.role });
    }

    if (search) {
      const normalizedSearch = `%${search.toLowerCase()}%`;
      baseQuery
        .andWhere(
          new Brackets((userQuery) => {
            userQuery
              .where('LOWER(user.first_name) LIKE :search')
              .orWhere('LOWER(user.last_name) LIKE :search')
              .orWhere("LOWER(COALESCE(auth.phone, '')) LIKE :search")
              .orWhere("LOWER(COALESCE(store.name, '')) LIKE :search");
          }),
        )
        .setParameter('search', normalizedSearch);
    }

    const countByRole = (role: AuthRoleEnum) =>
      baseQuery.clone().andWhere('auth.role = :summaryRole', { summaryRole: role }).getCount();

    const [total, customers, sellers, couriers, admins] = await Promise.all([
      baseQuery.clone().getCount(),
      countByRole(AuthRoleEnum.CUSTOMER),
      countByRole(AuthRoleEnum.SELLER),
      countByRole(AuthRoleEnum.COURIER),
      countByRole(AuthRoleEnum.SUPER_ADMIN),
    ]);

    const rows = await baseQuery
      .clone()
      .select('user.id', 'id')
      .addSelect('user.createdAt', 'createdAt')
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: string; createdAt: string }>();

    const ids = rows.map((row) => row.id).filter(Boolean);

    if (!ids.length) {
      return {
        items: [],
        meta: {
          page,
          limit,
          total,
          totalPages: total ? Math.ceil(total / limit) : 0,
          hasMore: false,
        },
        summary: {
          total,
          customers,
          sellers,
          couriers,
          admins,
        },
      };
    }

    const items = await this.userRepo.find({
      where: { id: In(ids) } as any,
      relations: ['auth', 'stores'],
    });

    const sortOrder = new Map(ids.map((id, index) => [id, index]));
    items.sort(
      (left, right) =>
        (sortOrder.get(left.id) ?? 0) - (sortOrder.get(right.id) ?? 0),
    );

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: total ? Math.ceil(total / limit) : 0,
        hasMore: page * limit < total,
      },
      summary: {
        total,
        customers,
        sellers,
        couriers,
        admins,
      },
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['auth'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(
    userId: string,
    data: { first_name?: string; last_name?: string },
  ) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['auth'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, data);
    return this.userRepo.save(user);
  }

  async updateRole(userId: string, role: AuthRoleEnum) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['auth'],
    });

    if (!user?.auth) {
      throw new NotFoundException('User auth not found');
    }

    user.auth.role = role;
    await this.authRepo.save(user.auth);

    return this.getCurrentUser(userId);
  }
}
