import { Command } from 'commander';
import { toSeed } from '../../core/mnemonic.js';
import { deriveAccount, deriveEVM } from '../../core/derive.js';
import type { LedgerId } from '../../core/types.js';
import { printTable } from '../utils/table.js';

const ACTIVE_LEDGERS: LedgerId[] = ['ethereum', 'polygon', 'solana', 'xrpl', 'bitcoin'];

export function registerAddressCommands(program: Command): void {
  program
    .command('address')
    .description('Derive and display testnet addresses for accounts')
    .option('-l, --ledger <ledger>', 'Ledger ID (ethereum, polygon, solana, xrpl, bitcoin, kaia, or all)', 'all')
    .option('-i, --index <number>', 'Account index', '0')
    .action((opts) => {
      const mnemonic = process.env.MNEMONIC?.trim();
      if (!mnemonic) {
        console.error('❌ Error: MNEMONIC tidak ditemukan di environment (.env).');
        console.error('   Silakan tentukan MNEMONIC di file .env atau buat baru dengan `pg seed new`.');
        process.exit(1);
      }

      const index = parseInt(opts.index, 10);
      if (isNaN(index) || index < 0) {
        console.error(`❌ Error: Index harus berupa bilangan bulat non-negatif. Diterima: ${opts.index}`);
        process.exit(1);
      }

      let seed: Uint8Array;
      try {
        seed = toSeed(mnemonic);
      } catch (err: any) {
        console.error(`❌ Error: ${err.message}`);
        process.exit(1);
      }

      const ledgerArg = (opts.ledger || 'all').toLowerCase();
      const rows: string[][] = [];

      if (ledgerArg === 'all') {
        for (const ledger of ACTIVE_LEDGERS) {
          const acc = deriveAccount(ledger, seed, index);
          rows.push([acc.ledger, acc.index.toString(), acc.path, acc.address]);
        }
      } else if (ledgerArg === 'kaia') {
        // Tampilkan kedua opsi derivasi untuk Kaia (Lampiran A)
        const optA = deriveEVM(seed, index, 60);
        const optB = deriveEVM(seed, index, 8217);
        rows.push(['kaia (Opsi A - type 60)', index.toString(), optA.path, optA.address]);
        rows.push(['kaia (Opsi B - type 8217)', index.toString(), optB.path, optB.address]);
      } else {
        const validLedgers: LedgerId[] = [...ACTIVE_LEDGERS, 'kaia'];
        if (!validLedgers.includes(ledgerArg as LedgerId)) {
          console.error(`❌ Error: Ledger "${ledgerArg}" tidak dikenal. Pilihan: ${validLedgers.join(', ')}, all`);
          process.exit(1);
        }
        const acc = deriveAccount(ledgerArg as LedgerId, seed, index);
        rows.push([acc.ledger, acc.index.toString(), acc.path, acc.address]);
      }

      console.log(`\nDerived Testnet Addresses (Index ${index}):`);
      printTable(['Ledger', 'Index', 'Derivation Path', 'Address'], rows);
      console.log('');
    });
}
