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

  // ─── Cash change (qaytim) flow ─────────────────────────────────────────

  /** Seller wallet dan change miqdorini frozen qiladi (kuryer submit qilganda) */
  async freezeChangeForOrder(
    sellerUserId: string,
    amount: number,
    orderId: string,
  ) {
    if (amount <= 0) return;
    let wallet = await this.ensureWallet(sellerUserId);
    const available = Number(wallet.balance) - Number(wallet.frozen_balance);
    if (available < amount) {
      throw new BadRequestException(
        `Seller balansida yetarli mablag' yo'q: kerak ${amount} so'm, mavjud ${available} so'm`,
      );
    }
    wallet.frozen_balance = Number(wallet.frozen_balance) + amount;
    await this.walletRepo.save(wallet);

    const tx = this.transactionRepo.create({
      amount: -amount,
      type: String(WalletTransactionTypeEnum.CHANGE_HOLD),
      description: `Qaytim frozen (buyurtma ${orderId.slice(0, 8)})`,
      wallet,
    });
    await this.transactionRepo.save(tx);
  }

  /** Seller frozen'dan user wallet'ga to'lash (CONFIRMED / AUTO_CONFIRMED) */
  async releaseChangeToUser(
    sellerUserId: string,
    customerUserId: string,
    amount: number,
    orderId: string,
  ) {
    if (amount <= 0) return;
    // Seller: frozen ni kamaytirib, balance dan ayirish (pul ketdi)
    const sellerWallet = await this.ensureWallet(sellerUserId);
    sellerWallet.frozen_balance = Math.max(
      0,
      Number(sellerWallet.frozen_balance) - amount,
    );
    sellerWallet.balance = Number(sellerWallet.balance) - amount;
    await this.walletRepo.save(sellerWallet);

    await this.transactionRepo.save(
      this.transactionRepo.create({
        amount: -amount,
        type: String(WalletTransactionTypeEnum.CHANGE_PAID_OUT),
        description: `Qaytim user ga to'landi (buyurtma ${orderId.slice(0, 8)})`,
        wallet: sellerWallet,
      }),
    );

    // User: balance oshadi
    const userWallet = await this.ensureWallet(customerUserId);
    userWallet.balance = Number(userWallet.balance) + amount;
    await this.walletRepo.save(userWallet);

    await this.transactionRepo.save(
      this.transactionRepo.create({
        amount,
        type: String(WalletTransactionTypeEnum.CHANGE_RECEIVED),
        description: `Qaytim qabul qilindi (buyurtma ${orderId.slice(0, 8)})`,
        wallet: userWallet,
      }),
    );
  }

  /** User "kerak emas" bosdi — frozen ni seller'ga qaytaradi (waived counter) */
  async waiveChange(sellerUserId: string, amount: number, orderId: string) {
    if (amount <= 0) return;
    const wallet = await this.ensureWallet(sellerUserId);
    wallet.frozen_balance = Math.max(
      0,
      Number(wallet.frozen_balance) - amount,
    );
    await this.walletRepo.save(wallet);

    await this.transactionRepo.save(
      this.transactionRepo.create({
        amount,
        type: String(WalletTransactionTypeEnum.CHANGE_WAIVED),
        description: `User qaytim kerak emas dedi (buyurtma ${orderId.slice(0, 8)})`,
        wallet,
      }),
    );
  }

  /** Dispute — seller yutdi → frozen qaytariladi, user'ga faqat kuryer aytgan default */
  async releaseChangeSellerWon(
    sellerUserId: string,
    customerUserId: string,
    amount: number,
    orderId: string,
  ) {
    // Default amount user ga beriladi (kuryer kafolat)
    await this.releaseChangeToUser(sellerUserId, customerUserId, amount, orderId);
  }

  /** Dispute — user yutdi → frozen + qo'shimcha seller'dan yechilib user'ga */
  async releaseChangeUserWon(
    sellerUserId: string,
    customerUserId: string,
    originalAmount: number,
    claimedAmount: number,
    orderId: string,
  ) {
    // 1. Avval frozen default amount user ga
    await this.releaseChangeToUser(
      sellerUserId,
      customerUserId,
      originalAmount,
      orderId,
    );

    // 2. Qo'shimcha (claimed - original) seller'dan yechilib user'ga
    const extra = Math.max(0, claimedAmount - originalAmount);
    if (extra <= 0) return;

    const sellerWallet = await this.ensureWallet(sellerUserId);
    sellerWallet.balance = Number(sellerWallet.balance) - extra;
    await this.walletRepo.save(sellerWallet);

    await this.transactionRepo.save(
      this.transactionRepo.create({
        amount: -extra,
        type: String(WalletTransactionTypeEnum.CHANGE_ADJUSTMENT_OUT),
        description: `Disput qarori (buyurtma ${orderId.slice(0, 8)}): user haq`,
        wallet: sellerWallet,
      }),
    );

    const userWallet = await this.ensureWallet(customerUserId);
    userWallet.balance = Number(userWallet.balance) + extra;
    await this.walletRepo.save(userWallet);

    await this.transactionRepo.save(
      this.transactionRepo.create({
        amount: extra,
        type: String(WalletTransactionTypeEnum.CHANGE_ADJUSTMENT_IN),
        description: `Disput qarori (buyurtma ${orderId.slice(0, 8)}): qo'shimcha qaytim`,
        wallet: userWallet,
      }),
    );
  }

  /** Dispute — admin qisman qaror qildi. Final amount user ga beriladi */
  async releaseChangeAdjusted(
    sellerUserId: string,
    customerUserId: string,
    finalAmount: number,
    originalFrozen: number,
    orderId: string,
  ) {
    // Avval frozen ni bekor qilamiz
    const sellerWallet = await this.ensureWallet(sellerUserId);
    sellerWallet.frozen_balance = Math.max(
      0,
      Number(sellerWallet.frozen_balance) - originalFrozen,
    );
    await this.walletRepo.save(sellerWallet);

    // Keyin final miqdorni user ga beramiz (paymentout tracking bilan)
    if (finalAmount > 0) {
      sellerWallet.balance = Number(sellerWallet.balance) - finalAmount;
      await this.walletRepo.save(sellerWallet);

      await this.transactionRepo.save(
        this.transactionRepo.create({
          amount: -finalAmount,
          type: String(WalletTransactionTypeEnum.CHANGE_PAID_OUT),
          description: `Disput qarori (buyurtma ${orderId.slice(0, 8)}): qisman qaror`,
          wallet: sellerWallet,
        }),
      );

      const userWallet = await this.ensureWallet(customerUserId);
      userWallet.balance = Number(userWallet.balance) + finalAmount;
      await this.walletRepo.save(userWallet);

      await this.transactionRepo.save(
        this.transactionRepo.create({
          amount: finalAmount,
          type: String(WalletTransactionTypeEnum.CHANGE_RECEIVED),
          description: `Disput qarori (buyurtma ${orderId.slice(0, 8)}): qaytim`,
          wallet: userWallet,
        }),
      );
    }
  }

  /** Seller'ning qaytimlardan yig'ilgan summasi */
  async getWaivedChangeTotal(sellerUserId: string) {
    const wallet = await this.walletRepo.findOne({
      where: { user: { id: sellerUserId } },
    });
    if (!wallet) return { total: 0, count: 0 };

    const result = await this.transactionRepo
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('tx.walletId = :wid', { wid: wallet.id })
      .andWhere('tx.type = :type', {
        type: String(WalletTransactionTypeEnum.CHANGE_WAIVED),
      })
      .getRawOne<{ total: string; count: string }>();

    return {
      total: Number(result?.total ?? 0),
      count: Number(result?.count ?? 0),
    };
  }

  private async ensureWallet(userId: string): Promise<Wallet> {
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
    return wallet;
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
