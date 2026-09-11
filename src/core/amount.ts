/**
 * Presisi tinggi konversi desimal <-> unit terkecil (smallest unit) menggunakan BigInt.
 * DILARANG MENGGUNAKAN tipe data `number` atau floating-point arithmetic.
 */

export function parseAmount(valueStr: string, decimals: number): bigint {
  if (decimals < 0 || decimals > 30) {
    throw new Error(`Invalid decimals: ${decimals}`);
  }

  const trimmed = valueStr.trim();
  if (!trimmed) {
    throw new Error('Amount cannot be empty');
  }

  // Cek tanda minus atau karakter non-numerik
  if (trimmed.startsWith('-')) {
    throw new Error('Negative amount is not supported');
  }

  const parts = trimmed.split('.');
  if (parts.length > 2) {
    throw new Error(`Invalid number format: "${valueStr}"`);
  }

  const integerPart = parts[0] || '0';
  let fractionalPart = parts[1] || '';

  if (!/^\d+$/.test(integerPart) || (fractionalPart && !/^\d+$/.test(fractionalPart))) {
    throw new Error(`Invalid numeric characters in: "${valueStr}"`);
  }

  if (fractionalPart.length > decimals) {
    throw new Error(`Fractional part exceeds allowed decimals (${decimals}): "${valueStr}"`);
  }

  // Pad pecahan ke kanan sampai sepanjang decimals
  fractionalPart = fractionalPart.padEnd(decimals, '0');

  const combinedStr = integerPart === '0' ? fractionalPart : integerPart + fractionalPart;
  return BigInt(combinedStr);
}

export function formatAmount(raw: bigint, decimals: number): string {
  if (decimals < 0 || decimals > 30) {
    throw new Error(`Invalid decimals: ${decimals}`);
  }

  if (raw < 0n) {
    throw new Error('Negative raw amount is not supported');
  }

  if (raw === 0n) {
    return '0';
  }

  const baseStr = raw.toString();

  if (decimals === 0) {
    return baseStr;
  }

  if (baseStr.length <= decimals) {
    // Kurang dari 1 unit dasar, misal 1500 dengan 6 desimal -> 0.001500
    const padded = baseStr.padStart(decimals, '0');
    const trimmedPadded = padded.replace(/0+$/, '');
    return trimmedPadded.length > 0 ? `0.${trimmedPadded}` : '0';
  }

  const integerPart = baseStr.slice(0, baseStr.length - decimals);
  const fractionalPart = baseStr.slice(baseStr.length - decimals).replace(/0+$/, '');

  return fractionalPart.length > 0 ? `${integerPart}.${fractionalPart}` : integerPart;
}
