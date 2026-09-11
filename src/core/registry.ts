import type { LedgerAdapter, LedgerId } from './types.js';
import { EVMAdapter } from '../adapters/evm.js';
import { SolanaAdapter } from '../adapters/solana.js';
import { XRPLAdapter } from '../adapters/xrpl.js';
import { BitcoinAdapter } from '../adapters/bitcoin.js';

const adapters = new Map<LedgerId, LedgerAdapter>();
let initialized = false;

export function registerAdapter(adapter: LedgerAdapter): void {
  adapters.set(adapter.id, adapter);
}

export function initDefaultAdapters(): void {
  if (initialized) return;
  registerAdapter(new EVMAdapter('ethereum'));
  registerAdapter(new EVMAdapter('polygon'));
  registerAdapter(new SolanaAdapter());
  registerAdapter(new XRPLAdapter());
  registerAdapter(new BitcoinAdapter());
  initialized = true;
}

export function getAdapter(id: LedgerId): LedgerAdapter {
  initDefaultAdapters();
  const adapter = adapters.get(id);
  if (!adapter) {
    throw new Error(`No adapter registered for ledger "${id}"`);
  }
  return adapter;
}

export function hasAdapter(id: LedgerId): boolean {
  initDefaultAdapters();
  return adapters.has(id);
}

export function getAllAdapters(): LedgerAdapter[] {
  initDefaultAdapters();
  return Array.from(adapters.values());
}
