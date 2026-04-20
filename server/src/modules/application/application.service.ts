import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  RoleApplication,
  RoleApplicationStatus,
  RoleApplicationType,
} from './role-application.entity';
import { User } from '../user/user.entity';
import { Auth } from '../auth/auth.entity';
import { Store } from '../store/entities/store.entity';
import { CreateSellerApplicationDto } from './dto/create-seller-application.dto';
import { CreateCourierApplicationDto } from './dto/create-courier-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { StoreService } from '../store/store.service';
import { SellerLegal } from './seller-legal.entity';
import { SellerLegalDto } from './dto/seller-legal.dto';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(RoleApplication)
    private readonly applicationRepo: Repository<RoleApplication>,
    @InjectRepository(SellerLegal)
    private readonly sellerLegalRepo: Repository<SellerLegal>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    private readonly storeService: StoreService,
    private readonly walletService: WalletService,
  ) {}

  async getMyApplications(userId: string) {
    return this.applicationRepo.find({
      where: { user_id: userId },
      relations: ['requestedStore', 'approvedStore', 'sellerLegal'],
      order: { createdAt: 'DESC' },
    });
  }

  async submitSellerApplication(
    userId: string,
    dto: CreateSellerApplicationDto,
  ) {
    const user = await this.findUserWithAuth(userId);

    if (user.auth?.role === AuthRoleEnum.SELLER) {
      throw new BadRequestException("Siz allaqachon seller bo'lgansiz");
    }

    const application = await this.getOrCreateDraft(
      userId,
      RoleApplicationType.SELLER,
    );
    const sellerLegal = await this.upsertSellerLegal(userId, dto.legal);

    Object.assign(application, {
      phone: dto.phone.trim(),
      note: dto.note?.trim() || null,
      store_name: dto.store_name.trim(),
      owner_name:
        dto.owner_name?.trim() ||
        [user.first_name, user.last_name].join(' ').trim() ||
        null,
      legal_name: dto.legal_name?.trim() || null,
      seller_legal_id: sellerLegal.id,
      store_phone: dto.store_phone.trim(),
      store_address: dto.store_address?.trim() || null,
      store_lat: dto.store_lat ?? null,
      store_lng: dto.store_lng ?? null,
      requested_store_id: null,
      approved_store_id: null,
      transport_type: null,
      vehicle_number: null,
      status: RoleApplicationStatus.PENDING,
      reviewed_at: null,
      reviewed_by_user_id: null,
      rejection_reason: null,
    });

    if (!application.legal_name) {
      application.legal_name = sellerLegal.official_name;
    }

    return this.applicationRepo.save(application);
  }

  async submitCourierApplication(
    userId: string,
    dto: CreateCourierApplicationDto,
  ) {
    const user = await this.findUserWithAuth(userId);

    if (user.auth?.role === AuthRoleEnum.COURIER) {
      throw new BadRequestException("Siz allaqachon delivery bo'lgansiz");
    }

    const store = await this.storeRepo.findOne({
      where: { id: dto.requested_store_id },
      relations: ['owner'],
    });

    if (!store) {
      throw new NotFoundException("Tanlangan do'kon topilmadi");
    }

    const application = await this.getOrCreateDraft(
      userId,
      RoleApplicationType.COURIER,
    );

    Object.assign(application, {
      phone: dto.phone.trim(),
      note: dto.note?.trim() || null,
      requested_store_id: store.id,
      approved_store_id: null,
      transport_type: dto.transport_type?.trim() || null,
      vehicle_number: dto.vehicle_number?.trim() || null,
      store_name: null,
      owner_name: null,
      legal_name: null,
      store_phone: null,
      store_address: null,
      store_lat: null,
      store_lng: null,
      status: RoleApplicationStatus.PENDING,
      reviewed_at: null,
      reviewed_by_user_id: null,
      rejection_reason: null,
    });

    return this.applicationRepo.save(application);
  }

  async getSellerApplications() {
    return this.applicationRepo.find({
      where: { type: RoleApplicationType.SELLER },
      relations: ['user', 'user.auth', 'approvedStore', 'sellerLegal'],
      order: { createdAt: 'DESC' },
    });
  }

  async getCourierApplicationsForSeller(sellerId: string) {
    const stores = await this.storeRepo.find({
      where: { owner_id: sellerId },
      select: ['id'],
    });

    const storeIds = stores.map((store) => store.id);
    if (!storeIds.length) {
      return [];
    }

    return this.applicationRepo.find({
      where: {
        type: RoleApplicationType.COURIER,
        requested_store_id: In(storeIds),
      },
      relations: ['user', 'user.auth', 'requestedStore', 'approvedStore'],
      order: { createdAt: 'DESC' },
    });
  }

  async reviewSellerApplication(
    applicationId: string,
    reviewerId: string,
    dto: ReviewApplicationDto,
  ) {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId, type: RoleApplicationType.SELLER },
      relations: ['user', 'user.auth', 'approvedStore'],
    });

    if (!application?.user?.auth) {
      throw new NotFoundException('Seller application not found');
    }

    application.reviewed_by_user_id = reviewerId;
    application.reviewed_at = new Date();
    application.rejection_reason = dto.reason?.trim() || null;
    application.status = dto.status;

    if (dto.status === RoleApplicationStatus.APPROVED) {
      application.user.auth.role = AuthRoleEnum.SELLER;
      await this.authRepo.save(application.user.auth);

      if (!application.approved_store_id) {
        const store = await this.storeService.create(
          { role: AuthRoleEnum.SUPER_ADMIN } as Auth,
          {
            name:
              application.store_name || `${application.user.first_name} store`,
            slug: this.buildStoreSlug(
              application.store_name || application.user.first_name,
            ),
            owner_name:
              application.owner_name ||
              [application.user.first_name, application.user.last_name]
                .join(' ')
                .trim(),
            legal_name:
              application.sellerLegal?.official_name ||
              application.legal_name ||
              undefined,
            phone: application.store_phone || application.phone || '000000000',
            address: application.store_address || undefined,
            lat:
              application.store_lat !== null &&
              application.store_lat !== undefined
                ? Number(application.store_lat)
                : undefined,
            lng:
              application.store_lng !== null &&
              application.store_lng !== undefined
                ? Number(application.store_lng)
                : undefined,
            owner_id: application.user_id,
          },
        );
        application.approved_store_id = store.id;
        if (application.seller_legal_id) {
          await this.sellerLegalRepo.update(application.seller_legal_id, {
            store_id: store.id,
          });
        }
      }

      // Yangi seller'ga boshlang'ich kredit (promo-bonus) — idempotent
      await this.walletService
        .grantInitialCredit(application.user_id)
        .catch(() => {});
    }

    return this.applicationRepo.save(application);
  }

  async reviewCourierApplication(
    applicationId: string,
    sellerId: string,
    dto: ReviewApplicationDto,
  ) {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId, type: RoleApplicationType.COURIER },
      relations: ['user', 'user.auth', 'requestedStore'],
    });

    if (!application?.user?.auth || !application.requestedStore) {
      throw new NotFoundException('Courier application not found');
    }

    const store = await this.storeRepo.findOne({
      where: { id: application.requested_store_id ?? '' },
    });

    if (!store || store.owner_id !== sellerId) {
      throw new NotFoundException('Courier application not found');
    }

    application.reviewed_by_user_id = sellerId;
    application.reviewed_at = new Date();
    application.rejection_reason = dto.reason?.trim() || null;
    application.status = dto.status;

    if (dto.status === RoleApplicationStatus.APPROVED) {
      application.user.auth.role = AuthRoleEnum.COURIER;
      application.approved_store_id = application.requested_store_id;
      await this.authRepo.save(application.user.auth);
    }

    return this.applicationRepo.save(application);
  }

  private async findUserWithAuth(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['auth'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async getOrCreateDraft(userId: string, type: RoleApplicationType) {
    const existing = await this.applicationRepo.findOne({
      where: { user_id: userId, type },
      order: { createdAt: 'DESC' },
    });

    if (existing?.status === RoleApplicationStatus.APPROVED) {
      throw new BadRequestException('Tasdiqlangan ariza qayta yuborilmaydi');
    }

    return existing ?? this.applicationRepo.create({ user_id: userId, type });
  }

  private buildStoreSlug(input: string) {
    const base = String(input || 'store')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);

    return `${base || 'store'}-${Date.now().toString().slice(-6)}`;
  }

  private async upsertSellerLegal(userId: string, dto: SellerLegalDto) {
    let sellerLegal = await this.sellerLegalRepo.findOne({
      where: { user_id: userId },
    });

    if (!sellerLegal) {
      sellerLegal = this.sellerLegalRepo.create({ user_id: userId });
    }

    Object.assign(sellerLegal, {
      type: dto.type,
      official_name: dto.official_name.trim(),
      tin: dto.tin?.trim() || null,
      reg_no: dto.reg_no?.trim() || null,
      reg_address: dto.reg_address?.trim() || null,
      bank_name: dto.bank_name?.trim() || null,
      bank_account: dto.bank_account?.trim() || null,
      license_no: dto.license_no?.trim() || null,
      license_until: dto.license_until?.trim() || null,
    });

    return this.sellerLegalRepo.save(sellerLegal);
  }
}
