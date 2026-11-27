export type CompanySale = { id: string; listing_id: string; title: string; amount: number; fee: number; quantity: number; status: string; created_at: string };
export function companyAnalytics(rows: CompanySale[], days: number, now = Date.now()) {
  const orders = rows.filter(row => !days || new Date(row.created_at).getTime() >= now - days * 86400000);
  const completed = orders.filter(row => row.status === 'completed');
  const held = orders.filter(row => ['escrow_held', 'shipped', 'disputed'].includes(row.status));
  const gross = completed.reduce((sum, row) => sum + Number(row.amount), 0);
  const fees = completed.reduce((sum, row) => sum + Number(row.fee), 0);
  const pending = held.reduce((sum, row) => sum + Number(row.amount) - Number(row.fee), 0);
  const statusCount = orders.reduce<Record<string, number>>((result, row) => { result[row.status] = (result[row.status] ?? 0) + 1; return result; }, {});
  const seriesMap = new Map<string, { volume: number; fee: number }>();
  const topMap = new Map<string, { qty: number; volume: number; fee: number }>();
  for (const row of completed) {
    const date = row.created_at.slice(0, 10);
    const prior = seriesMap.get(date) ?? { volume: 0, fee: 0 };
    seriesMap.set(date, { volume: prior.volume + Number(row.amount), fee: prior.fee + Number(row.amount) - Number(row.fee) });
    const product = topMap.get(row.title) ?? { qty: 0, volume: 0, fee: 0 };
    topMap.set(row.title, { qty: product.qty + row.quantity, volume: product.volume + Number(row.amount), fee: product.fee + Number(row.amount) - Number(row.fee) });
  }
  return { orders, gross, fees, net: gross - fees, pending, units: completed.reduce((sum, row) => sum + row.quantity, 0), count: completed.length, statusCount,
    series: [...seriesMap.entries()].sort((a, b) => a[0].localeCompare(b[0])), top: [...topMap.entries()].sort((a, b) => b[1].volume - a[1].volume).slice(0, 10) };
}
