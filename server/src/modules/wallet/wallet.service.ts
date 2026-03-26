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

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepo: Repository<WalletTransaction>,
  ) {}

  async getBalance(userId: string) {
    let wallet = await this.walletRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!wallet) {
      wallet = this.walletRepo.create({
        user: { id: userId } as any,
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
        user: { id: userId } as any,
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
