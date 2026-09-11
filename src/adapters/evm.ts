import { JsonRpcProvider, Contract, Wallet, formatUnits, getAddress } from 'ethers';
import type { LedgerAdapter } from './base.js';
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
  EVMTokenAsset,
} from '../core/types.js';
import { NETWORKS, assertTestnet } from '../config/networks.js';
import { deriveEVM } from '../core/derive.js';
import { formatAmount } from '../core/amount.js';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

export class EVMAdapter implements LedgerAdapter {
  readonly id: LedgerId;
  readonly caps = { tokens: true, memo: false };
  private provider: JsonRpcProvider;

  constructor(id: 'ethereum' | 'polygon' | 'kaia') {
    this.id = id;
    const config = NETWORKS[id];
    this.provider = new JsonRpcProvider(config.rpcUrl);
  }

  derive(seed: Uint8Array, index: number, _opts?: DeriveOpts): Account {
    const coinType = this.id === 'kaia' ? 60 : 60;
    const res = deriveEVM(seed, index, coinType);
    return {
      ledger: this.id,
      index,
      path: res.path,
      address: res.address,
      publicKey: res.publicKey,
      privateKey: res.privateKey,
    };
  }

  async getBalance(address: string, asset: Asset): Promise<Balance> {
    const config = NETWORKS[this.id];

    if (asset.kind === 'native') {
      const raw = await this.provider.getBalance(address);
      return {
        asset,
        raw,
        formatted: formatUnits(raw, config.nativeAsset.decimals),
        symbol: config.nativeAsset.symbol,
      };
    }

    const tokenAsset = asset as EVMTokenAsset;
    let targetAddress = tokenAsset.address;
    try {
      targetAddress = getAddress(tokenAsset.address);
    } catch {
      // keep original
    }

    try {
      const contract = new Contract(targetAddress, ERC20_ABI, this.provider);
      const raw: bigint = await contract.balanceOf(address);
      return {
        asset: { ...tokenAsset, address: targetAddress },
        raw,
        formatted: formatAmount(raw, tokenAsset.decimals),
        symbol: tokenAsset.symbol,
      };
    } catch (err) {
      console.warn(`[EVMAdapter] Gagal mengambil saldo token di ${targetAddress}:`, err);
      return {
        asset: { ...tokenAsset, address: targetAddress },
        raw: 0n,
        formatted: '0.00',
        symbol: tokenAsset.symbol,
      };
    }
  }

  async buildTransfer(p: {
    from: Account;
    to: string;
    asset: Asset;
    amount: bigint;
    opts?: TransferOpts;
  }): Promise<UnsignedTx> {
    const config = NETWORKS[this.id];
    const feeData = await this.provider.getFeeData();
    const nonce = await this.provider.getTransactionCount(p.from.address, 'pending');

    let toAddress = p.to;
    let data = '0x';
    let value = 0n;

    if (p.asset.kind === 'native') {
      value = p.amount;
    } else {
      const tokenAsset = p.asset as EVMTokenAsset;
      toAddress = tokenAsset.address;
      const iface = new Contract(tokenAsset.address, ERC20_ABI).interface;
      data = iface.encodeFunctionData('transfer', [p.to, p.amount]);
    }

    const txPayload = {
      to: toAddress,
      value,
      data,
      nonce,
      chainId: config.chainId,
      type: 2, // EIP-1559
      maxFeePerGas: feeData.maxFeePerGas || 3000000000n,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || 1500000000n,
    };

    const estimatedGas = await this.provider.estimateGas({
      ...txPayload,
      from: p.from.address,
    }).catch(() => 65000n);

    // Buffer 20% gas
    const gasLimit = (estimatedGas * 120n) / 100n;
    const maxFee = txPayload.maxFeePerGas;
    const totalFee = gasLimit * maxFee;

    const warnings: string[] = [];
    const nativeBal = await this.provider.getBalance(p.from.address);

    if (p.asset.kind === 'native' && nativeBal < p.amount + totalFee) {
      warnings.push(`Saldo ${config.nativeAsset.symbol} tidak mencukupi untuk nominal transfer + estimasi fee gas.`);
    } else if (nativeBal < totalFee) {
      warnings.push(`Saldo ${config.nativeAsset.symbol} tidak mencukupi untuk membayar fee gas.`);
    }

    return {
      ledger: this.id,
      from: p.from,
      to: p.to,
      asset: p.asset,
      amount: p.amount,
      fee: {
        raw: totalFee,
        formatted: formatUnits(totalFee, 18),
        symbol: config.nativeAsset.symbol,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      rawPayload: { ...txPayload, gasLimit },
    };
  }

  async sign(tx: UnsignedTx, key: Uint8Array | string): Promise<SignedTx> {
    const privKey = typeof key === 'string' ? key : `0x${Buffer.from(key).toString('hex')}`;
    const wallet = new Wallet(privKey);
    const rawSerialized = await wallet.signTransaction(tx.rawPayload as any);
    return {
      ledger: this.id,
      rawSerialized,
    };
  }

  async broadcast(tx: SignedTx): Promise<{ hash: string }> {
    assertTestnet(this.id);
    const res = await this.provider.broadcastTransaction(tx.rawSerialized as string);
    return { hash: res.hash };
  }

  async waitConfirm(hash: string): Promise<TxStatus> {
    const receipt = await this.provider.waitForTransaction(hash, 1, 60000);
    const isSuccess = receipt?.status === 1;
    return {
      hash,
      status: isSuccess ? 'confirmed' : 'failed',
      blockNumber: receipt?.blockNumber,
      explorerUrl: this.explorerTx(hash),
    };
  }

  explorerTx(hash: string): string {
    return `${NETWORKS[this.id].explorerUrl}/tx/${hash}`;
  }
}
