import { Command } from 'commander';
import { toSeed } from '../../core/mnemonic.js';
import { deriveAccount } from '../../core/derive.js';
import { getAdapter } from '../../core/registry.js';
import { validateAddress } from '../../core/validate.js';
import { DEFAULT_TEST_TOKENS } from '../../config/tokens.js';
import { NETWORKS } from '../../config/networks.js';
import { parseAmount } from '../../core/amount.js';
import type { LedgerId, Asset } from '../../core/types.js';
import { appendCliHistory } from './history.js';

export function registerSendCommands(program: Command): void {
  program
    .command('send')
    .description('Send native coin or test token to another address')
    .requiredOption('-l, --ledger <ledger>', 'Ledger ID (ethereum, polygon, solana, xrpl)')
    .option('--from <index>', 'Sender account index', '0')
    .requiredOption('--to <addressOrIndex>', 'Recipient address or index number')
    .requiredOption('-a, --amount <amount>', 'Amount to send')
    .option('--token', 'Send test token (HTT) instead of native coin', false)
    .option('--dry-run', 'Simulate transaction and estimate fee without broadcasting', false)
    .action(async (opts) => {
      const mnemonic = process.env.MNEMONIC?.trim();
      if (!mnemonic) {
        console.error('❌ Error: MNEMONIC tidak ditemukan di environment (.env).');
        process.exit(1);
      }

      const ledger = opts.ledger.toLowerCase() as LedgerId;
      const config = NETWORKS[ledger];
      if (!config) {
        console.error(`❌ Error: Ledger "${ledger}" tidak didukung.`);
        process.exit(1);
      }

      const fromIndex = parseInt(opts.from, 10) || 0;
      const seed = toSeed(mnemonic);
      const fromAccount = deriveAccount(ledger, seed, fromIndex);

      let toAddress = opts.to.trim();
      // Jika to berupa digit tunggal (misal 1), otomatis turunkan address index tersebut
      if (/^\d+$/.test(toAddress)) {
        const toIndex = parseInt(toAddress, 10);
        toAddress = deriveAccount(ledger, seed, toIndex).address;
        console.log(`[Auto-resolve] Penerima Index #${toIndex} -> ${toAddress}`);
      }

      // Validasi address
      const val = validateAddress(ledger, toAddress);
      if (!val.valid) {
        console.error(`❌ Error validasi address: ${val.error}`);
        process.exit(1);
      }

      let asset: Asset;
      let decimals: number;

      if (opts.token) {
        const tToken = DEFAULT_TEST_TOKENS[ledger];
        if (!tToken) {
          console.error(`❌ Error: Token test belum didukung di ledger ${ledger}.`);
          process.exit(1);
        }
        asset = tToken;
        decimals = tToken.decimals ?? 18;
      } else {
        asset = { kind: 'native', symbol: config.nativeAsset.symbol, decimals: config.nativeAsset.decimals };
        decimals = config.nativeAsset.decimals;
      }

      let parsedAmount: bigint;
      try {
        parsedAmount = parseAmount(opts.amount, decimals);
      } catch (err: any) {
        console.error(`❌ Format nominal salah: ${err.message}`);
        process.exit(1);
      }

      console.log(`\n📦 Mempersiapkan Transaksi:`);
      console.log(`Ledger      : ${config.name}`);
      console.log(`Pengirim    : ${fromAccount.address} (Index #${fromIndex})`);
      console.log(`Penerima    : ${toAddress}`);
      console.log(`Jumlah      : ${opts.amount} ${asset.kind === 'native' ? config.nativeAsset.symbol : (asset as any).symbol}`);

      const adapter = getAdapter(ledger);
      try {
        const unsigned = await adapter.buildTransfer({
          from: fromAccount,
          to: toAddress,
          asset,
          amount: parsedAmount,
        });

        console.log(`Estimasi Fee: ${unsigned.fee.formatted} ${unsigned.fee.symbol}`);

        if (unsigned.warnings?.length) {
          console.log('\n⚠️ Peringatan Pre-flight:');
          unsigned.warnings.forEach((w) => console.log(`   - ${w}`));
        }

        if (opts.dryRun) {
          console.log('\n✅ [DRY-RUN] Simulasi sukses! Transaksi TIDAK disiarkan ke jaringan.\n');
          return;
        }

        console.log('\nMenandatangani transaksi secara offline...');
        const signed = await adapter.sign(unsigned, fromAccount.privateKey!);
        console.log('Menyiarkan transaksi ke node testnet...');
        const res = await adapter.broadcast(signed);

        appendCliHistory({
          id: res.hash,
          hash: res.hash,
          ledger,
          type: 'send',
          assetSymbol: asset.symbol || config.nativeAsset.symbol,
          amount: opts.amount,
          from: fromAccount.address,
          to: toAddress,
          timestamp: Date.now(),
          status: 'confirmed',
          explorerUrl: adapter.explorerTx(res.hash),
        });

        console.log(`\n🎉 Transaksi berhasil disiarkan!`);
        console.log(`Tx Hash : ${res.hash}`);
        console.log(`Explorer: ${adapter.explorerTx(res.hash)}\n`);
      } catch (err: any) {
        console.error(`\n❌ Gagal mengirim transaksi: ${err.message}\n`);
      }
    });
}
