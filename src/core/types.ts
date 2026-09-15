export type LedgerId = 'ethereum' | 'polygon' | 'solana' | 'xrpl' | 'bitcoin' | 'bitcoin-t4' | 'kaia';

export interface Account {
  readonly ledger: LedgerId;
  readonly index: number;
  readonly path: string;
  readonly address: string;
  readonly publicKey: string;
  readonly privateKey?: string;
}

export type AssetKind = 'native' | 'token';

export interface NativeAsset {
  readonly kind: 'native';
  readonly symbol?: string;
  readonly decimals?: number;
}

export interface EVMTokenAsset {
  readonly kind: 'token';
  readonly address: string;
  readonly decimals: number;
  readonly symbol: string;
}

export interface SolanaTokenAsset {
  readonly kind: 'token';
  readonly mint: string;
  readonly decimals: number;
  readonly symbol?: string;
  readonly programId?: 'TOKEN' | 'TOKEN_2022';
}

export interface XRPLTokenAsset {
  readonly kind: 'token';
  readonly currency: string;
  readonly issuer: string;
  readonly decimals?: number;
  readonly symbol?: string;
}

export type TokenAsset = EVMTokenAsset | SolanaTokenAsset | XRPLTokenAsset;
export type Asset = NativeAsset | TokenAsset;

export interface Balance {
  readonly asset: Asset;
  readonly raw: bigint;
  readonly formatted: string;
  readonly symbol: string;
}

export interface UnsignedTx {
  readonly ledger: LedgerId;
  readonly from: Account;
  readonly to: string;
  readonly asset: Asset;
  readonly amount: bigint;
  readonly fee: {
    readonly raw: bigint;
    readonly formatted: string;
    readonly symbol: string;
  };
  readonly warnings?: string[];
  readonly rawPayload: unknown;
}

export interface SignedTx {
  readonly ledger: LedgerId;
  readonly hash?: string;
  readonly rawSerialized: string | Uint8Array;
}

export type TxStatusState = 'pending' | 'confirmed' | 'failed' | 'unknown';

export interface TxStatus {
  readonly hash: string;
  readonly status: TxStatusState;
  readonly blockNumber?: number;
  readonly confirmations?: number;
  readonly explorerUrl?: string;
  readonly error?: string;
}

export interface TransferOpts {
  dryRun?: boolean;
  memo?: string;
  destinationTag?: number;
}

export interface DeriveOpts {
  allHardened?: boolean;
}

export interface LedgerCaps {
  readonly tokens: boolean;
  readonly memo: boolean;
}

export interface LedgerAdapter {
  readonly id: LedgerId;
  readonly caps: LedgerCaps;

  derive(seed: Uint8Array, index: number, opts?: DeriveOpts): Account;
  getBalance(address: string, asset: Asset): Promise<Balance>;

  buildTransfer(p: {
    from: Account;
    to: string;
    asset: Asset;
    amount: bigint;
    opts?: TransferOpts;
  }): Promise<UnsignedTx>;

  sign(tx: UnsignedTx, key: Uint8Array | string): Promise<SignedTx>;
  broadcast(tx: SignedTx): Promise<{ hash: string }>;
  waitConfirm(hash: string): Promise<TxStatus>;
  explorerTx(hash: string): string;
}

export interface VaultPayload {
  mnemonic: string;
  activeAccountIndex: number;
  createdAt: string;
}

export interface EncryptedVault {
  version: 1;
  crypto: {
    cipher: 'aes-256-gcm';
    ciphertext: string; // Base64
    iv: string;         // Base64
    kdf: {
      algorithm: 'PBKDF2';
      hash: 'SHA-256';
      iterations: number;
      salt: string;     // Base64
    };
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    fingerprint?: string;
  };
}
