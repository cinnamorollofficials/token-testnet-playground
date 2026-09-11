import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { createHash } from 'node:crypto';

export const TESTNET_WARNING_BANNER = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                            ⚠️  TESTNET ONLY  ⚠️                              ║
║  Playground ini HANYA untuk lingkungan pengujian testnet.                    ║
║  JANGAN PERNAH gunakan seed phrase ini untuk menyimpan aset bernilai nyata!  ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;

/**
 * Generate BIP-39 mnemonic phrase.
 * @param words 12 (128-bit entropy) atau 24 (256-bit entropy). Default 12.
 */
export function generate(words: 12 | 24 = 12): string {
  const strength = words === 24 ? 256 : 128;
  return generateMnemonic(wordlist, strength);
}

/**
 * Validasi apakah suatu mnemonic memenuhi standar BIP-39 (wordlist & checksum).
 */
export function validate(mnemonic: string): boolean {
  if (!mnemonic || typeof mnemonic !== 'string') return false;
  const normalized = mnemonic.trim().replace(/\s+/g, ' ');
  return validateMnemonic(normalized, wordlist);
}

/**
 * Konversi mnemonic ke 64-byte master seed.
 * Sesuai PLAN.md §1a: passphrase selalu kosong ("") secara default.
 */
export function toSeed(mnemonic: string, passphrase: string = ''): Uint8Array {
  const normalized = mnemonic.trim().replace(/\s+/g, ' ');
  if (!validate(normalized)) {
    throw new Error('Invalid BIP-39 mnemonic phrase (checksum or wordlist mismatch)');
  }
  return mnemonicToSeedSync(normalized, passphrase);
}

/**
 * Menghasilkan fingerprint 8-karakter hex (SHA-256) dari seed atau mnemonic.
 * PENTING: Jangan pernah mencetak mnemonic asli ke terminal/log saat menampilkan info seed.
 */
export function getFingerprint(seedOrMnemonic: Uint8Array | string): string {
  let seed: Uint8Array;
  if (typeof seedOrMnemonic === 'string') {
    seed = toSeed(seedOrMnemonic);
  } else {
    seed = seedOrMnemonic;
  }
  return createHash('sha256').update(seed).digest('hex').slice(0, 8);
}
