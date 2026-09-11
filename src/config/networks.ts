import type { LedgerId } from '../core/types.js';

export interface NetworkConfig {
  readonly id: LedgerId;
  readonly name: string;
  readonly testnetName: string;
  readonly chainId?: number;
  readonly networkId: string | number;
  readonly rpcUrl: string;
  readonly explorerUrl: string;
  readonly faucetUrl: string;
  readonly nativeAsset: {
    readonly symbol: string;
    readonly decimals: number;
  };
  readonly supportsAutoFaucet: boolean;
}

export const ALLOWLISTED_TESTNET_IDS: ReadonlySet<string | number> = new Set([
  11155111,          // Ethereum Sepolia
  80002,             // Polygon Amoy
  'solana-devnet',   // Solana Devnet
  'xrpl-testnet',    // XRPL Testnet
  'btc-signet',      // Bitcoin Signet
  1001,              // Kaia Kairos (future/backlog)
]);

export const NETWORKS: Record<LedgerId, NetworkConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    testnetName: 'Sepolia',
    chainId: 11155111,
    networkId: 11155111,
    rpcUrl: process.env.ETH_SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    faucetUrl: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
    nativeAsset: {
      symbol: 'ETH',
      decimals: 18,
    },
    supportsAutoFaucet: false,
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    testnetName: 'Amoy',
    chainId: 80002,
    networkId: 80002,
    rpcUrl: process.env.POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology',
    explorerUrl: 'https://amoy.polygonscan.com',
    faucetUrl: 'https://faucet.polygon.technology',
    nativeAsset: {
      symbol: 'POL',
      decimals: 18,
    },
    supportsAutoFaucet: false,
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    testnetName: 'Devnet',
    networkId: 'solana-devnet',
    rpcUrl: process.env.SOLANA_DEVNET_RPC || 'https://api.devnet.solana.com',
    explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
    faucetUrl: 'https://faucet.solana.com',
    nativeAsset: {
      symbol: 'SOL',
      decimals: 9,
    },
    supportsAutoFaucet: true,
  },
  xrpl: {
    id: 'xrpl',
    name: 'XRPL',
    testnetName: 'Testnet',
    networkId: 'xrpl-testnet',
    rpcUrl: process.env.XRPL_TESTNET_RPC || 'wss://s.altnet.rippletest.net:51233',
    explorerUrl: 'https://testnet.xrpscan.com',
    faucetUrl: 'https://faucet.altnet.rippletest.net/accounts',
    nativeAsset: {
      symbol: 'XRP',
      decimals: 6,
    },
    supportsAutoFaucet: true,
  },
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin',
    testnetName: 'Signet',
    networkId: 'btc-signet',
    rpcUrl: process.env.BITCOIN_SIGNET_EXPLORER || 'https://mempool.space/signet/api',
    explorerUrl: 'https://mempool.space/signet',
    faucetUrl: 'https://signetfaucet.com',
    nativeAsset: {
      symbol: 'sBTC',
      decimals: 8,
    },
    supportsAutoFaucet: false,
  },
  kaia: {
    id: 'kaia',
    name: 'Kaia',
    testnetName: 'Kairos',
    chainId: 1001,
    networkId: 1001,
    rpcUrl: 'https://public-en-kairos.node.kaia.io',
    explorerUrl: 'https://kairos.kaiascan.io',
    faucetUrl: 'https://faucet.kaia.io',
    nativeAsset: {
      symbol: 'KAIA',
      decimals: 18,
    },
    supportsAutoFaucet: false,
  },
};

/**
 * Validasi ketat bahwa eksekusi hanya berjalan di testnet yang diizinkan.
 * Mencegah kesalahan fatal pengiriman transaksi ke mainnet.
 */
export function assertTestnet(ledger: LedgerId, networkIdentifier?: string | number): void {
  const config = NETWORKS[ledger];
  if (!config) {
    throw new Error(`[assertTestnet] Unsupported ledger: ${ledger}`);
  }

  const idToCheck = networkIdentifier ?? config.networkId;
  if (!ALLOWLISTED_TESTNET_IDS.has(idToCheck)) {
    throw new Error(
      `[SECURITY ERROR] Blocked execution on non-testnet network: "${idToCheck}" for ledger "${ledger}". Only allowed testnets: ${Array.from(ALLOWLISTED_TESTNET_IDS).join(', ')}`
    );
  }
}
