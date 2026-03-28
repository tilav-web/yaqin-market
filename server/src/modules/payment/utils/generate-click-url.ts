export function generateClickUrl({
  serviceId,
  merchantId,
  amount,
  transactionParam,
  returnUrl,
}: {
  serviceId: string;
  merchantId: string;
  amount: number;
  transactionParam: string;
  returnUrl?: string;
}) {
  const searchParams = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount: amount.toFixed(2),
    transaction_param: transactionParam,
  });

  if (returnUrl) {
    searchParams.set('return_url', returnUrl);
  }

  return `https://my.click.uz/services/pay?${searchParams.toString()}`;
}
