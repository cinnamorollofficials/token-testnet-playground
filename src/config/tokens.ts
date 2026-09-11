import type { LedgerId, TokenAsset } from '../core/types.js';

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
    address: '0x3865296839352c86E8EbFfaA427845f2E0Eea046', // Fallback TestToken contract
    decimals: 18,
    symbol: 'TST',
  },
  polygon: {
    kind: 'token',
    address: '0x3865296839352c86E8EbFfaA427845f2E0Eea046',
    decimals: 18,
    symbol: 'TST',
  },
  solana: {
    kind: 'token',
    mint: 'So11111111111111111111111111111111111111112', // default mint placeholder
    decimals: 6,
    symbol: 'TST',
  },
  xrpl: {
    kind: 'token',
    currency: 'TST',
    issuer: 'raTfyLnjjuHaj6nm3LeBiqirpqyDKeowS7',
    decimals: 6,
    symbol: 'TST',
  },
  bitcoin: null,
  kaia: null,
};
