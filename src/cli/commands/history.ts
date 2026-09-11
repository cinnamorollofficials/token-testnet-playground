import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { printTable } from '../utils/table.js';
import { toSeed } from '../../core/mnemonic.js';
import { deriveAccount } from '../../core/derive.js';
import { NETWORKS } from '../../config/networks.js';
import { formatTxRelativeTime, type TransactionRecord } from '../../core/history.js';
import type { LedgerId } from '../../core/types.js';

const CLI_HISTORY_PATH = path.join(os.homedir(), '.testnet-pg-history.json');

export function loadCliHistory(): TransactionRecord[] {
  try {
    if (fs.existsSync(CLI_HISTORY_PATH)) {
      const data = fs.readFileSync(CLI_HISTORY_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore error
  }
  return [];
}

export function appendCliHistory(record: TransactionRecord): void {
  try {
    const list = loadCliHistory();
    const updated = [record, ...list.filter((x) => x.hash !== record.hash)].slice(0, 100);
    fs.writeFileSync(CLI_HISTORY_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  } catch {
    // ignore error
  }
}

export function clearCliHistory(): void {
  try {
    if (fs.existsSync(CLI_HISTORY_PATH)) {
      fs.unlinkSync(CLI_HISTORY_PATH);
    }
  } catch {
    // ignore error
  }
}

export function registerHistoryCommands(program: Command): void {
  program
    .command('history')
    .description('View local testnet transaction history')
    .option('-l, --ledger <ledger>', 'Filter by ledger (ethereum, polygon, solana, xrpl, bitcoin)')
    .option('--account <index>', 'Filter by account index derived from MNEMONIC')
    .option('--clear', 'Clear all local CLI transaction history', false)
    .action((opts) => {
      if (opts.clear) {
        clearCliHistory();
        console.log('✅ Riwayat transaksi CLI berhasil dibersihkan.\n');
        return;
      }

      let records = loadCliHistory();

      if (opts.ledger) {
        const targetLedger = opts.ledger.toLowerCase();
        records = records.filter((r) => r.ledger === targetLedger);
      }

      if (opts.account !== undefined) {
        const mnemonic = process.env.MNEMONIC?.trim();
        if (mnemonic) {
          const accountIdx = parseInt(opts.account, 10) || 0;
          const seed = toSeed(mnemonic);
          const filterLedger = (opts.ledger?.toLowerCase() || 'ethereum') as LedgerId;
          const acct = deriveAccount(filterLedger, seed, accountIdx);
          const targetAddr = acct.address.toLowerCase();
          records = records.filter(
            (r) => r.from.toLowerCase() === targetAddr || r.to.toLowerCase() === targetAddr
          );
        }
      }

      if (records.length === 0) {
        console.log('\n📭 Belum ada riwayat transaksi yang tersimpan di CLI.');
        console.log('Jalankan perintah pengiriman koin testnet terlebih dahulu:');
        console.log('  npm run dev -- send -l ethereum --to 0x... -a 0.01\n');
        return;
      }

      console.log(`\n📋 Riwayat Transaksi Testnet (${records.length} transaksi):\n`);

      const headers = ['Waktu', 'Tipe', 'Ledger', 'Jumlah', 'Aset', 'Penerima / Tujuan', 'Status', 'Tx Hash'];
      const rows = records.map((r) => {
        const net = NETWORKS[r.ledger];
        const timeStr = formatTxRelativeTime(r.timestamp);
        const toDisplay = r.to ? (r.to.length > 16 ? `${r.to.slice(0, 8)}...${r.to.slice(-6)}` : r.to) : '-';
        const hashDisplay = r.hash ? (r.hash.length > 16 ? `${r.hash.slice(0, 10)}...${r.hash.slice(-6)}` : r.hash) : '-';

        return [
          timeStr,
          r.type.toUpperCase(),
          net?.name || r.ledger,
          r.amount,
          r.assetSymbol,
          toDisplay,
          r.status.toUpperCase(),
          hashDisplay,
        ];
      });

      printTable(headers, rows);
      console.log('');
    });
}
