import { Command } from 'commander';
import { toSeed } from '../../core/mnemonic.js';
import { deriveAccount } from '../../core/derive.js';
import { getAdapter } from '../../core/registry.js';
import type { LedgerId } from '../../core/types.js';
import { printTable } from '../utils/table.js';

const ACTIVE_LEDGERS: LedgerId[] = ['ethereum', 'polygon', 'solana', 'xrpl', 'bitcoin'];

export function registerBalanceCommands(program: Command): void {
  program
    .command('balance')
    .description('Check native coin and token balances')
    .option('-l, --ledger <ledger>', 'Ledger ID (ethereum, polygon, solana, xrpl, bitcoin, or all)', 'all')
    .option('-i, --index <number>', 'Account index', '0')
    .action(async (opts) => {
      const mnemonic = process.env.MNEMONIC?.trim();
      if (!mnemonic) {
        console.error('❌ Error: MNEMONIC tidak ditemukan di environment (.env).');
        process.exit(1);
      }

      const index = parseInt(opts.index, 10) || 0;
      const seed = toSeed(mnemonic);
      const ledgerArg = (opts.ledger || 'all').toLowerCase();
      const targetLedgers = ledgerArg === 'all' ? ACTIVE_LEDGERS : [ledgerArg as LedgerId];

      console.log(`\nFetching balances for Account #${index}...`);
      const rows: string[][] = [];

      for (const ledger of targetLedgers) {
        try {
          const acc = deriveAccount(ledger, seed, index);
          const adapter = getAdapter(ledger);
          const bal = await adapter.getBalance(acc.address, { kind: 'native' });
          rows.push([ledger, acc.address, `${bal.formatted} ${bal.symbol}`]);
        } catch (err: any) {
          rows.push([ledger, 'Error', err.message || 'RPC Failed']);
        }
      }

      printTable(['Ledger', 'Address', 'Balance'], rows);
      console.log('');
    });
}
