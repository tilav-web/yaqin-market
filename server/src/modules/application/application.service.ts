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

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(RoleApplication)
    private readonly applicationRepo: Repository<RoleApplication>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    private readonly storeService: StoreService,
  ) {}

  async getMyApplications(userId: string) {
    return this.applicationRepo.find({
      where: { user_id: userId },
      relations: ['requestedStore', 'approvedStore'],
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

    Object.assign(application, {
      phone: dto.phone.trim(),
      note: dto.note?.trim() || null,
      store_name: dto.store_name.trim(),
      owner_name:
        dto.owner_name?.trim() ||
        [user.first_name, user.last_name].join(' ').trim() ||
        null,
      legal_name: dto.legal_name?.trim() || null,
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
      relations: ['user', 'user.auth', 'approvedStore'],
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
            legal_name: application.legal_name || undefined,
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
      }
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
}
