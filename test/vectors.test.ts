import { describe, it, expect } from 'vitest';
import { generate, validate, toSeed, getFingerprint } from '../src/core/mnemonic.js';
import { deriveAccount } from '../src/core/derive.js';
import { HDKey as Slip10HDKey } from 'micro-key-producer/slip10.js';

const STANDARD_TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('BIP-39 Mnemonic Tests', () => {
  it('generates valid 12-word and 24-word mnemonics', () => {
    const m12 = generate(12);
    expect(m12.split(' ').length).toBe(12);
    expect(validate(m12)).toBe(true);

    const m24 = generate(24);
    expect(m24.split(' ').length).toBe(24);
    expect(validate(m24)).toBe(true);
  });

  it('validates standard test vector correctly', () => {
    expect(validate(STANDARD_TEST_MNEMONIC)).toBe(true);
  });

  it('rejects invalid mnemonics (bad checksum or invalid word)', () => {
    // 12 words of "abandon" has invalid checksum
    expect(validate('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon')).toBe(false);
    expect(validate('invalid word list that is not bip39')).toBe(false);
    expect(validate('')).toBe(false);

    expect(() => toSeed('invalid mnemonic')).toThrow(/Invalid BIP-39 mnemonic/);
  });

  it('generates consistent 8-char fingerprint without exposing mnemonic', () => {
    const seed = toSeed(STANDARD_TEST_MNEMONIC);
    const fp1 = getFingerprint(seed);
    const fp2 = getFingerprint(STANDARD_TEST_MNEMONIC);

    expect(fp1).toHaveLength(8);
    expect(fp1).toBe(fp2);
    expect(fp1).not.toContain('abandon');
  });
});

describe('Derivation Test Vectors (Fase 1 Gate)', () => {
  const seed = toSeed(STANDARD_TEST_MNEMONIC);

  it('derives correct Index 0 addresses for all 5 active chains', () => {
    // 1. Ethereum
    const eth0 = deriveAccount('ethereum', seed, 0);
    expect(eth0.path).toBe("m/44'/60'/0'/0/0");
    expect(eth0.address).toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');

    // 2. Polygon (must be identical to Ethereum)
    const poly0 = deriveAccount('polygon', seed, 0);
    expect(poly0.path).toBe("m/44'/60'/0'/0/0");
    expect(poly0.address).toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
    expect(poly0.address).toBe(eth0.address);

    // 3. Solana (SLIP-0010 ed25519 all-hardened)
    const sol0 = deriveAccount('solana', seed, 0);
    expect(sol0.path).toBe("m/44'/501'/0'/0'");
    expect(sol0.address).toBe('HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk');

    // 4. XRPL (BIP-32 secp256k1 classic address)
    const xrpl0 = deriveAccount('xrpl', seed, 0);
    expect(xrpl0.path).toBe("m/44'/144'/0'/0/0");
    expect(xrpl0.address).toBe('rHsMGQEkVNJmpGWs8XUBoTBiAAbwxZN5v3');

    // 5. Bitcoin Signet (BIP-84 Native SegWit)
    const btc0 = deriveAccount('bitcoin', seed, 0);
    expect(btc0.path).toBe("m/84'/1'/0'/0/0");
    expect(btc0.address).toBe('tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl');
  });

  it('verifies Index 0 vs Index 1 produce distinct addresses on all chains', () => {
    const chains = ['ethereum', 'polygon', 'solana', 'xrpl', 'bitcoin'] as const;

    for (const chain of chains) {
      const acc0 = deriveAccount(chain, seed, 0);
      const acc1 = deriveAccount(chain, seed, 1);

      expect(acc0.address).not.toBe(acc1.address);
      expect(acc0.publicKey).not.toBe(acc1.publicKey);
      expect(acc0.path).not.toBe(acc1.path);
    }
  });

  it('confirms Index 1 expected addresses match known vectors', () => {
    expect(deriveAccount('ethereum', seed, 1).address).toBe('0x6Fac4D18c912343BF86fa7049364Dd4E424Ab9C0');
    expect(deriveAccount('polygon', seed, 1).address).toBe('0x6Fac4D18c912343BF86fa7049364Dd4E424Ab9C0');
    expect(deriveAccount('solana', seed, 1).address).toBe('Hh8QwFUA6MtVu1qAoq12ucvFHNwCcVTV7hpWjeY1Hztb');
    expect(deriveAccount('xrpl', seed, 1).address).toBe('r3AgF9mMBFtaLhKcg96weMhbbEFLZ3mx17');
    expect(deriveAccount('bitcoin', seed, 1).address).toBe('tb1qd7spv5q28348xl4myc8zmh983w5jx32cjhkn97');
  });

  it('rejects non-hardened path for Solana (SLIP-0010 ed25519 requires all-hardened)', () => {
    const slip10 = Slip10HDKey.fromMasterSeed(seed);
    // Non-hardened index derivation must fail on ed25519
    expect(() => slip10.derive("m/44'/501'/0'/0")).toThrow(/Non-hardened/);
  });
});
