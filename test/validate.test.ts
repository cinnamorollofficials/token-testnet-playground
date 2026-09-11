import { describe, it, expect } from 'vitest';
import { validateAddress } from '../src/core/validate.js';

describe('Address Validation Tests (Cross-Chain Safety)', () => {
  it('validates correct EVM addresses for Ethereum and Polygon', () => {
    const validEVM = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94';
    expect(validateAddress('ethereum', validEVM).valid).toBe(true);
    expect(validateAddress('polygon', validEVM).valid).toBe(true);
  });

  it('rejects invalid EVM addresses', () => {
    expect(validateAddress('ethereum', '0x123').valid).toBe(false);
    expect(validateAddress('polygon', 'not-an-address').valid).toBe(false);
  });

  it('validates Solana base58 address', () => {
    const validSol = 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk';
    expect(validateAddress('solana', validSol).valid).toBe(true);
  });

  it('validates XRPL classic address', () => {
    const validXrpl = 'rHsMGQEkVNJmpGWs8XUBoTBiAAbwxZN5v3';
    expect(validateAddress('xrpl', validXrpl).valid).toBe(true);
    expect(validateAddress('xrpl', 'rInvalidXrplAddress').valid).toBe(false);
  });

  it('validates Bitcoin Signet Native SegWit address and blocks mainnet', () => {
    const validSignet = 'tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl';
    expect(validateAddress('bitcoin', validSignet).valid).toBe(true);

    // Mainnet bc1... must be explicitly blocked
    const mainnetBtc = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    const res = validateAddress('bitcoin', mainnetBtc);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('mainnet');
  });

  it('blocks cross-chain address mismatches (e.g. EVM 0x... pasted into Solana)', () => {
    const evmAddr = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94';
    const solRes = validateAddress('solana', evmAddr);
    expect(solRes.valid).toBe(false);
    expect(solRes.error).toContain('bukan format address');

    const solAddr = 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk';
    const ethRes = validateAddress('ethereum', solAddr);
    expect(ethRes.valid).toBe(false);
    expect(ethRes.error).toContain('0x');
  });
});
