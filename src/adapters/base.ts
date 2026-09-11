import type {
  LedgerId,
  Account,
  Asset,
  Balance,
  UnsignedTx,
  SignedTx,
  TxStatus,
  TransferOpts,
  DeriveOpts,
  LedgerCaps,
} from '../core/types.js';

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
