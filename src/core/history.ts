import type { LedgerId } from './types.js';

export type TxType = 'send' | 'receive' | 'faucet' | 'mint';
export type TxStatus = 'pending' | 'confirmed' | 'failed';

export interface TransactionRecord {
  id: string;
  hash: string;
  ledger: LedgerId;
  type: TxType;
  assetSymbol: string;
  amount: string;
  from: string;
  to: string;
  timestamp: number;
  status: TxStatus;
  idrRate?: number;
  idrValue?: number;
  explorerUrl?: string;
  memo?: string;
}

export interface TxFilterOptions {
  ledger?: LedgerId | 'all';
  address?: string;
  type?: TxType;
}

const STORAGE_KEY = 'testnet_pg_tx_history_v1';
const MAX_HISTORY_ITEMS = 100;

// In-memory fallback untuk lingkungan non-browser (Node.js, unit tests)
let inMemoryTxs: TransactionRecord[] = [];

/**
 * Memeriksa apakah localStorage tersedia dan dapat diakses.
 */
function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Membaca seluruh transaksi dari storage.
 */
export function getAllTransactions(): TransactionRecord[] {
  if (isLocalStorageAvailable()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[history] Gagal membaca localStorage:', e);
    }
  }
  return [...inMemoryTxs];
}

/**
 * Menyimpan array transaksi ke storage.
 */
function persistTransactions(txs: TransactionRecord[]): void {
  // Batasi jumlah riwayat maksimal agar performa tetap optimal
  const trimmed = txs.slice(0, MAX_HISTORY_ITEMS);
  inMemoryTxs = [...trimmed];

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[history] Gagal menyimpan ke localStorage:', e);
    }
  }
}

/**
 * Menyimpan transaksi baru ke riwayat (diletakkan di urutan paling awal).
 */
export function saveTransaction(tx: Omit<TransactionRecord, 'id'> & { id?: string }): TransactionRecord {
  const all = getAllTransactions();
  const id = tx.id || tx.hash || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const newRecord: TransactionRecord = {
    ...tx,
    id,
    timestamp: tx.timestamp || Date.now(),
  };

  // Hapus transaksi jika hash/id yang sama sudah ada (untuk update)
  const filtered = all.filter((item) => item.id !== id && (item.hash ? item.hash !== newRecord.hash : true));
  const updated = [newRecord, ...filtered];

  persistTransactions(updated);
  return newRecord;
}

/**
 * Mengambil daftar riwayat transaksi berdasarkan filter yang diberikan.
 */
export function getTransactions(filter?: TxFilterOptions): TransactionRecord[] {
  const all = getAllTransactions();
  if (!filter) return all;

  return all.filter((tx) => {
    if (filter.ledger && filter.ledger !== 'all' && tx.ledger !== filter.ledger) {
      return false;
    }
    if (filter.address) {
      const targetAddr = filter.address.toLowerCase();
      const fromMatch = tx.from?.toLowerCase() === targetAddr;
      const toMatch = tx.to?.toLowerCase() === targetAddr;
      if (!fromMatch && !toMatch) {
        return false;
      }
    }
    if (filter.type && tx.type !== filter.type) {
      return false;
    }
    return true;
  });
}

/**
 * Memperbarui status transaksi (misal dari pending -> confirmed atau failed).
 */
export function updateTransactionStatus(hashOrId: string, status: TxStatus): boolean {
  const all = getAllTransactions();
  let found = false;

  const updated = all.map((tx) => {
    if (tx.id === hashOrId || tx.hash === hashOrId) {
      found = true;
      return { ...tx, status };
    }
    return tx;
  });

  if (found) {
    persistTransactions(updated);
  }
  return found;
}

/**
 * Menghapus seluruh riwayat transaksi (atau riwayat per ledger).
 */
export function clearTransactions(filter?: { ledger?: LedgerId | 'all' }): void {
  if (!filter || filter.ledger === 'all' || !filter.ledger) {
    persistTransactions([]);
  } else {
    const all = getAllTransactions();
    const remaining = all.filter((tx) => tx.ledger !== filter.ledger);
    persistTransactions(remaining);
  }
}

/**
 * Format waktu relatif untuk tampilan UI (misal: "Baru saja", "5 mnt lalu", "2 jam lalu").
 */
export function formatTxRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 45) return 'Baru saja';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
  
  const d = new Date(timestamp);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
