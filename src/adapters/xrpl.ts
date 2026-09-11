import { Client, Wallet as XrplWallet, xrpToDrops, dropsToXrp } from 'xrpl';
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
  XRPLTokenAsset,
} from '../core/types.js';
import { NETWORKS, assertTestnet } from '../config/networks.js';
import { deriveXRPL } from '../core/derive.js';
import { parseAmount, formatAmount } from '../core/amount.js';

export class XRPLAdapter implements LedgerAdapter {
  readonly id = 'xrpl';
  readonly caps = { tokens: true, memo: true };
  private client: Client;

  constructor() {
    this.client = new Client(NETWORKS.xrpl.rpcUrl);
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
  }

  derive(seed: Uint8Array, index: number, _opts?: DeriveOpts): Account {
    const res = deriveXRPL(seed, index);
    return {
      ledger: 'xrpl',
      index,
      path: res.path,
      address: res.address,
      publicKey: res.publicKey,
      privateKey: res.privateKey,
    };
  }

  async getBalance(address: string, asset: Asset): Promise<Balance> {
    await this.ensureConnected();

    if (asset.kind === 'native') {
      try {
        const xrpVal = await this.client.getXrpBalance(address);
        const drops = BigInt(xrpToDrops(xrpVal));
        return {
          asset,
          raw: drops,
          formatted: xrpVal.toString(),
          symbol: 'XRP',
        };
      } catch (err: any) {
        // Account unfunded yet
        if (err?.data?.error === 'actNotFound') {
          return { asset, raw: 0n, formatted: '0', symbol: 'XRP' };
        }
        throw err;
      }
    }

    const tokenAsset = asset as XRPLTokenAsset;
    try {
      const balances = await this.client.getBalances(address);
      const found = balances.find(
        (b) => b.currency === tokenAsset.currency && (!tokenAsset.issuer || b.issuer === tokenAsset.issuer)
      );
      if (!found) {
        return { asset, raw: 0n, formatted: '0', symbol: tokenAsset.currency };
      }
      const raw = parseAmount(found.value, 6);
      return {
        asset,
        raw,
        formatted: found.value,
        symbol: tokenAsset.currency,
      };
    } catch {
      return { asset, raw: 0n, formatted: '0', symbol: tokenAsset.currency };
    }
  }

  async fundWallet(account: Account): Promise<{ address: string; balance: number }> {
    assertTestnet('xrpl');
    await this.ensureConnected();
    if (!account.privateKey) {
      throw new Error('Private key is required to fund XRPL wallet');
    }
    const wallet = new XrplWallet(account.publicKey, account.privateKey);
    const result = await this.client.fundWallet(wallet);
    return {
      address: result.wallet.classicAddress,
      balance: result.balance,
    };
  }

  async buildTransfer(p: {
    from: Account;
    to: string;
    asset: Asset;
    amount: bigint;
    opts?: TransferOpts;
  }): Promise<UnsignedTx> {
    await this.ensureConnected();
    const warnings: string[] = [];

    let txAmount: any;
    if (p.asset.kind === 'native') {
      txAmount = p.amount.toString(); // in drops
    } else {
      const tokenAsset = p.asset as XRPLTokenAsset;
      txAmount = {
        currency: tokenAsset.currency,
        issuer: tokenAsset.issuer,
        value: formatAmount(p.amount, 6),
      };
    }

    const paymentTx: any = {
      TransactionType: 'Payment',
      Account: p.from.address,
      Destination: p.to,
      Amount: txAmount,
    };

    if (p.opts?.destinationTag !== undefined) {
      paymentTx.DestinationTag = p.opts.destinationTag;
    }

    const prepared = await this.client.autofill(paymentTx);
    const feeDrops = BigInt(prepared.Fee || '12');

    return {
      ledger: 'xrpl',
      from: p.from,
      to: p.to,
      asset: p.asset,
      amount: p.amount,
      fee: {
        raw: feeDrops,
        formatted: dropsToXrp(feeDrops.toString()).toString(),
        symbol: 'XRP',
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      rawPayload: prepared,
    };
  }

  async sign(tx: UnsignedTx, key: Uint8Array | string): Promise<SignedTx> {
    const privHex = typeof key === 'string' ? key : `00${Buffer.from(key).toString('hex').toUpperCase()}`;
    const pubHex = tx.from.publicKey;
    const wallet = new XrplWallet(pubHex, privHex);
    const signed = wallet.sign(tx.rawPayload as any);

    return {
      ledger: 'xrpl',
      hash: signed.hash,
      rawSerialized: signed.tx_blob,
    };
  }

  async broadcast(tx: SignedTx): Promise<{ hash: string }> {
    assertTestnet('xrpl');
    await this.ensureConnected();
    const res = await this.client.submitAndWait(tx.rawSerialized as string);
    const hash = tx.hash || (res.result as any).hash;
    return { hash };
  }

  async waitConfirm(hash: string): Promise<TxStatus> {
    await this.ensureConnected();
    const res = await this.client.request({
      command: 'tx',
      transaction: hash,
    });

    const meta = res.result.meta;
    const isSuccess = typeof meta === 'object' && meta !== null && (meta as any).TransactionResult === 'tesSUCCESS';

    return {
      hash,
      status: isSuccess ? 'confirmed' : 'failed',
      explorerUrl: this.explorerTx(hash),
    };
  }

  explorerTx(hash: string): string {
    return `https://testnet.xrpscan.com/tx/${hash}`;
  }
}
