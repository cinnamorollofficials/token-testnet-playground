import { HDKey as Bip32HDKey } from '@scure/bip32';
import { HDKey as Slip10HDKey } from 'micro-key-producer/slip10.js';
import { computeAddress } from 'ethers';
import { Keypair } from '@solana/web3.js';
import { deriveAddress as deriveXrplAddress } from 'xrpl';
import { p2wpkh, TEST_NETWORK } from '@scure/btc-signer';
import type { Account, DeriveOpts, LedgerId } from './types.js';

export interface DerivationResult {
  readonly path: string;
  readonly address: string;
  readonly publicKey: string;
  readonly privateKey: string;
}

/**
 * Derivasi EVM (Ethereum, Polygon, Kaia-OptionA/B).
 * Menggunakan standar BIP-44: m/44'/{coinType}'/0'/0/{index}
 */
export function deriveEVM(seed: Uint8Array, index: number, coinType: number = 60): DerivationResult {
  const path = `m/44'/${coinType}'/0'/0/${index}`;
  const bip32 = Bip32HDKey.fromMasterSeed(seed);
  const child = bip32.derive(path);

  if (!child.privateKey || !child.publicKey) {
    throw new Error(`Failed to derive keypair for path: ${path}`);
  }

  const privKeyHex = `0x${Buffer.from(child.privateKey).toString('hex')}`;
  // Hitung address EIP-55 dari uncompressed public key
  const address = computeAddress(privKeyHex);
  const pubKeyHex = Buffer.from(child.publicKey).toString('hex');

  return {
    path,
    address,
    publicKey: pubKeyHex,
    privateKey: privKeyHex,
  };
}

/**
 * Derivasi Solana menggunakan SLIP-0010 (ed25519).
 * Path: m/44'/501'/{index}'/0' (Wajib all-hardened)
 */
export function deriveSolana(seed: Uint8Array, index: number): DerivationResult {
  const path = `m/44'/501'/${index}'/0'`;
  const slip10 = Slip10HDKey.fromMasterSeed(seed);
  const child = slip10.derive(path);

  if (!child.privateKey) {
    throw new Error(`Failed to derive private key for Solana path: ${path}`);
  }

  // Keypair Solana dibangun dari 32-byte private key ed25519
  const keypair = Keypair.fromSeed(child.privateKey);
  const address = keypair.publicKey.toBase58();
  const pubKeyHex = Buffer.from(keypair.publicKey.toBytes()).toString('hex');
  const privKeyHex = Buffer.from(keypair.secretKey).toString('hex');

  return {
    path,
    address,
    publicKey: pubKeyHex,
    privateKey: privKeyHex,
  };
}

/**
 * Derivasi XRPL menggunakan BIP-32 secp256k1.
 * Path: m/44'/144'/0'/0/{index}
 * Menghasilkan classic address r...
 */
export function deriveXRPL(seed: Uint8Array, index: number): DerivationResult {
  const path = `m/44'/144'/0'/0/${index}`;
  const bip32 = Bip32HDKey.fromMasterSeed(seed);
  const child = bip32.derive(path);

  if (!child.privateKey || !child.publicKey) {
    throw new Error(`Failed to derive keypair for XRPL path: ${path}`);
  }

  const pubKeyHex = Buffer.from(child.publicKey).toString('hex').toUpperCase();
  const address = deriveXrplAddress(pubKeyHex);
  // xrpl secp256k1 key diawali prefix '00'
  const privKeyHex = `00${Buffer.from(child.privateKey).toString('hex').toUpperCase()}`;

  return {
    path,
    address,
    publicKey: pubKeyHex,
    privateKey: privKeyHex,
  };
}

/**
 * Derivasi Bitcoin Signet menggunakan BIP-84 (Native SegWit / P2WPKH).
 * Path: m/84'/1'/0'/0/{index} (coin type 1' untuk testnet/signet)
 * Menghasilkan bech32 address tb1q...
 */
export function deriveBitcoin(seed: Uint8Array, index: number): DerivationResult {
  const path = `m/84'/1'/0'/0/${index}`;
  const bip32 = Bip32HDKey.fromMasterSeed(seed);
  const child = bip32.derive(path);

  if (!child.privateKey || !child.publicKey) {
    throw new Error(`Failed to derive keypair for Bitcoin path: ${path}`);
  }

  const payment = p2wpkh(child.publicKey, TEST_NETWORK);
  if (!payment.address) {
    throw new Error(`Failed to generate Bech32 address for Bitcoin path: ${path}`);
  }

  const pubKeyHex = Buffer.from(child.publicKey).toString('hex');
  const privKeyHex = Buffer.from(child.privateKey).toString('hex');

  return {
    path,
    address: payment.address,
    publicKey: pubKeyHex,
    privateKey: privKeyHex,
  };
}

/**
 * Router derivasi terpadu berdasarkan LedgerId.
 */
export function deriveAccount(
  ledger: LedgerId,
  seed: Uint8Array,
  index: number,
  _opts?: DeriveOpts
): Account {
  let res: DerivationResult;

  switch (ledger) {
    case 'ethereum':
      res = deriveEVM(seed, index, 60);
      break;
    case 'polygon':
      res = deriveEVM(seed, index, 60);
      break;
    case 'solana':
      res = deriveSolana(seed, index);
      break;
    case 'xrpl':
      res = deriveXRPL(seed, index);
      break;
    case 'bitcoin':
      res = deriveBitcoin(seed, index);
      break;
    case 'bitcoin-t4':
      // Sama dengan Signet — BIP-84 coin type 1' berlaku di semua Bitcoin testnet
      res = deriveBitcoin(seed, index);
      break;
    case 'kaia':
      // Default Kaia coin type 60 (Option A) atau 8217 (Option B) jika ditentukan
      res = deriveEVM(seed, index, 60);
      break;
    default:
      throw new Error(`Unsupported ledger for derivation: ${ledger}`);
  }

  return {
    ledger,
    index,
    path: res.path,
    address: res.address,
    publicKey: res.publicKey,
    privateKey: res.privateKey,
  };
}
