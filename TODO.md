# TODO — Token Testing & Faucet Playground

Turunan dari [PLAN.md](PLAN.md). Urutan dari atas ke bawah; jangan lompat fase.

Legenda: `👤` = butuh kamu (manual, tidak bisa saya kerjakan sendiri) · `🌐` = butuh network · sisanya offline.

---

## Fase 0 — Scaffold (≈1 jam)

- [ ] `git init` (direktori ini belum repo git)
- [ ] `npm init -y`, set `"type": "module"`, Node 22+
- [ ] Install runtime deps: `@scure/bip39@2.4.0` `@scure/bip32@2.4.0` `micro-key-producer@0.10.2` `@scure/btc-signer@2.4.1` `ethers@6.17.0` `@solana/web3.js@1.99.0` `@solana/spl-token@0.4.15` `xrpl@5.1.0` `commander` `dotenv`
- [ ] Install dev deps: `typescript` `@types/node` `vitest` `oxlint`
- [ ] `tsconfig.json` — strict, ESM, target ES2023, `moduleResolution: bundler`
- [ ] Salin `.oxlintrc.json` dari `tennet-custody-v4/portal` biar konsisten
- [ ] `.gitignore` — `node_modules/`, `.env`, `*.key`, `keys/`, `dist/`
- [ ] `.env.example` — `MNEMONIC=`, RPC URL per chain (kosong = pakai default publik)
- [ ] Script npm: `build`, `test`, `lint`, `pg` (entry CLI)
- [ ] `src/core/types.ts` — `LedgerId`, `Account`, `Asset`, `UnsignedTx`, `SignedTx`, `Balance`, `TxStatus`
- [ ] `src/config/networks.ts` — RPC, explorer, faucet, chainId per ledger
- [ ] `assertTestnet()` + **allowlist chainId** (11155111, 80002, solana-devnet, xrpl-testnet, btc-signet)
- [ ] **Gate:** `npm run build` & `npm test` hijau

---

## Fase 1 — Seed & address (offline) — GATE PALING PENTING (≈0.5 hari)

### Core
- [ ] `src/core/mnemonic.ts` — `generate(words: 12|24)`, `validate()`, `toSeed()` (passphrase kosong)
- [ ] `seed info` cetak **fingerprint**, jangan pernah cetak mnemonic-nya
- [ ] `src/core/amount.ts` — `parseAmount`/`formatAmount` pakai `bigint`; **dilarang `number`**
- [ ] `src/core/derive.ts` — dua jalur: BIP-32 (secp256k1) & SLIP-0010 (ed25519)
- [ ] `src/core/registry.ts` — map `LedgerId` → adapter

### Derivasi per ledger (ikut Path Registry §1a)
- [ ] Ethereum — `m/44'/60'/0'/0/{i}` → address EIP-55 checksummed
- [ ] Polygon — path & address sama persis dengan Ethereum (verifikasi memang identik)
- [ ] Solana — SLIP-0010 ed25519, `m/44'/501'/{i}'/0'`, **all-hardened**, address base58
- [ ] XRPL — `m/44'/144'/0'/0/{i}`, secp256k1, **encoding di-set eksplisit `bip39`**, classic address `r…`
- [ ] Bitcoin — BIP-84 `m/84'/1'/0'/0/{i}`, bech32 `tb1q…` (signet)

### CLI
- [ ] `pg seed new [--words 12|24]` + banner peringatan "TESTNET ONLY"
- [ ] `pg seed info`
- [ ] `pg address --ledger all|<id> --index <n>` → tabel **ledger / path / address** (path wajib tercetak)

### Verifikasi
- [ ] `test/vectors.test.ts` — mnemonic standar `abandon abandon … about`, snapshot address 5 ledger
- [ ] Test: mnemonic invalid (checksum salah) ditolak
- [ ] Test: index 0 vs 1 menghasilkan address berbeda di semua ledger
- [ ] Test: path Solana all-hardened — `0'/0` (salah) ≠ `0'/0'` (benar)
- [ ] 👤 Cross-check MetaMask — address `0x…` cocok, dan sama untuk Ethereum & Polygon
- [ ] 👤 Cross-check Phantom — address Solana account #1 cocok
- [ ] 👤 Cross-check Sparrow (Native SegWit) — address `tb1q…` cocok
- [ ] 👤 Cross-check XRPL tool / Ledger Live — classic address `r…` cocok
- [ ] **Gate:** semua test vector hijau **dan** semua cross-check cocok → baru lanjut Fase 2

---

## Fase 2 — Faucet native (≈0.5 hari) 🌐

- [ ] `src/adapters/evm.ts` — `getBalance` native (config-driven: chainId/RPC/explorer sebagai data)
- [ ] `src/adapters/solana.ts` — `getBalance` native
- [ ] `src/adapters/xrpl.ts` — `getBalance` native + baca `reserve_base_xrp` dari `server_info`
- [ ] `src/adapters/bitcoin.ts` — `getBalance` via Esplora/mempool.space (derive + balance saja)
- [ ] `pg balance --ledger all` — saldo native semua address
- [ ] `pg faucet --ledger solana` — otomatis via `requestAirdrop`
- [ ] `pg faucet --ledger xrpl` — otomatis via `fundWallet` (langsung funded + reserve)
- [ ] `pg faucet --ledger ethereum|polygon|bitcoin` — cetak link faucet + address siap copy
- [ ] 👤 Klaim faucet manual: Sepolia (Google Cloud / Alchemy), Amoy (faucet.polygon.technology), signet
- [ ] Retry + backoff untuk RPC publik (rate limit)
- [ ] **Gate:** 5 address punya saldo native > 0

---

## Fase 3 — Bikin token test (≈1 hari) 🌐

### EVM
- [ ] `src/contracts/TestToken.sol` — ERC-20 minimal, 18 desimal, `mint(address,uint256)` terbuka
- [ ] Compile (solc atau bytecode pre-compiled — hindari nambah toolchain berat)
- [ ] `pg token deploy --ledger ethereum|polygon` → deploy, simpan address ke `config/tokens.ts`
- [ ] `pg token mint --ledger ethereum|polygon --to <addr> --amount <n>`

### Solana
- [ ] `pg token create --ledger solana` — `createMint`, decimals 6, mint authority = index 0
- [ ] Buat ATA + `mintTo` → `pg token mint --ledger solana`

### XRPL
- [ ] `pg token setup --ledger xrpl` — index 0 = issuer, index 1 = holder
- [ ] `pg trustline set` — holder → issuer, currency `TST`
- [ ] `pg token mint --ledger xrpl` — issuer kirim `Payment` IOU ke holder

### Umum
- [ ] `config/tokens.ts` — registry token test (address/mint/issuer + decimals + symbol) per chain
- [ ] `pg balance --ledger <id> --token TST` — saldo token
- [ ] **Gate:** saldo token > 0 terbaca di 4 ledger

---

## Fase 4 — Transfer token antar address (≈1–2 hari) 🌐

### Fondasi
- [ ] Implement `buildTransfer` / `sign` / `broadcast` / `waitConfirm` terpisah di tiap adapter
- [ ] `--dry-run` global — cetak unsigned tx + estimasi fee, **tidak** broadcast
- [ ] Konfirmasi interaktif sebelum broadcast (kecuali `--yes`)
- [ ] `explorerTx()` per ledger — cetak link setelah broadcast

### EVM (kerjakan pertama — paling cepat menang)
- [ ] `transfer(address,uint256)`, baca `decimals()`/`symbol()` on-chain
- [ ] Fee EIP-1559 (`maxFeePerGas` / `maxPriorityFeePerGas`), `estimateGas` + buffer 20%
- [ ] Pre-flight: saldo native cukup untuk gas? saldo token cukup?
- [ ] Kelola nonce (pending vs latest)
- [ ] Uji: Ethereum index 0 → 1, lalu Polygon index 0 → 1

### XRPL
- [ ] `Payment` dengan `{currency, issuer, value}` + `autofill`
- [ ] Pre-flight: penerima punya trustline? reserve cukup?
- [ ] Handle currency code 3-char vs 40-hex
- [ ] Opsional: `DestinationTag`
- [ ] Uji: index 0 → 1

### Solana
- [ ] Resolve ATA pengirim & penerima
- [ ] Buat ATA penerima kalau belum ada — **tampilkan biaya rent ≈0.00204 SOL di preview**
- [ ] Pakai `transferChecked` (bawa decimals → aman dari salah desimal)
- [ ] Deteksi `TOKEN_PROGRAM_ID` vs `TOKEN_2022_PROGRAM_ID` dari owner akun mint
- [ ] Priority fee via `ComputeBudget`
- [ ] Retry saat blockhash expired (`lastValidBlockHeight`)
- [ ] Uji: index 0 → 1

### Bitcoin
- [ ] `buildTransfer` dengan asset token → lempar `TokensNotSupported` (eksplisit, bukan diam-diam gagal)

- [ ] **Gate:** transfer token index 0 → 1 sukses & terkonfirmasi di 4 ledger, link explorer tercetak

---

## Fase 5 — Kekokohan (≈0.5 hari)

### Validasi address penerima (cegah salah paste lintas chain)
- [ ] EVM — checksum EIP-55
- [ ] Bitcoin — bech32 + HRP `tb` (tolak address mainnet `bc1`)
- [ ] Solana — base58, panjang 32 byte
- [ ] XRPL — checksum classic address
- [ ] Tolak address yang valid di chain lain tapi salah chain, dengan pesan jelas

### Keamanan
- [ ] Mnemonic hanya dari `.env` / prompt — **tidak pernah** lewat argv (bocor ke shell history)
- [ ] Redaksi otomatis mnemonic & private key di semua error handler / log
- [ ] `assertTestnet()` dipanggil di **setiap** jalur broadcast
- [ ] Banner peringatan di `seed new`

### Operasional
- [ ] `pg status --ledger <id> --hash <h>`
- [ ] `waitConfirm` bertimeout + pesan jelas saat timeout

### Uji negatif (semua harus error dengan pesan yang bisa dipahami)
- [ ] Kirim ke address salah-chain
- [ ] Saldo token kurang
- [ ] Saldo native kurang untuk gas
- [ ] XRPL tanpa trustline
- [ ] Token ke Bitcoin
- [ ] RPC mati / timeout
- [ ] **Gate:** semua uji negatif lolos

---

## Dokumentasi

- [ ] `README.md` — setup, `.env`, daftar faucet, contoh sesi end-to-end
- [ ] Catat address token test per chain + link explorer-nya
- [ ] Catat hasil cross-check Fase 1 (wallet apa, address apa) sebagai bukti
- [ ] Update `ledger.md` — tandai status tiap ledger

---

## Ditunda (backlog, jangan dikerjakan sekarang)

- [ ] 👤 **Kaia — putuskan coin type** (≈10 menit): import mnemonic test ke Kaia Wallet, bandingkan address dengan address Ethereum. Sama → coin type 60; beda → 8217. Detail & opsi di [PLAN.md](PLAN.md) Lampiran A (rekomendasi: turunkan dua-duanya)
- [ ] Kaia — aktifkan setelah diputuskan: tambah entri `config/networks.ts` (chainId 1001, RPC Kairos, KaiaScan) + path pilihan
- [ ] Transfer BTC native — UTXO, coin selection, PSBT, fee sat/vB, change, dust limit
- [ ] Runes / BRC-20
- [ ] UI web — Vite + React 19 + antd 6 + zustand, reuse `core` + `adapters`
- [ ] Batch / sweep multi-index
- [ ] Kaia fee delegation (`@kaiachain/ethers-ext`)
- [ ] EIP-2612 permit
- [ ] Simulasi air-gapped — export unsigned JSON → sign di mesin lain → import signed
