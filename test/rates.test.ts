import { describe, it, expect } from 'vitest';
import {
  formatIDR,
  calculateIDRValue,
  TESTNET_TO_INDODAX_MAP,
  fetchIndodaxRates,
  type RatesMap,
} from '../src/core/rates.js';

describe('rates.ts - Indodax Rate Engine & Valuations', () => {
  it('maps testnet symbols to Indodax trading pairs correctly', () => {
    expect(TESTNET_TO_INDODAX_MAP['sBTC']).toBe('btc_idr');
    expect(TESTNET_TO_INDODAX_MAP['BTC']).toBe('btc_idr');
    expect(TESTNET_TO_INDODAX_MAP['ETH']).toBe('eth_idr');
    expect(TESTNET_TO_INDODAX_MAP['POL']).toBe('pol_idr');
    expect(TESTNET_TO_INDODAX_MAP['SOL']).toBe('sol_idr');
    expect(TESTNET_TO_INDODAX_MAP['XRP']).toBe('xrp_idr');
    expect(TESTNET_TO_INDODAX_MAP['KAIA']).toBe('kaia_idr');
    expect(TESTNET_TO_INDODAX_MAP['HTT']).toBe('usdt_idr');
  });

  it('formats IDR numbers correctly', () => {
    expect(formatIDR(0)).toBe('Rp 0');
    expect(formatIDR(1380000000)).toMatch(/Rp\s?1\.380\.000\.000/);
    expect(formatIDR(45825000)).toMatch(/Rp\s?45\.825\.000/);
    expect(formatIDR(24534)).toMatch(/Rp\s?24\.534/);
  });

  it('formats compact IDR numbers', () => {
    expect(formatIDR(1500000000, true)).toMatch(/Rp\s?1,5\s?M/);
    expect(formatIDR(45000000, true)).toMatch(/Rp\s?45\s?Jt/);
  });

  it('calculates portfolio IDR value from crypto amounts', () => {
    const mockRates: RatesMap = {
      ETH: {
        symbol: 'ETH',
        pair: 'ETH/IDR',
        priceIdr: 40_000_000,
        lastUpdated: Date.now(),
      },
      sBTC: {
        symbol: 'sBTC',
        pair: 'BTC/IDR',
        priceIdr: 1_000_000_000,
        lastUpdated: Date.now(),
      },
      HTT: {
        symbol: 'HTT',
        pair: 'USDT/IDR',
        priceIdr: 16_000,
        lastUpdated: Date.now(),
      },
    };

    expect(calculateIDRValue('0.5', 'ETH', mockRates)).toBe(20_000_000);
    expect(calculateIDRValue('0.01', 'sBTC', mockRates)).toBe(10_000_000);
    expect(calculateIDRValue('100', 'HTT', mockRates)).toBe(1_600_000);
    expect(calculateIDRValue('0', 'ETH', mockRates)).toBe(0);
    expect(calculateIDRValue(null, 'ETH', mockRates)).toBe(0);
    expect(calculateIDRValue('1', 'UNKNOWN', mockRates)).toBe(0);
  });

  it('fetches Indodax live rates with expected structure and symbols', async () => {
    const rates = await fetchIndodaxRates();
    expect(rates).toBeDefined();
    expect(rates['ETH']).toBeDefined();
    expect(rates['ETH'].priceIdr).toBeGreaterThan(0);
    expect(rates['sBTC']).toBeDefined();
    expect(rates['sBTC'].priceIdr).toBeGreaterThan(0);
    expect(rates['HTT']).toBeDefined();
    expect(rates['HTT'].priceIdr).toBeGreaterThan(0);
  });
});
