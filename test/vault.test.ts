import { describe, it, expect, beforeEach } from 'vitest';
import {
  encryptVault,
  decryptVault,
  saveStoredVault,
  getStoredVault,
  hasStoredVault,
  clearStoredVault,
} from '../src/core/vault.js';
import type { VaultPayload } from '../src/core/types.js';

describe('WebCrypto Vault Tests (AES-256-GCM + PBKDF2)', () => {
  const samplePayload: VaultPayload = {
    mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    activeAccountIndex: 0,
    createdAt: '2026-09-15T10:00:00.000Z',
  };

  const password = 'SuperSecurePassword#2026';

  beforeEach(async () => {
    // Clean mock or global localStorage if available
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('encrypts and successfully decrypts payload with the correct password', async () => {
    const encrypted = await encryptVault(samplePayload, password, 'fingerprint-123');

    expect(encrypted.version).toBe(1);
    expect(encrypted.crypto.cipher).toBe('aes-256-gcm');
    expect(encrypted.crypto.kdf.algorithm).toBe('PBKDF2');
    expect(encrypted.crypto.kdf.iterations).toBe(100_000);
    expect(encrypted.crypto.ciphertext).toBeTypeOf('string');
    expect(encrypted.crypto.iv).toBeTypeOf('string');
    expect(encrypted.crypto.kdf.salt).toBeTypeOf('string');
    expect(encrypted.metadata.fingerprint).toBe('fingerprint-123');

    // Decrypt
    const decrypted = await decryptVault(encrypted, password);
    expect(decrypted.mnemonic).toBe(samplePayload.mnemonic);
    expect(decrypted.activeAccountIndex).toBe(samplePayload.activeAccountIndex);
    expect(decrypted.createdAt).toBe(samplePayload.createdAt);
  });

  it('fails decryption with wrong password and throws clear error', async () => {
    const encrypted = await encryptVault(samplePayload, password);

    await expect(decryptVault(encrypted, 'WrongPassword123')).rejects.toThrow(
      'Password salah atau data vault rusak'
    );
  });

  it('fails decryption if ciphertext is tampered with (AEAD integrity check)', async () => {
    const encrypted = await encryptVault(samplePayload, password);

    // Tamper with ciphertext by corrupting characters
    const tampered = {
      ...encrypted,
      crypto: {
        ...encrypted.crypto,
        ciphertext: encrypted.crypto.ciphertext.substring(0, encrypted.crypto.ciphertext.length - 4) + 'AAAA',
      },
    };

    await expect(decryptVault(tampered, password)).rejects.toThrow();
  });

  it('fails decryption if IV is tampered with', async () => {
    const encrypted = await encryptVault(samplePayload, password);

    const tampered = {
      ...encrypted,
      crypto: {
        ...encrypted.crypto,
        iv: 'YWJjZGVmZ2hpamts', // invalid / changed IV
      },
    };

    await expect(decryptVault(tampered, password)).rejects.toThrow();
  });

  it('generates unique salt and IV for every encryption call', async () => {
    const enc1 = await encryptVault(samplePayload, password);
    const enc2 = await encryptVault(samplePayload, password);

    expect(enc1.crypto.kdf.salt).not.toBe(enc2.crypto.kdf.salt);
    expect(enc1.crypto.iv).not.toBe(enc2.crypto.iv);
    expect(enc1.crypto.ciphertext).not.toBe(enc2.crypto.ciphertext);
  });

  it('supports storage persistence helpers (save, get, has, clear)', async () => {
    // Setup a mock localStorage on globalThis if running in headless node
    const storageMap = new Map<string, string>();
    const mockLocalStorage = {
      getItem: (key: string) => storageMap.get(key) || null,
      setItem: (key: string, val: string) => storageMap.set(key, val),
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
    };

    // @ts-expect-error mock window
    globalThis.window = { localStorage: mockLocalStorage };

    const encrypted = await encryptVault(samplePayload, password);

    expect(await hasStoredVault()).toBe(false);
    await saveStoredVault(encrypted);
    expect(await hasStoredVault()).toBe(true);

    const retrieved = await getStoredVault();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.crypto.ciphertext).toBe(encrypted.crypto.ciphertext);

    // Decrypt retrieved
    const decrypted = await decryptVault(retrieved!, password);
    expect(decrypted.mnemonic).toBe(samplePayload.mnemonic);

    await clearStoredVault();
    expect(await hasStoredVault()).toBe(false);
    expect(await getStoredVault()).toBeNull();
  });
});
