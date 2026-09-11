import { describe, it, expect } from 'vitest';
import { parseAmount, formatAmount } from '../src/core/amount.js';

describe('amount.ts precision tests', () => {
  it('parses amounts correctly with 18 decimals (EVM)', () => {
    expect(parseAmount('1', 18)).toBe(1000000000000000000n);
    expect(parseAmount('0.1', 18)).toBe(100000000000000000n);
    expect(parseAmount('0.000000000000000001', 18)).toBe(1n);
    expect(parseAmount('12345.6789', 18)).toBe(12345678900000000000000n);
  });

  it('parses amounts with 6 decimals (XRPL / SPL / USDC)', () => {
    expect(parseAmount('2.5', 6)).toBe(2500000n);
    expect(parseAmount('0.000001', 6)).toBe(1n);
    expect(parseAmount('100', 6)).toBe(100000000n);
  });

  it('formats raw amounts back to decimal string', () => {
    expect(formatAmount(1000000000000000000n, 18)).toBe('1');
    expect(formatAmount(100000000000000000n, 18)).toBe('0.1');
    expect(formatAmount(1n, 18)).toBe('0.000000000000000001');
    expect(formatAmount(2500000n, 6)).toBe('2.5');
    expect(formatAmount(0n, 18)).toBe('0');
    expect(formatAmount(12345678900000000000000n, 18)).toBe('12345.6789');
  });

  it('handles zero and edge cases', () => {
    expect(parseAmount('0', 18)).toBe(0n);
    expect(parseAmount('0.0', 18)).toBe(0n);
    expect(formatAmount(0n, 6)).toBe('0');
  });

  it('throws on invalid input', () => {
    expect(() => parseAmount('-5', 18)).toThrow(/Negative amount/);
    expect(() => parseAmount('1.2.3', 18)).toThrow(/Invalid number format/);
    expect(() => parseAmount('abc', 18)).toThrow(/Invalid numeric characters/);
    expect(() => parseAmount('0.1234567', 6)).toThrow(/Fractional part exceeds/);
  });
});
