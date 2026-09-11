import { Command } from 'commander';
import { toSeed } from '../../core/mnemonic.js';
import { deriveAccount } from '../../core/derive.js';
import { getAdapter } from '../../core/registry.js';
import type { LedgerId } from '../../core/types.js';
import { printTable } from '../utils/table.js';
import { fetchIndodaxRates, formatIDR, calculateIDRValue } from '../../core/rates.js';
import { getActiveTokenAsset } from '../../config/tokens.js';

const ACTIVE_LEDGERS: LedgerId[] = ['ethereum', 'polygon', 'solana', 'xrpl', 'bitcoin'];

export function registerBalanceCommands(program: Command): void {
  program
    .command('balance')
    .description('Check native coin and token balances with Indodax IDR valuation')
    .option('-l, --ledger <ledger>', 'Ledger ID (ethereum, polygon, solana, xrpl, bitcoin, or all)', 'all')
    .option('-i, --index <number>', 'Account index', '0')
    .option('--no-rate', 'Skip fetching Indodax exchange rates')
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

      console.log(`\nFetching balances and Indodax rates for Account #${index}...`);

      let rates: Record<string, any> = {};
      if (opts.rate !== false) {
        try {
          rates = await fetchIndodaxRates();
        } catch (err: any) {
          console.warn('⚠️  Gagal mengambil kurs Indodax, estimasi nilai IDR dinonaktifkan:', err?.message || err);
        }
      }

      const rows: string[][] = [];
      let totalPortfolioIdr = 0;

      for (const ledger of targetLedgers) {
        try {
          const acc = deriveAccount(ledger, seed, index);
          const adapter = getAdapter(ledger);

          // 1. Native balance
          const bal = await adapter.getBalance(acc.address, { kind: 'native' });
          const unitRate = rates[bal.symbol]?.priceIdr;
          const valIdr = calculateIDRValue(bal.formatted, bal.symbol, rates);
          totalPortfolioIdr += valIdr;

          rows.push([
            ledger,
            acc.address,
            `${bal.formatted} ${bal.symbol}`,
            unitRate ? formatIDR(unitRate) : '-',
            valIdr > 0 ? formatIDR(valIdr) : 'Rp 0',
          ]);

          // 2. Token balance if exists
          const tokenAsset = getActiveTokenAsset(ledger);
          if (tokenAsset) {
            try {
              const tokenBal = await adapter.getBalance(acc.address, tokenAsset);
              const tokUnitRate = rates[tokenBal.symbol]?.priceIdr;
              const tokValIdr = calculateIDRValue(tokenBal.formatted, tokenBal.symbol, rates);
              totalPortfolioIdr += tokValIdr;

              rows.push([
                `${ledger} (Token)`,
                acc.address,
                `${tokenBal.formatted} ${tokenBal.symbol}`,
                tokUnitRate ? formatIDR(tokUnitRate) : '-',
                tokValIdr > 0 ? formatIDR(tokValIdr) : 'Rp 0',
              ]);
            } catch {
              // Ignore token balance fetch errors
            }
          }
        } catch (err: any) {
          rows.push([ledger, 'Error', err.message || 'RPC Failed', '-', '-']);
        }
      }

      console.log('');
      printTable(['Ledger', 'Address', 'Balance', 'Indodax Rate', 'Est. Value (IDR)'], rows);
      console.log(`\n💰 Total Portfolio Valuation (IDR): ${formatIDR(totalPortfolioIdr)}`);
      console.log('ℹ️  Kurs diambil live dari Indodax Public API untuk simulasi estimasi nilai aset testnet.\n');
      process.exit(0);
    });
}
