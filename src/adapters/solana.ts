import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
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
  SolanaTokenAsset,
} from '../core/types.js';
import { NETWORKS, assertTestnet } from '../config/networks.js';
import { deriveSolana } from '../core/derive.js';
import { formatAmount } from '../core/amount.js';

export class SolanaAdapter implements LedgerAdapter {
  readonly id = 'solana';
  readonly caps = { tokens: true, memo: true };
  private connection: Connection;

  constructor() {
    this.connection = new Connection(NETWORKS.solana.rpcUrl, 'confirmed');
  }

  derive(seed: Uint8Array, index: number, _opts?: DeriveOpts): Account {
    const res = deriveSolana(seed, index);
    return {
      ledger: 'solana',
      index,
      path: res.path,
      address: res.address,
      publicKey: res.publicKey,
      privateKey: res.privateKey,
    };
  }

  async getBalance(address: string, asset: Asset): Promise<Balance> {
    const pubkey = new PublicKey(address);

    if (asset.kind === 'native') {
      const lamports = await this.connection.getBalance(pubkey);
      const raw = BigInt(lamports);
      return {
        asset,
        raw,
        formatted: formatAmount(raw, 9),
        symbol: 'SOL',
      };
    }

    const tokenAsset = asset as SolanaTokenAsset;
    const mintPubkey = new PublicKey(tokenAsset.mint);
    const ata = getAssociatedTokenAddressSync(mintPubkey, pubkey);

    try {
      const account = await getAccount(this.connection, ata);
      const raw = BigInt(account.amount.toString());
      return {
        asset,
        raw,
        formatted: formatAmount(raw, tokenAsset.decimals),
        symbol: tokenAsset.symbol || 'SPL',
      };
    } catch {
      return {
        asset,
        raw: 0n,
        formatted: '0',
        symbol: tokenAsset.symbol || 'SPL',
      };
    }
  }

  async requestAirdrop(address: string, amountSol: number = 1): Promise<string> {
    assertTestnet('solana');
    const pubkey = new PublicKey(address);
    const sig = await this.connection.requestAirdrop(pubkey, amountSol * LAMPORTS_PER_SOL);
    const latestBlockhash = await this.connection.getLatestBlockhash();
    await this.connection.confirmTransaction({
      signature: sig,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
    return sig;
  }

  async buildTransfer(p: {
    from: Account;
    to: string;
    asset: Asset;
    amount: bigint;
    opts?: TransferOpts;
  }): Promise<UnsignedTx> {
    const fromPubkey = new PublicKey(p.from.address);
    const toPubkey = new PublicKey(p.to);
    const tx = new Transaction();
    const warnings: string[] = [];

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = fromPubkey;

    if (p.asset.kind === 'native') {
      tx.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: Number(p.amount),
        })
      );
    } else {
      const tokenAsset = p.asset as SolanaTokenAsset;
      const mintPubkey = new PublicKey(tokenAsset.mint);
      const fromAta = getAssociatedTokenAddressSync(mintPubkey, fromPubkey);
      const toAta = getAssociatedTokenAddressSync(mintPubkey, toPubkey);

      // Cek apakah ATA penerima sudah ada
      const toAtaInfo = await this.connection.getAccountInfo(toAta);
      if (!toAtaInfo) {
        warnings.push('Associated Token Account (ATA) akan dibuat untuk penerima (biaya rent ≈0.00204 SOL).');
        tx.add(
          createAssociatedTokenAccountInstruction(
            fromPubkey,
            toAta,
            toPubkey,
            mintPubkey,
            TOKEN_PROGRAM_ID
          )
        );
      }

      tx.add(
        createTransferCheckedInstruction(
          fromAta,
          mintPubkey,
          toAta,
          fromPubkey,
          p.amount,
          tokenAsset.decimals,
          [],
          TOKEN_PROGRAM_ID
        )
      );
    }

    const estimatedFee = 5000n; // 5000 lamports = 0.000005 SOL

    return {
      ledger: 'solana',
      from: p.from,
      to: p.to,
      asset: p.asset,
      amount: p.amount,
      fee: {
        raw: estimatedFee,
        formatted: formatAmount(estimatedFee, 9),
        symbol: 'SOL',
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      rawPayload: { tx, lastValidBlockHeight },
    };
  }

  async sign(tx: UnsignedTx, key: Uint8Array | string): Promise<SignedTx> {
    const secretBytes = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
    const keypair = Keypair.fromSecretKey(secretBytes);
    const transaction = (tx.rawPayload as any).tx as Transaction;
    transaction.sign(keypair);

    return {
      ledger: 'solana',
      rawSerialized: transaction.serialize(),
    };
  }

  async broadcast(tx: SignedTx): Promise<{ hash: string }> {
    assertTestnet('solana');
    const raw = typeof tx.rawSerialized === 'string' ? Buffer.from(tx.rawSerialized, 'hex') : tx.rawSerialized;
    const sig = await this.connection.sendRawTransaction(raw, {
      skipPreflight: false,
    });
    return { hash: sig };
  }

  async waitConfirm(hash: string): Promise<TxStatus> {
    const latest = await this.connection.getLatestBlockhash();
    const res = await this.connection.confirmTransaction({
      signature: hash,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    });

    return {
      hash,
      status: res.value.err ? 'failed' : 'confirmed',
      explorerUrl: this.explorerTx(hash),
      error: res.value.err ? JSON.stringify(res.value.err) : undefined,
    };
  }

  explorerTx(hash: string): string {
    return `https://explorer.solana.com/tx/${hash}?cluster=devnet`;
  }
}
