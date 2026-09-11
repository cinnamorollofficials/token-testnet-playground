import { isAddress } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { isValidClassicAddress } from 'xrpl';
import type { LedgerId } from './types.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAddress(ledger: LedgerId, address: string): ValidationResult {
  const trimmed = address.trim();
  if (!trimmed) {
    return { valid: false, error: 'Address tidak boleh kosong.' };
  }

  // Cross-chain mismatch detections:
  // 1. Ethereum / Polygon address (0x...) pasted into Solana / XRPL / Bitcoin
  if (trimmed.startsWith('0x') && ledger !== 'ethereum' && ledger !== 'polygon' && ledger !== 'kaia') {
    return { valid: false, error: `Address hex (0x...) bukan format address yang sah untuk ledger ${ledger}.` };
  }

  // 2. Bitcoin mainnet address (bc1...) accidentally used in testnet
  if (trimmed.startsWith('bc1') || trimmed.startsWith('1') || trimmed.startsWith('3')) {
    return { valid: false, error: 'Address Bitcoin mainnet terdeteksi! Hanya address testnet/signet (tb1q...) yang diizinkan.' };
  }

  // 3. Solana base58 pasted into EVM
  if (!trimmed.startsWith('0x') && (ledger === 'ethereum' || ledger === 'polygon' || ledger === 'kaia')) {
    return { valid: false, error: `Address untuk ${ledger} harus diawali dengan '0x' (format EVM).` };
  }

  switch (ledger) {
    case 'ethereum':
    case 'polygon':
    case 'kaia': {
      const lower = (trimmed as string).toLowerCase();
      if (!isAddress(trimmed) && !isAddress(lower)) {
        return { valid: false, error: `Format address ${ledger} tidak valid (harus berupa address EVM 42-karakter yang sah).` };
      }
      return { valid: true };
    }

    case 'solana':
      try {
        const pubkey = new PublicKey(trimmed);
        if (!PublicKey.isOnCurve(pubkey.toBytes())) {
          return { valid: false, error: 'Public key Solana tidak berada pada kurva ed25519 yang valid.' };
        }
        return { valid: true };
      } catch {
        return { valid: false, error: 'Format address Solana tidak valid (harus berupa Base58 sepanjang 32 byte).' };
      }

    case 'xrpl':
      if (!isValidClassicAddress(trimmed)) {
        return { valid: false, error: 'Format classic address XRPL tidak valid (harus diawali dengan "r" dan checksum sesuai).' };
      }
      return { valid: true };

    case 'bitcoin':
      if (!trimmed.startsWith('tb1q')) {
        return { valid: false, error: 'Address Bitcoin Signet harus menggunakan standar Native SegWit (bech32) berawalan "tb1q".' };
      }
      if (trimmed.length < 42 || trimmed.length > 62) {
        return { valid: false, error: 'Panjang karakter address bech32 Bitcoin tidak valid.' };
      }
      return { valid: true };

    default:
      return { valid: false, error: `Ledger ${ledger} tidak didukung.` };
  }
}
