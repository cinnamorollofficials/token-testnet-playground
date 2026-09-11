import type { LedgerAdapter } from './base.js';
import type {
  Account,
  Asset,
  Balance,
  UnsignedTx,
  SignedTx,
  TxStatus,
  TransferOpts,
  DeriveOpts,
} from '../core/types.js';
import { NETWORKS } from '../config/networks.js';
import { deriveBitcoin } from '../core/derive.js';
import { formatAmount } from '../core/amount.js';

export class BitcoinAdapter implements LedgerAdapter {
  readonly id = 'bitcoin';
  readonly caps = { tokens: false, memo: false };

  derive(seed: Uint8Array, index: number, _opts?: DeriveOpts): Account {
    const res = deriveBitcoin(seed, index);
    return {
      ledger: 'bitcoin',
      index,
      path: res.path,
      address: res.address,
      publicKey: res.publicKey,
      privateKey: res.privateKey,
    };
  }

  async getBalance(address: string, asset: Asset): Promise<Balance> {
    if (asset.kind === 'token') {
      throw new Error('TokensNotSupported: Bitcoin Signet does not support token layers in this phase.');
    }

    try {
      const res = await fetch(`https://mempool.space/signet/api/address/${address}`);
      if (!res.ok) {
        return { asset, raw: 0n, formatted: '0', symbol: 'sBTC' };
      }
      const data = await res.json();
      const chainSats = BigInt(data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum);
      const mempoolSats = BigInt(data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum);
      const totalSats = chainSats + mempoolSats;

      return {
        asset,
        raw: totalSats,
        formatted: formatAmount(totalSats, 8),
        symbol: 'sBTC',
      };
    } catch {
      return { asset, raw: 0n, formatted: '0', symbol: 'sBTC' };
    }
  }

  async buildTransfer(_p: {
    from: Account;
    to: string;
    asset: Asset;
    amount: bigint;
    opts?: TransferOpts;
  }): Promise<UnsignedTx> {
    throw new Error('TokensNotSupported: Token and native coin transfers on Bitcoin are deferred to later backlog phases.');
  }

  async sign(_tx: UnsignedTx, _key: Uint8Array | string): Promise<SignedTx> {
    throw new Error('Not implemented for Bitcoin in this phase.');
  }

  async broadcast(_tx: SignedTx): Promise<{ hash: string }> {
    throw new Error('Not implemented for Bitcoin in this phase.');
  }

  async waitConfirm(_hash: string): Promise<TxStatus> {
    throw new Error('Not implemented for Bitcoin in this phase.');
  }

  explorerTx(hash: string): string {
    return `${NETWORKS.bitcoin.explorerUrl}/tx/${hash}`;
  }
}
