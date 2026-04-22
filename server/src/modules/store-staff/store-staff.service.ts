import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  StoreStaff,
  StaffRole,
} from './entities/store-staff.entity';
import {
  StoreStaffInvitation,
  InvitationStatus,
} from './entities/store-staff-invitation.entity';
import { Store } from '../store/entities/store.entity';
import { User } from '../user/user.entity';
import { Auth } from '../auth/auth.entity';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { NotificationService } from '../notification/notification.service';
import { InviteStaffDto } from './dto/invite-staff.dto';

const INVITATION_TTL_DAYS = 7;

@Injectable()
export class StoreStaffService {
  constructor(
    @InjectRepository(StoreStaff)
    private readonly staffRepo: Repository<StoreStaff>,
    @InjectRepository(StoreStaffInvitation)
    private readonly invRepo: Repository<StoreStaffInvitation>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
    private readonly notificationService: NotificationService,
  ) {}

  // ─── Seller: user qidirish (invite uchun) ───────────────────────────────
  async searchUsers(q: string, storeId: string) {
    const search = (q ?? '').trim();
    if (search.length < 2) return [];

    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.auth', 'auth')
      .leftJoin(
        'store_staff',
        's',
        's.user_id = u.id AND s.store_id = :sid AND s.is_active = true',
        { sid: storeId },
      )
      .where('s.id IS NULL') // hozir xodim bo'lmaganlar
      .andWhere('auth.role = :role', { role: AuthRoleEnum.CUSTOMER });

    const normalized = search.replace(/\D/g, '');
    if (normalized.length >= 3) {
      qb.andWhere(
        '(LOWER(u.first_name) LIKE :s OR LOWER(u.last_name) LIKE :s OR auth.phone LIKE :p)',
        { s: `%${search.toLowerCase()}%`, p: `%${normalized}%` },
      );
    } else {
      qb.andWhere(
        '(LOWER(u.first_name) LIKE :s OR LOWER(u.last_name) LIKE :s)',
        { s: `%${search.toLowerCase()}%` },
      );
    }

    return qb.take(20).getMany();
  }

  // ─── Invite yuborish ─────────────────────────────────────────────────────
  async invite(actorUserId: string, dto: InviteStaffDto) {
    const store = await this.storeRepo.findOne({ where: { id: dto.store_id } });
    if (!store) throw new NotFoundException('Do\'kon topilmadi');

    await this.assertCanManageStaff(actorUserId, dto.store_id);

    if (actorUserId === dto.invitee_id) {
      throw new BadRequestException('O\'zingizni qo\'shib bo\'lmaydi');
    }

    const invitee = await this.userRepo.findOne({ where: { id: dto.invitee_id } });
    if (!invitee) throw new NotFoundException('User topilmadi');

    // Allaqachon xodim?
    const existingStaff = await this.staffRepo.findOne({
      where: {
        store_id: dto.store_id,
        user_id: dto.invitee_id,
        is_active: true,
      },
    });
    if (existingStaff) {
      throw new BadRequestException('Bu user allaqachon xodim');
    }

    // Pending invitation?
    const pending = await this.invRepo.findOne({
      where: {
        store_id: dto.store_id,
        invitee_id: dto.invitee_id,
        status: InvitationStatus.PENDING,
      },
    });
    if (pending) {
      throw new BadRequestException('Bu user uchun faol taklif mavjud');
    }

    // OWNER role'ni invite qilib bo'lmaydi
    if (dto.role === StaffRole.OWNER) {
      throw new BadRequestException('OWNER rolini invite qilib bo\'lmaydi');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

    const inv = this.invRepo.create({
      store_id: dto.store_id,
      inviter_id: actorUserId,
      invitee_id: dto.invitee_id,
      role: dto.role,
      message: dto.message ?? null,
      expires_at: expiresAt,
      status: InvitationStatus.PENDING,
    });
    const saved = await this.invRepo.save(inv);

    // Notification
    const roleLabel = this.roleLabel(dto.role);
    await this.notificationService.sendToUser(dto.invitee_id, {
      title: 'Yangi taklif',
      body: `"${store.name}" do'koni sizni ${roleLabel} qilib taklif qilmoqda`,
      data: {
        type: 'STAFF_INVITATION',
        invitation_id: saved.id,
        store_id: store.id,
        role: dto.role,
      },
    });

    return saved;
  }

  // ─── User: javob (accept/reject) ─────────────────────────────────────────
  async respond(
    userId: string,
    invitationId: string,
    action: 'ACCEPT' | 'REJECT',
  ) {
    const inv = await this.invRepo.findOne({
      where: { id: invitationId },
      relations: ['store'],
    });
    if (!inv) throw new NotFoundException('Taklif topilmadi');
    if (inv.invitee_id !== userId) throw new ForbiddenException();
    if (inv.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        'Bu taklif allaqachon javob berilgan yoki muddati o\'tgan',
      );
    }
    if (inv.expires_at < new Date()) {
      inv.status = InvitationStatus.EXPIRED;
      await this.invRepo.save(inv);
      throw new BadRequestException('Taklif muddati o\'tgan');
    }

    inv.status =
      action === 'ACCEPT'
        ? InvitationStatus.ACCEPTED
        : InvitationStatus.REJECTED;
    inv.responded_at = new Date();
    await this.invRepo.save(inv);

    if (action === 'ACCEPT') {
      // Staff yaratish
      const staff = this.staffRepo.create({
        store_id: inv.store_id,
        user_id: userId,
        role: inv.role,
        invited_by: inv.inviter_id,
        hired_at: new Date(),
        is_active: true,
      });
      await this.staffRepo.save(staff);

      // COURIER roli — auth.role ni ham COURIER qilib qo'yish (mobile app uchun)
      if (inv.role === StaffRole.COURIER) {
        await this.promoteAuthRole(userId, AuthRoleEnum.COURIER);
      } else {
        // MANAGER/OPERATOR/PACKER — seller panel uchun SELLER role
        await this.promoteAuthRole(userId, AuthRoleEnum.SELLER);
      }
    }

    // Inviter'ga xabar
    if (inv.inviter_id) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      const name = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
      await this.notificationService.sendToUser(inv.inviter_id, {
        title: action === 'ACCEPT' ? 'Taklif qabul qilindi' : 'Taklif rad etildi',
        body:
          action === 'ACCEPT'
            ? `${name} "${inv.store.name}" xodimi bo'lishni qabul qildi`
            : `${name} taklifingizni rad etdi`,
        data: {
          type: 'STAFF_INVITATION_RESPONSE',
          invitation_id: inv.id,
          store_id: inv.store_id,
          action,
        },
      });
    }

    return inv;
  }

  async cancelInvitation(actorUserId: string, invitationId: string) {
    const inv = await this.invRepo.findOne({ where: { id: invitationId } });
    if (!inv) throw new NotFoundException('Taklif topilmadi');
    if (inv.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Faqat PENDING takliflarni bekor qilish mumkin');
    }
    await this.assertCanManageStaff(actorUserId, inv.store_id);

    inv.status = InvitationStatus.CANCELLED;
    inv.responded_at = new Date();
    return this.invRepo.save(inv);
  }

  // ─── List endpoints ──────────────────────────────────────────────────────
  async listStoreStaff(actorUserId: string, storeId: string) {
    await this.assertStaffOrOwner(actorUserId, storeId);
    return this.staffRepo.find({
      where: { store_id: storeId, is_active: true },
      relations: ['user', 'user.auth'],
      order: { createdAt: 'ASC' },
    });
  }

  async listStoreInvitations(actorUserId: string, storeId: string) {
    await this.assertCanManageStaff(actorUserId, storeId);
    return this.invRepo.find({
      where: { store_id: storeId, status: InvitationStatus.PENDING },
      relations: ['invitee', 'invitee.auth'],
      order: { createdAt: 'DESC' },
    });
  }

  async myInvitations(userId: string) {
    // Avtomatik EXPIRED belgilash
    await this.invRepo
      .createQueryBuilder()
      .update(StoreStaffInvitation)
      .set({ status: InvitationStatus.EXPIRED })
      .where('invitee_id = :uid', { uid: userId })
      .andWhere('status = :st', { st: InvitationStatus.PENDING })
      .andWhere('expires_at < NOW()')
      .execute();

    return this.invRepo.find({
      where: {
        invitee_id: userId,
        status: InvitationStatus.PENDING,
      },
      relations: ['store', 'inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  async myStores(userId: string) {
    // User qaysi do'konlarda xodim — switch qilish uchun
    return this.staffRepo.find({
      where: { user_id: userId, is_active: true },
      relations: ['store'],
      order: { createdAt: 'ASC' },
    });
  }

  async removeStaff(actorUserId: string, storeId: string, targetUserId: string) {
    await this.assertCanManageStaff(actorUserId, storeId);

    const staff = await this.staffRepo.findOne({
      where: { store_id: storeId, user_id: targetUserId, is_active: true },
    });
    if (!staff) throw new NotFoundException('Xodim topilmadi');
    if (staff.role === StaffRole.OWNER) {
      throw new BadRequestException('OWNER rolini o\'chirib bo\'lmaydi');
    }

    staff.is_active = false;
    staff.terminated_at = new Date();
    await this.staffRepo.save(staff);

    // Xodimga notification
    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    await this.notificationService.sendToUser(targetUserId, {
      title: 'Xodimlikdan chetlatildingiz',
      body: `Siz endi "${store?.name ?? ''}" do'konining xodimi emassiz`,
      data: {
        type: 'STAFF_REMOVED',
        store_id: storeId,
      },
    });

    return { success: true };
  }

  async updateRole(
    actorUserId: string,
    storeId: string,
    targetUserId: string,
    newRole: StaffRole,
  ) {
    await this.assertCanManageStaff(actorUserId, storeId);
    if (newRole === StaffRole.OWNER) {
      throw new BadRequestException('OWNER rolini belgilab bo\'lmaydi');
    }

    const staff = await this.staffRepo.findOne({
      where: { store_id: storeId, user_id: targetUserId, is_active: true },
    });
    if (!staff) throw new NotFoundException('Xodim topilmadi');
    if (staff.role === StaffRole.OWNER) {
      throw new BadRequestException('OWNER rolini o\'zgartirib bo\'lmaydi');
    }

    staff.role = newRole;
    return this.staffRepo.save(staff);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** User shu do'konda xodimmi yoki egami? */
  async isStaffOrOwner(userId: string, storeId: string) {
    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    if (!store) return { isOwner: false, staff: null };

    if (store.owner_id === userId) return { isOwner: true, staff: null };

    const staff = await this.staffRepo.findOne({
      where: { store_id: storeId, user_id: userId, is_active: true },
    });
    return { isOwner: false, staff };
  }

  async assertStaffOrOwner(userId: string, storeId: string) {
    const { isOwner, staff } = await this.isStaffOrOwner(userId, storeId);
    if (!isOwner && !staff) {
      throw new ForbiddenException('Sizda bu do\'kon uchun huquq yo\'q');
    }
    return { isOwner, staff };
  }

  /** Xodim boshqarish (invite/remove) — faqat OWNER yoki MANAGER */
  async assertCanManageStaff(userId: string, storeId: string) {
    const { isOwner, staff } = await this.isStaffOrOwner(userId, storeId);
    if (!isOwner && (!staff || staff.role !== StaffRole.MANAGER)) {
      throw new ForbiddenException(
        'Faqat do\'kon egasi yoki MANAGER xodim boshqaradi',
      );
    }
    return { isOwner, staff };
  }

  private roleLabel(role: StaffRole) {
    return (
      {
        OWNER: 'egasi',
        MANAGER: 'boshqaruvchi',
        OPERATOR: 'operator',
        PACKER: 'yig\'uvchi',
        COURIER: 'kuryer',
      }[role] ?? role
    );
  }

  private async promoteAuthRole(userId: string, role: AuthRoleEnum) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['auth'],
    });
    if (!user?.auth) return;

    const currentRole = user.auth.role;
    // CUSTOMER < SELLER/COURIER < SUPER_ADMIN
    // Faqat CUSTOMER'dan boshqa rolga ko'tarish
    if (currentRole === AuthRoleEnum.CUSTOMER) {
      user.auth.role = role;
      await this.authRepo.save(user.auth);
    }
    // Agar SELLER va COURIER rol tayinlanmoqda — SELLER saqlaymiz (kuchliroq)
    // Agar COURIER va SELLER tayinlanmoqda — SELLER ga ko'taramiz
    else if (currentRole === AuthRoleEnum.COURIER && role === AuthRoleEnum.SELLER) {
      user.auth.role = AuthRoleEnum.SELLER;
      await this.authRepo.save(user.auth);
    }
  }
}
