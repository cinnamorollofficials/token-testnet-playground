import { describe, it, expect } from 'vitest';
import { assertTestnet, ALLOWLISTED_TESTNET_IDS, NETWORKS } from '../src/config/networks.js';

describe('Scaffold & Network Guards', () => {
  it('allows all supported testnets', () => {
    expect(() => assertTestnet('ethereum', 11155111)).not.toThrow();
    expect(() => assertTestnet('polygon', 80002)).not.toThrow();
    expect(() => assertTestnet('solana', 'solana-devnet')).not.toThrow();
    expect(() => assertTestnet('xrpl', 'xrpl-testnet')).not.toThrow();
    expect(() => assertTestnet('bitcoin', 'btc-signet')).not.toThrow();
  });

  it('blocks mainnet chain IDs and networks', () => {
    // Ethereum Mainnet (1)
    expect(() => assertTestnet('ethereum', 1)).toThrow(/SECURITY ERROR/);
    // Polygon Mainnet (137)
    expect(() => assertTestnet('polygon', 137)).toThrow(/SECURITY ERROR/);
    // Solana Mainnet-beta
    expect(() => assertTestnet('solana', 'solana-mainnet')).toThrow(/SECURITY ERROR/);
    // XRPL Mainnet
    expect(() => assertTestnet('xrpl', 'xrpl-mainnet')).toThrow(/SECURITY ERROR/);
    // Bitcoin Mainnet
    expect(() => assertTestnet('bitcoin', 'btc-mainnet')).toThrow(/SECURITY ERROR/);
  });

  it('verifies all configured networks have matching testnet IDs in allowlist', () => {
    for (const [ledger, config] of Object.entries(NETWORKS)) {
      expect(ALLOWLISTED_TESTNET_IDS.has(config.networkId)).toBe(true);
      expect(() => assertTestnet(ledger as any)).not.toThrow();
    }
  });
});
