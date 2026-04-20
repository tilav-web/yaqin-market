import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WalletTransactionTypeEnum } from './enums/wallet-transaction-type.enum';
import { User } from '../user/user.entity';
import { SELLER_INITIAL_CREDIT } from './wallet.constants';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepo: Repository<WalletTransaction>,
    private readonly notificationService: NotificationService,
  ) {}

  async getBalance(userId: string) {
    let wallet = await this.walletRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!wallet) {
      wallet = this.walletRepo.create({
        user: { id: userId } as User,
        balance: 0,
        frozen_balance: 0,
      });
      wallet = await this.walletRepo.save(wallet);
    }

    return {
      balance: Number(wallet.balance),
      frozen_balance: Number(wallet.frozen_balance),
      available_balance: Number(wallet.balance) - Number(wallet.frozen_balance),
    };
  }

  async topup(userId: string, amount: number, description?: string) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    let wallet = await this.walletRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!wallet) {
      wallet = this.walletRepo.create({
        user: { id: userId } as User,
        balance: 0,
        frozen_balance: 0,
      });
      wallet = await this.walletRepo.save(wallet);
    }

    wallet.balance = Number(wallet.balance) + amount;
    await this.walletRepo.save(wallet);

    const transaction = this.transactionRepo.create({
      amount,
      type: String(WalletTransactionTypeEnum.TOPUP),
      description: description || 'Wallet topup',
      wallet,
    });
    await this.transactionRepo.save(transaction);

    return this.getBalance(userId);
  }

  async pay(userId: string, amount: number, description?: string) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const wallet = await this.walletRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const available = Number(wallet.balance) - Number(wallet.frozen_balance);
    if (available < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    wallet.balance = Number(wallet.balance) - amount;
    await this.walletRepo.save(wallet);

    const transaction = this.transactionRepo.create({
      amount: -amount,
      type: String(WalletTransactionTypeEnum.PAYMENT),
      description: description || 'Payment',
      wallet,
    });
    await this.transactionRepo.save(transaction);

    return this.getBalance(userId);
  }

  /**
   * Seller buyurtma qabul qilganda komissiya undiradi.
   * Balance yetmasa — BadRequestException.
   */
  async chargeCommission(userId: string, amount: number, description: string) {
    if (amount <= 0) return this.getBalance(userId);

    let wallet = await this.walletRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!wallet) {
      wallet = this.walletRepo.create({
        user: { id: userId } as User,
        balance: 0,
        frozen_balance: 0,
      });
      wallet = await this.walletRepo.save(wallet);
    }

    const available = Number(wallet.balance) - Number(wallet.frozen_balance);
    if (available < amount) {
      throw new BadRequestException(
        `Balans yetarli emas. Kerak: ${amount} so'm, mavjud: ${available} so'm. Balansni to'ldiring.`,
      );
    }

    wallet.balance = Number(wallet.balance) - amount;
    const savedWallet = await this.walletRepo.save(wallet);

    const tx = this.transactionRepo.create({
      amount: -amount,
      type: String(WalletTransactionTypeEnum.COMMISSION),
      description: description || 'Buyurtma komissiyasi',
      wallet,
    });
    await this.transactionRepo.save(tx);

    // Balans past bo'lib qolsa — ogohlantirish push
    const newBalance = Number(savedWallet.balance);
    const LOW_BALANCE_THRESHOLD = 20_000;
    if (newBalance > 0 && newBalance < LOW_BALANCE_THRESHOLD) {
      void this.notificationService.sendToUser(userId, {
        title: '⚠️ Balans past',
        body: `Komissiya balansingiz ${newBalance.toLocaleString()} so'm qoldi. Yangi buyurtma qabul qilish uchun to'ldiring.`,
        data: { type: 'LOW_BALANCE', balance: String(newBalance) },
      });
    } else if (newBalance <= 0) {
      void this.notificationService.sendToUser(userId, {
        title: '❗ Balans tugadi',
        body: 'Komissiya balansingiz tugadi. Yangi buyurtmalarni qabul qila olmaysiz. Iltimos balansni to\'ldiring.',
        data: { type: 'BALANCE_DEPLETED' },
      });
    }

    return this.getBalance(userId);
  }

  /**
   * Yangi seller'ga boshlang'ich kredit (bepul bonus) beradi.
   * Agar avval berilgan bo'lsa — qayta berilmaydi (idempotent).
   */
  async grantInitialCredit(userId: string, amount: number = SELLER_INITIAL_CREDIT) {
    let wallet = await this.walletRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!wallet) {
      wallet = this.walletRepo.create({
        user: { id: userId } as User,
        balance: 0,
        frozen_balance: 0,
      });
      wallet = await this.walletRepo.save(wallet);
    }

    // Avval berilganmi tekshiruv
    const existing = await this.transactionRepo.findOne({
      where: {
        wallet: { id: wallet.id },
        type: String(WalletTransactionTypeEnum.CREDIT_BONUS),
      },
    });
    if (existing) return this.getBalance(userId);

    wallet.balance = Number(wallet.balance) + amount;
    await this.walletRepo.save(wallet);

    const tx = this.transactionRepo.create({
      amount,
      type: String(WalletTransactionTypeEnum.CREDIT_BONUS),
      description: 'Boshlang\'ich promo-kredit (hisob ochilganda)',
      wallet,
    });
    await this.transactionRepo.save(tx);

    return this.getBalance(userId);
  }

  async getTransactions(userId: string, page: number = 1, limit: number = 20) {
    const wallet = await this.walletRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!wallet) {
      return { data: [], total: 0, page, limit };
    }

    const [data, total] = await this.transactionRepo.findAndCount({
      where: { wallet: { id: wallet.id } },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }
}
