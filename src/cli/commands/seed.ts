import { Command } from 'commander';
import { generate, validate, getFingerprint, toSeed, TESTNET_WARNING_BANNER } from '../../core/mnemonic.js';

export function registerSeedCommands(program: Command): void {
  const seedCmd = program.command('seed').description('Manage BIP-39 testnet mnemonic phrase');

  seedCmd
    .command('new')
    .description('Generate a new BIP-39 mnemonic seed phrase for testing')
    .option('-w, --words <number>', 'Word count (12 or 24)', '12')
    .action((opts) => {
      const words = parseInt(opts.words, 10);
      if (words !== 12 && words !== 24) {
        console.error('❌ Error: Word count must be either 12 or 24.');
        process.exit(1);
      }

      console.log(TESTNET_WARNING_BANNER);
      const mnemonic = generate(words);
      const fingerprint = getFingerprint(mnemonic);

      console.log(`Generated new ${words}-word testnet mnemonic:`);
      console.log('--------------------------------------------------------------------------------');
      console.log(`  ${mnemonic}`);
      console.log('--------------------------------------------------------------------------------');
      console.log(`Fingerprint : ${fingerprint}`);
      console.log('\n💡 Salin frase di atas dan simpan di file .env Anda:');
      console.log(`MNEMONIC="${mnemonic}"\n`);
    });

  seedCmd
    .command('info')
    .description('Display metadata and fingerprint of configured mnemonic in .env')
    .action(() => {
      const mnemonic = process.env.MNEMONIC?.trim();
      if (!mnemonic) {
        console.error('❌ Error: MNEMONIC tidak ditemukan di environment (.env).');
        console.error('   Silakan jalankan `pg seed new` atau isi variabel MNEMONIC di file .env');
        process.exit(1);
      }

      if (!validate(mnemonic)) {
        console.error('❌ Error: MNEMONIC di file .env tidak valid (checksum atau wordlist salah).');
        process.exit(1);
      }

      const words = mnemonic.split(/\s+/).length;
      const seed = toSeed(mnemonic);
      const fingerprint = getFingerprint(seed);

      console.log('\n🔐 Mnemonic Configuration Info');
      console.log('-------------------------------');
      console.log(`Status      : VALID ✅`);
      console.log(`Word Count  : ${words} words`);
      console.log(`Fingerprint : ${fingerprint}`);
      console.log('-------------------------------');
      console.log('Catatan: Demi keamanan, frasa mnemonic asli tidak ditampilkan di layar.\n');
    });
}
