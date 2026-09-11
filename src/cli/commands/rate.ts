import { Command } from 'commander';
import { fetchIndodaxRates, formatIDR, TESTNET_TO_INDODAX_MAP } from '../../core/rates.js';
import { printTable } from '../utils/table.js';

interface DisplayAssetItem {
  name: string;
  testnet: string;
  symbol: string;
  note?: string;
}

const ASSET_CATALOG: DisplayAssetItem[] = [
  { name: 'Bitcoin', testnet: 'Signet', symbol: 'sBTC' },
  { name: 'Ethereum', testnet: 'Sepolia', symbol: 'ETH' },
  { name: 'Polygon', testnet: 'Amoy', symbol: 'POL' },
  { name: 'Solana', testnet: 'Devnet', symbol: 'SOL' },
  { name: 'XRPL', testnet: 'Testnet', symbol: 'XRP' },
  { name: 'Kaia', testnet: 'Kairos', symbol: 'KAIA' },
  { name: 'Hadi Token Test', testnet: 'Multi-Chain', symbol: 'HTT', note: 'Pegged to USDT' },
];

export function registerRateCommands(program: Command): void {
  program
    .command('rate')
    .description('Fetch live crypto to IDR exchange rates from Indodax for testnet assets')
    .option('-f, --force', 'Bypass cache and force fresh fetch from Indodax', false)
    .action(async (opts) => {
      console.log('\nFetching live market rates from Indodax API...');
      try {
        const rates = await fetchIndodaxRates(opts.force);
        const rows: string[][] = [];

        for (const item of ASSET_CATALOG) {
          const rateData = rates[item.symbol];
          const pairKey = TESTNET_TO_INDODAX_MAP[item.symbol] || '-';
          const pairDisplay = pairKey.toUpperCase().replace('_', '/');

          if (rateData) {
            const formattedPrice = formatIDR(rateData.priceIdr);
            const highStr = rateData.high24h ? formatIDR(rateData.high24h) : '-';
            const lowStr = rateData.low24h ? formatIDR(rateData.low24h) : '-';
            const assetLabel = item.note ? `${item.name} (${item.note})` : item.name;

            rows.push([
              assetLabel,
              item.testnet,
              item.symbol,
              pairDisplay,
              formattedPrice,
              highStr,
              lowStr,
            ]);
          } else {
            rows.push([item.name, item.testnet, item.symbol, pairDisplay, 'N/A', '-', '-']);
          }
        }

        console.log('');
        printTable(['Asset', 'Testnet', 'Symbol', 'Indodax Pair', 'Last Price (IDR)', '24h High', '24h Low'], rows);
        console.log('\nℹ️  Catatan: Seluruh rate diambil live dari Indodax Public API untuk simulasi valuasi aset di testnet.\n');
        process.exit(0);
      } catch (err: any) {
        console.error('❌ Gagal mengambil data rate dari Indodax:', err.message || err);
        process.exit(1);
      }
    });
}
