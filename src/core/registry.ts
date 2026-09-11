import type { LedgerAdapter, LedgerId } from './types.js';

const adapters = new Map<LedgerId, LedgerAdapter>();

export function registerAdapter(adapter: LedgerAdapter): void {
  adapters.set(adapter.id, adapter);
}

export function getAdapter(id: LedgerId): LedgerAdapter {
  const adapter = adapters.get(id);
  if (!adapter) {
    throw new Error(`No adapter registered for ledger "${id}"`);
  }
  return adapter;
}

export function hasAdapter(id: LedgerId): boolean {
  return adapters.has(id);
}

export function getAllAdapters(): LedgerAdapter[] {
  return Array.from(adapters.values());
}
