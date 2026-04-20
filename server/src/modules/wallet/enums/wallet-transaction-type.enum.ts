export enum WalletTransactionTypeEnum {
  PAYMENT,
  CASHBACK,
  REFUND,
  TOPUP,
  COMMISSION,              // Seller'dan buyurtma uchun komissiya undirildi
  CREDIT_BONUS,            // Seller'ga boshlang'ich kredit (promo) berildi
  CHANGE_HOLD,             // Seller wallet'dan qaytim uchun frozen
  CHANGE_RELEASED,         // Frozen qaytim seller ga qaytdi (SELLER_WON)
  CHANGE_WAIVED,           // User "kerak emas" bosdi — seller counter yig'iladi
  CHANGE_PAID_OUT,         // Seller'dan qaytim user'ga to'lab chiqildi
  CHANGE_RECEIVED,         // User wallet'ga qaytim kirdi
  CHANGE_ADJUSTMENT_OUT,   // Admin qaroridan qo'shimcha seller'dan yechildi
  CHANGE_ADJUSTMENT_IN,    // Admin qaroridan user'ga qo'shimcha kirdi
}
