export const DEPOSIT_FEE_RATE = 0;
export function depositFee(amount: number) {
  return Math.round(amount * DEPOSIT_FEE_RATE * 100) / 100;
}
export function depositBreakdown(amount: number) {
  const fee = depositFee(amount);
  return { gross: amount, fee, net: Math.round((amount - fee) * 100) / 100 };
}