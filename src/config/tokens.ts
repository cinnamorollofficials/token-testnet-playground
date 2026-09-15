import type { LedgerId, TokenAsset } from '../core/types.js';
import { getAddress } from 'ethers';

export interface TokenRegistryEntry {
  readonly ledger: LedgerId;
  readonly symbol: string;
  readonly name: string;
  readonly decimals: number;
  readonly asset: TokenAsset;
}

// Token test default per chain
export const DEFAULT_TEST_TOKENS: Record<LedgerId, TokenAsset | null> = {
  ethereum: {
    kind: 'token',
    address: '0xf98a6e32dB5b1572C83016Ad70068850c8939063', // Deployed Hadi Token Test (HTT) contract on Sepolia
    decimals: 18,
    symbol: 'HTT',
  },
  polygon: {
    kind: 'token',
    address: '0xf98a6e32dB5b1572C83016Ad70068850c8939063',
    decimals: 18,
    symbol: 'HTT',
  },
  solana: {
    kind: 'token',
    mint: 'So11111111111111111111111111111111111111112', // default mint placeholder
    decimals: 6,
    symbol: 'HTT',
  },
  xrpl: {
    kind: 'token',
    currency: 'HTT',
    issuer: 'raTfyLnjjuHaj6nm3LeBiqirpqyDKeowS7',
    decimals: 6,
    symbol: 'HTT',
  },
  bitcoin: null,
  'bitcoin-t4': null,
  kaia: null,
};

export function getActiveTokenAsset(ledger: LedgerId): TokenAsset | null {
  const base = DEFAULT_TEST_TOKENS[ledger];
  if (!base) return null;

  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(`token_contract_${ledger}`);
    if (saved && base.kind === 'token' && 'address' in base) {
      // Clear stale fallback address if previously cached
      if (saved.toLowerCase().startsWith('0x3865296839352')) {
        window.localStorage.removeItem(`token_contract_${ledger}`);
        return base;
      }
      try {
        const normalized = getAddress(saved.trim().toLowerCase());
        return {
          ...base,
          address: normalized,
        };
      } catch {
        return base;
      }
    }
  }

  return base;
}

export function setActiveTokenAddress(ledger: LedgerId, address: string): void {
  let cleanAddress = address.trim();
  try {
    cleanAddress = getAddress(cleanAddress.toLowerCase());
  } catch {
    // Keep as is if invalid
  }

  const base = DEFAULT_TEST_TOKENS[ledger];
  if (base && 'address' in base) {
    (DEFAULT_TEST_TOKENS[ledger] as any).address = cleanAddress;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(`token_contract_${ledger}`, cleanAddress);
  }
}
