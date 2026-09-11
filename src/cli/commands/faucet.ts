import { Command } from 'commander';
import { toSeed } from '../../core/mnemonic.js';
import { deriveAccount } from '../../core/derive.js';
import { getAdapter } from '../../core/registry.js';
import { NETWORKS } from '../../config/networks.js';
import type { LedgerId } from '../../core/types.js';
import type { SolanaAdapter } from '../../adapters/solana.js';
import type { XRPLAdapter } from '../../adapters/xrpl.js';

export function registerFaucetCommands(program: Command): void {
  program
    .command('faucet')
    .description('Claim testnet faucet native coins for gas')
    .requiredOption('-l, --ledger <ledger>', 'Ledger ID (ethereum, polygon, solana, xrpl, bitcoin)')
    .option('-i, --index <number>', 'Account index to fund', '0')
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

      const index = parseInt(opts.index, 10) || 0;
      const seed = toSeed(mnemonic);
      const acc = deriveAccount(ledger, seed, index);

      console.log(`\n💧 Faucet Request: ${config.name} (${config.testnetName})`);
      console.log(`Target Address: ${acc.address} (Index #${index})`);

      if (ledger === 'solana') {
        console.log('Mengirim permintaan airdrop 1 SOL ke Solana Devnet RPC...');
        try {
          const adapter = getAdapter('solana') as SolanaAdapter;
          const sig = await adapter.requestAirdrop(acc.address, 1);
          console.log(`✅ Airdrop sukses! Signature: ${sig}`);
          console.log(`Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet\n`);
        } catch (err: any) {
          console.error(`❌ Gagal request airdrop: ${err.message}\n`);
        }
      } else if (ledger === 'xrpl') {
        console.log('Mengirim permintaan pendanaan ke XRPL Altnet Faucet...');
        try {
          const adapter = getAdapter('xrpl') as XRPLAdapter;
          const res = await adapter.fundWallet(acc);
          console.log(`✅ Dompet XRPL berhasil didanai! Saldo saat ini: ${res.balance} XRP\n`);
        } catch (err: any) {
          console.error(`❌ Gagal fund wallet: ${err.message}\n`);
        }
      } else {
        console.log(`Jaringan ${config.name} memerlukan verifikasi captcha web:`);
        console.log(`1. Buka URL: ${config.faucetUrl}`);
        console.log(`2. Tempelkan address Anda: ${acc.address}\n`);
      }
    });
}
