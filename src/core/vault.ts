import type { EncryptedVault, VaultPayload } from './types.js';

export const VAULT_STORAGE_KEY = 'pg_vault_v1';
export const PBKDF2_ITERATIONS = 100_000;

/**
 * Konversi Uint8Array ke Base64 string (browser & node kompatibel).
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Konversi Base64 string ke Uint8Array (browser & node kompatibel).
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Mendapatkan instance SubtleCrypto native dari global scope.
 */
function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  throw new Error('Web Crypto API (crypto.subtle) is not available in this environment');
}

/**
 * Turunkan enkripsi key AES-GCM dari password dan salt menggunakan PBKDF2.
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();
  const passwordKey = await subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Enkripsi payload wallet menjadi EncryptedVault dengan AES-256-GCM.
 */
export async function encryptVault(
  payload: VaultPayload,
  password: string,
  fingerprint?: string
): Promise<EncryptedVault> {
  const subtle = getSubtleCrypto();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassword(password, salt, PBKDF2_ITERATIONS);

  const enc = new TextEncoder();
  const encodedPayload = enc.encode(JSON.stringify(payload));

  const encryptedBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encodedPayload
  );

  return {
    version: 1,
    crypto: {
      cipher: 'aes-256-gcm',
      ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedBuffer)),
      iv: uint8ArrayToBase64(iv),
      kdf: {
        algorithm: 'PBKDF2',
        hash: 'SHA-256',
        iterations: PBKDF2_ITERATIONS,
        salt: uint8ArrayToBase64(salt),
      },
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fingerprint,
    },
  };
}

/**
 * Dekripsi EncryptedVault kembali ke VaultPayload.
 * Otomatis melempar error jika password salah atau data di-tamper.
 */
export async function decryptVault(
  vault: EncryptedVault,
  password: string
): Promise<VaultPayload> {
  if (vault.version !== 1 || vault.crypto.cipher !== 'aes-256-gcm') {
    throw new Error('Unsupported vault version or cipher');
  }

  const subtle = getSubtleCrypto();
  const salt = base64ToUint8Array(vault.crypto.kdf.salt);
  const iv = base64ToUint8Array(vault.crypto.iv);
  const ciphertext = base64ToUint8Array(vault.crypto.ciphertext);

  const key = await deriveKeyFromPassword(
    password,
    salt,
    vault.crypto.kdf.iterations || PBKDF2_ITERATIONS
  );

  try {
    const decryptedBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ciphertext as unknown as BufferSource
    );

    const dec = new TextDecoder();
    const jsonString = dec.decode(decryptedBuffer);
    const parsed = JSON.parse(jsonString) as VaultPayload;
    if (!parsed || typeof parsed.mnemonic !== 'string') {
      throw new Error('Invalid vault payload format');
    }
    return parsed;
  } catch {
    throw new Error('Password salah atau data vault rusak');
  }
}

/**
 * Simpan EncryptedVault ke browser storage (chrome.storage.local atau localStorage).
 */
export async function saveStoredVault(vault: EncryptedVault): Promise<void> {
  const serialized = JSON.stringify(vault);

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set({ [VAULT_STORAGE_KEY]: serialized }, () => {
          if (chrome.runtime?.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
    } catch {
      // Fallback to localStorage
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(VAULT_STORAGE_KEY, serialized);
    } catch (e) {
      console.warn('[vault] Failed to save vault to localStorage:', e);
    }
  }
}

/**
 * Ambil EncryptedVault dari storage browser.
 */
export async function getStoredVault(): Promise<EncryptedVault | null> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const raw = await new Promise<string | undefined>((resolve) => {
        chrome.storage.local.get([VAULT_STORAGE_KEY], (items: Record<string, unknown>) => {
          if (chrome.runtime?.lastError) resolve(undefined);
          else resolve(typeof items?.[VAULT_STORAGE_KEY] === 'string' ? items[VAULT_STORAGE_KEY] : undefined);
        });
      });
      if (raw) {
        return JSON.parse(raw) as EncryptedVault;
      }
    } catch {
      // Fallback to localStorage
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(VAULT_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as EncryptedVault;
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

/**
 * Hapus EncryptedVault dari storage browser.
 */
export async function clearStoredVault(): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      await new Promise<void>((resolve) => {
        chrome.storage.local.remove([VAULT_STORAGE_KEY], () => resolve());
      });
    } catch {
      // Ignore
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(VAULT_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Cek apakah terdapat EncryptedVault di storage.
 */
export async function hasStoredVault(): Promise<boolean> {
  const vault = await getStoredVault();
  return vault !== null;
}
