import { expect, test } from 'bun:test';
import { companyAnalytics } from './company-analytics';
const row = (status, amount, fee) => ({ id: status, listing_id: 'device', title: 'Miner', amount, fee, quantity: 2, status, created_at: '2026-11-27T12:00:00Z' });
test('company financial totals include only completed sales and deduct their actual fees', () => {
  const result = companyAnalytics([row('completed', 1000, 20), row('refunded', 500, 10)], 0);
  expect(result.gross).toBe(1000); expect(result.net).toBe(980); expect(result.fees).toBe(20); expect(result.units).toBe(2);
});
test('held company revenue stays pending rather than counting as completed revenue', () => {
  const result = companyAnalytics([row('escrow_held', 1000, 20), row('shipped', 100, 2), row('disputed', 200, 4)], 0);
  expect(result.pending).toBe(1274); expect(result.net).toBe(0);
});
