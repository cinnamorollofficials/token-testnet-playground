import { describe, it, expect, beforeEach } from 'vitest';
import {
  generate24hPortfolioTimeSeries,
  calculate24hChange,
  recordValuationSnapshot,
  getValuationSnapshots,
  clearValuationSnapshots,
  formatHourLabel,
} from '../src/core/chart.js';
import type { RatesMap } from '../src/core/rates.js';

describe('Portfolio 24h Chart Engine', () => {
  beforeEach(() => {
    clearValuationSnapshots();
  });

  const mockRates: RatesMap = {
    eth_idr: {
      symbol: 'ETH',
      pair: 'eth_idr',
      priceIdr: 45_000_000,
      high24h: 46_500_000,
      low24h: 43_000_000,
      lastUpdated: Date.now(),
    },
    usdt_idr: {
      symbol: 'HTT',
      pair: 'usdt_idr',
      priceIdr: 17_500,
      high24h: 17_600,
      low24h: 17_400,
      lastUpdated: Date.now(),
    },
  };

  it('generates flat baseline when total portfolio is 0', () => {
    const points = generate24hPortfolioTimeSeries([], {}, 0);
    expect(points.length).toBe(25);
    expect(points[0].value).toBe(0);
    expect(points[24].value).toBe(0);
    expect(points[24].formattedValue).toBe('Rp 0');
  });

  it('generates 25 hourly points ending exactly at current total IDR', () => {
    const holdings = [{ symbol: 'ETH', amount: 0.1 }];
    const currentIdr = 4_500_000;
    const now = 1789150000000;

    const points = generate24hPortfolioTimeSeries(holdings, mockRates, currentIdr, now);
    expect(points.length).toBe(25);
    expect(points[24].value).toBe(currentIdr);
    expect(points[24].timeLabel).toBe('Sekarang');

    // Pastikan semua titik memiliki nilai positif dan berfluktuasi secara wajar
    for (const p of points) {
      expect(p.value).toBeGreaterThan(0);
      expect(p.timestamp).toBeLessThanOrEqual(now);
    }
  });

  it('calculates 24h change and percentage accurately', () => {
    const points = [
      { timestamp: 1000, value: 2_000_000, formattedValue: 'Rp 2.000.000', timeLabel: '00:00' },
      { timestamp: 2000, value: 2_100_000, formattedValue: 'Rp 2.100.000', timeLabel: 'Sekarang' },
    ];

    const change = calculate24hChange(2_100_000, points);
    expect(change.changeIdr).toBe(100_000);
    expect(change.percentage).toBeCloseTo(5.0);
    expect(change.isPositive).toBe(true);
    expect(change.formattedChange).toBe('+5.00%');
  });

  it('handles negative 24h change', () => {
    const points = [
      { timestamp: 1000, value: 2_000_000, formattedValue: 'Rp 2.000.000', timeLabel: '00:00' },
      { timestamp: 2000, value: 1_900_000, formattedValue: 'Rp 1.900.000', timeLabel: 'Sekarang' },
    ];

    const change = calculate24hChange(1_900_000, points);
    expect(change.changeIdr).toBe(-100_000);
    expect(change.percentage).toBeCloseTo(-5.0);
    expect(change.isPositive).toBe(false);
    expect(change.formattedChange).toBe('-5.00%');
  });

  it('stores and retrieves valuation snapshots', () => {
    recordValuationSnapshot(1_000_000);
    const list = getValuationSnapshots();
    expect(list.length).toBe(1);
    expect(list[0].totalIdr).toBe(1_000_000);
  });

  it('formats hour label properly', () => {
    const date = new Date(2026, 8, 12, 14, 30, 0);
    const label = formatHourLabel(date.getTime());
    expect(label).toContain('14');
    expect(label).toContain('30');
  });
});
