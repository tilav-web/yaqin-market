import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { StoreDeliverySettings } from './entities/store-delivery-settings.entity';
import { StoreWorkingHour, DayOfWeek } from './entities/store-working-hour.entity';
import { UpdateDeliverySettingsDto } from './dto/update-delivery-settings.dto';
import { Auth } from '../auth/auth.entity';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { CreateStoreDto } from './dto/create-store.dto';

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

const DAY_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(StoreDeliverySettings)
    private readonly deliverySettingsRepo: Repository<StoreDeliverySettings>,
    @InjectRepository(StoreWorkingHour)
    private readonly workingHourRepo: Repository<StoreWorkingHour>,
  ) {}

  async create(auth: Auth, data: CreateStoreDto) {
    const deliverySettings = this.deliverySettingsRepo.create({
      min_order_amount: 0,
      delivery_fee: 0,
      preparation_time: 15,
      free_delivery_radius: 0,
      delivery_price_per_km: 2000,
      max_delivery_radius: 10000,
      is_delivery_enabled: true,
    });

    const ownerId =
      auth.role === AuthRoleEnum.SUPER_ADMIN && data.owner_id
        ? data.owner_id
        : auth.user?.id;

    if (!ownerId) {
      throw new NotFoundException('Store owner not found');
    }

    const store = this.storeRepo.create({
      ...data,
      slug: data.slug?.trim() || this.slugify(data.name),
      owner_id: ownerId,
    });

    const savedStore = await this.storeRepo.save(store);

    deliverySettings.store_id = savedStore.id;
    await this.deliverySettingsRepo.save(deliverySettings);

    const defaultHours = Object.values(DayOfWeek).map((day) =>
      this.workingHourRepo.create({
        store_id: savedStore.id,
        day_of_week: day,
        open_time: '08:00',
        close_time: '22:00',
        is_open: day !== DayOfWeek.SUNDAY,
      }),
    );
    await this.workingHourRepo.save(defaultHours);

    return this.findById(savedStore.id);
  }

  async findById(id: string) {
    const store = await this.storeRepo.findOne({
      where: { id },
      relations: ['deliverySettings', 'workingHours', 'owner'],
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return this.addStoreStatus(store);
  }

  async findByOwner(ownerId: string) {
    const stores = await this.storeRepo.find({
      where: { owner_id: ownerId },
      relations: ['deliverySettings', 'workingHours'],
    });

    return stores.map((store) => this.addStoreStatus(store));
  }

  async update(id: string, auth: Auth, data: Partial<Store>) {
    const store = await this.findManagedStore(id, auth);

    Object.assign(store, data);
    if (data.name && !data.slug) {
      store.slug = this.slugify(data.name);
    }
    return this.storeRepo.save(store);
  }

  async updateDeliverySettings(
    storeId: string,
    auth: Auth,
    data: UpdateDeliverySettingsDto,
  ) {
    await this.findManagedStore(storeId, auth);

    const settings = await this.deliverySettingsRepo.findOne({
      where: { store_id: storeId },
    });

    if (settings) {
      Object.assign(settings, data);
      return this.deliverySettingsRepo.save(settings);
    }

    const newSettings = this.deliverySettingsRepo.create({
      ...data,
      store_id: storeId,
    });
    return this.deliverySettingsRepo.save(newSettings);
  }

  async updateWorkingHours(
    storeId: string,
    auth: Auth,
    hours: { day_of_week: DayOfWeek; open_time: string; close_time: string; is_open: boolean }[],
  ) {
    await this.findManagedStore(storeId, auth);

    await this.workingHourRepo.delete({ store_id: storeId });

    const entities = hours.map((h) =>
      this.workingHourRepo.create({
        store_id: storeId,
        ...h,
      }),
    );

    return this.workingHourRepo.save(entities);
  }

  async findNearby(lat: number, lng: number, radiusKm?: number) {
    const stores = await this.storeRepo.find({
      where: { is_active: true },
      relations: ['deliverySettings', 'workingHours'],
    });

    return stores
      .filter((store) => {
        if (!store.lat || !store.lng) return false;
        const distance = calculateDistance(lat, lng, store.lat, store.lng);
        const serviceRadiusMeters = this.getStoreServiceRadiusMeters(store);
        const withinStoreRadius = distance <= serviceRadiusMeters;
        const withinQueryRadius =
          typeof radiusKm === 'number' && radiusKm > 0
            ? distance <= radiusKm * 1000
            : true;

        return withinStoreRadius && withinQueryRadius;
      })
      .map((store) =>
        this.addStoreStatus(
          store,
          calculateDistance(lat, lng, Number(store.lat), Number(store.lng)),
        ),
      )
      .sort(
        (left, right) =>
          Number(left.distance_meters ?? 0) - Number(right.distance_meters ?? 0),
      );
  }

  async findPrime(lat: number, lng: number, radiusKm?: number) {
    const stores = await this.storeRepo.find({
      where: { is_active: true, is_prime: true },
      relations: ['deliverySettings', 'workingHours'],
    });

    return stores
      .filter((store) => {
        if (!store.lat || !store.lng) return false;
        const distance = calculateDistance(lat, lng, store.lat, store.lng);
        const serviceRadiusMeters = this.getStoreServiceRadiusMeters(store);
        const withinStoreRadius = distance <= serviceRadiusMeters;
        const withinQueryRadius =
          typeof radiusKm === 'number' && radiusKm > 0
            ? distance <= radiusKm * 1000
            : true;

        return withinStoreRadius && withinQueryRadius;
      })
      .map((store) =>
        this.addStoreStatus(
          store,
          calculateDistance(lat, lng, Number(store.lat), Number(store.lng)),
        ),
      )
      .sort(
        (left, right) =>
          Number(left.distance_meters ?? 0) - Number(right.distance_meters ?? 0),
      );
  }

  async setActive(id: string, auth: Auth, isActive: boolean) {
    const store = await this.findManagedStore(id, auth);

    store.is_active = isActive;
    return this.storeRepo.save(store);
  }

  async setPrime(id: string, auth: Auth, isPrime: boolean) {
    const store = await this.findManagedStore(id, auth);

    store.is_prime = isPrime;
    return this.storeRepo.save(store);
  }

  async findAll() {
    const stores = await this.storeRepo.find({
      relations: ['deliverySettings', 'workingHours', 'owner'],
      order: { createdAt: 'DESC' },
    });

    return stores.map((store) => this.addStoreStatus(store));
  }

  private addStoreStatus(store: Store, distanceMeters?: number) {
    const now = new Date();
    const currentDay = DAY_MAP[now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5);

    const todayHours = store.workingHours?.find(
      (wh) => wh.day_of_week === currentDay,
    );

    let is_open = false;
    if (todayHours && todayHours.is_open) {
      is_open =
        currentTime >= todayHours.open_time &&
        currentTime <= todayHours.close_time;
    }

    return {
      ...store,
      distance_meters: distanceMeters,
      service_radius_meters: this.getStoreServiceRadiusMeters(store),
      is_open,
      today_hours: todayHours || null,
    };
  }

  private getStoreServiceRadiusMeters(store: Store) {
    const settings = store.deliverySettings?.[0];

    if (!settings?.is_delivery_enabled) {
      return 0;
    }

    return Number(settings?.max_delivery_radius ?? 5000);
  }

  private async findManagedStore(id: string, auth: Auth) {
    const where =
      auth.role === AuthRoleEnum.SUPER_ADMIN
        ? { id }
        : { id, owner_id: auth.user?.id };

    const store = await this.storeRepo.findOne({ where });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}
