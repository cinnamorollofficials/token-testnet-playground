# Plan: Token Testing & Faucet Playground

Scope tahap ini (sesuai arahan): **hanya testnet — token testing & faucet**.
Alur target: generate seed → derive address → ambil native coin dari faucet (untuk gas/reserve)
→ dapat test token → kirim test token antar address milik sendiri.

Tidak ada mainnet, tidak ada aset bernilai. Transfer native coin **bukan tujuan**,
hanya prasyarat supaya token bisa dikirim.

**Kaia ditunda** — derivation path-nya ambigu dan pendekatannya masih dipikirkan (lihat Lampiran A).
Lima ledger lain jalan duluan tanpa menunggu.

## 0. Keputusan & Asumsi

| Topik | Keputusan | Alasan |
|---|---|---|
| Jaringan | **Testnet-only**, di-guard di kode (`assertTestnet`) | playground, nol risiko dana nyata |
| Token | **Token test milik sendiri** (kita deploy/mint) + token faucet publik kalau ada | faucet token publik sering kering; punya mint sendiri = supply tak terbatas |
| Bahasa | TypeScript + Node 22+ (ESM) | sama dengan stack `tennet-custody-v4` |
| Form factor | CLI | cepat diiterasi, gampang di-script untuk uji berulang |
| Kunci | **Satu BIP-39 mnemonic untuk semua chain**, derivasi per-chain ikut best practice masing-masing (lihat §1a) | requirement terkunci: cuma 1 frasa yang perlu di-maintain & di-backup |
| Kaia | **Ditunda**, tidak memblokir chain lain | coin type 60 vs 8217 belum diputuskan (Lampiran A) |
| UI web | Ditunda (lihat "Nanti") | bukan bagian dari scope token testing |

Asumsi yang perlu dikoreksi kalau salah:
- "Token" = fungible token standar tiap chain: ERC-20 / SPL / XRPL issued currency.
- **Bitcoin tidak punya token layer standar** → di fase ini Bitcoin hanya sampai *faucet + cek saldo*.
  Transfer BTC & Runes/BRC-20 ditunda.

## 1. Ledger dalam Scope

| Ledger | Testnet | Chain/Net ID | Token standard | Status fase ini |
|---|---|---|---|---|
| Ethereum | Sepolia | 11155111 | ERC-20 | penuh |
| Polygon | Amoy | 80002 | ERC-20 | penuh |
| Solana | Devnet | — | SPL Token / Token-2022 | penuh |
| XRPL | Testnet | — | Issued currency (IOU) | penuh |
| Bitcoin | signet | — | *(tidak ada)* | faucet + saldo saja |
| ~~Kaia~~ | Kairos | 1001 | KIP-7 | **ditunda** — Lampiran A |

Target aktif: **4 ledger transfer token** + 1 ledger faucet-only.

## 1a. Requirement Kunci: Satu Seed Phrase untuk Semua Chain

**Requirement (dikunci):** hanya ada **satu** BIP-39 mnemonic yang perlu di-maintain & di-backup.
Setiap chain menurunkan private key-nya sendiri dari seed itu, dengan **algoritma & path sesuai
best practice masing-masing chain** — bukan dengan skema karangan sendiri.

Alur derivasi, dua lapis:

```
mnemonic (+passphrase)
  └─ PBKDF2-HMAC-SHA512, 2048 iter ─→ master seed 64 byte   ← satu-satunya titik pakai mnemonic
       ├─ BIP-32   (HMAC key "Bitcoin seed") ─→ secp256k1 ─→ EVM, Bitcoin, XRPL
       └─ SLIP-0010 (HMAC key "ed25519 seed") ─→ ed25519  ─→ Solana
```

Solana masuk ke fungsi master-key yang berbeda karena kurvanya ed25519, bukan secp256k1.
Ini bukan penyimpangan — Phantom & `solana-keygen` melakukan hal yang sama.
Memaksa Solana lewat BIP-32 secp256k1 menghasilkan private key tidak valid.

### Path Registry (best practice per chain)

| Ledger | Standar | Path (testnet) | Kurva | Wallet referensi untuk cross-check | Status |
|---|---|---|---|---|---|
| Ethereum | BIP-44 | `m/44'/60'/0'/0/{i}` | secp256k1 | MetaMask, Ledger Live | pasti |
| Polygon | BIP-44, coin type 60 | `m/44'/60'/0'/0/{i}` | secp256k1 | MetaMask, Ledger Live | pasti |
| Solana | SLIP-0010 + BIP-44 | `m/44'/501'/{i}'/0'` (all-hardened) | ed25519 | Phantom, Ledger Live | pasti |
| XRPL | BIP-44 | `m/44'/144'/0'/0/{i}` | secp256k1 | Ledger Live, xrpl.js | pasti |
| Bitcoin | BIP-84 (native segwit) | `m/84'/1'/0'/0/{i}` | secp256k1 | Sparrow, Ledger Live | pasti |
| Kaia | BIP-44 | *belum diputuskan* | secp256k1 | Kaia Wallet | **ditunda** |

Lima baris pertama tidak ambigu dan bisa langsung diimplementasikan.

### Keputusan global yang mengikat semua chain

- **Passphrase (word ke-25): tidak dipakai** (string kosong). Menambah/menghapus passphrase mengubah
  **seluruh** private key di **semua** chain tanpa peringatan. Kalau nanti mau dipakai, harus jadi
  keputusan sadar dan terdokumentasi, bukan default diam-diam.
- **XRPL: encoding wajib di-set eksplisit ke `bip39`.** `xrpl.js` juga menerima "family seed" (`s…`)
  milik XRPL sendiri; tanpa encoding eksplisit, string yang sama bisa menghasilkan key berbeda.
- **Solana wajib all-hardened** (`0'/0'`, bukan `0'/0`). Konsekuensinya: tidak ada xpub untuk ed25519,
  jadi watch-only address derivation tidak mungkin di Solana (di EVM/BTC/XRPL bisa).
- **Selalu cetak path di setiap output address.** Path beda = address beda total; tanpa path tercetak,
  debugging ketidakcocokan address jadi tebak-tebakan.
- **Bitcoin**: BIP-84 (`tb1q…`) jadi default. Kalau address tak cocok dengan wallet pembanding,
  curigai beda *script type* (BIP-44 `1…` / BIP-49 `3…` / BIP-86 taproot `tb1p…`) sebelum curigai seed.
- Bitcoin pakai **signet** karena faucet-nya paling stabil; testnet3 sering mati.

### Konsekuensi keamanan (disadari, diterima untuk playground)

Satu seed = satu titik kompromi untuk semua chain sekaligus. Untuk playground testnet ini
justru keunggulan (cukup backup satu frasa). **Jangan jadikan refleks di konteks produksi** —
segregasi key per-chain ada alasannya.

## 2. Sumber Token untuk Testing

Dua jalur, dipakai bersamaan:

**A. Faucet publik → native coin (untuk gas/reserve):**
| Ledger | Faucet |
|---|---|
| Sepolia | Google Cloud Web3 faucet / Alchemy faucet |
| Amoy | faucet.polygon.technology |
| Solana devnet | `requestAirdrop` via RPC (otomatis dari CLI) |
| XRPL testnet | `faucet.altnet.rippletest.net/accounts` (otomatis, langsung funded) |
| Bitcoin signet | signet faucet publik |

**B. Token test milik sendiri (inti dari "token testing"):**
- **EVM (Sepolia/Amoy):** deploy satu kontrak ERC-20 sederhana `TestToken (TST, 18 desimal)`
  dengan `mint(address,uint256)` terbuka. Satu kontrak per chain, address-nya disimpan di `config/tokens.ts`.
- **Solana devnet:** `createMint` (decimals 6, mint authority = account index 0), lalu `mintTo` ke ATA.
- **XRPL testnet:** account index 0 jadi **issuer**, account index 1 jadi holder;
  holder `TrustSet` ke issuer, issuer `Payment` IOU (`TST`) ke holder.

Command `token mint --ledger <id> --to <addr> --amount <n>` = "faucet token internal", bisa dipanggil kapan saja.

## 3. Struktur Direktori

```
test-playground/
├─ src/
│  ├─ core/
│  │  ├─ mnemonic.ts       # BIP-39 generate/validate
│  │  ├─ derive.ts         # BIP-32 / SLIP-10 → { path, privKey, pubKey, address }
│  │  ├─ amount.ts         # desimal ↔ smallest-unit pakai bigint (dilarang float)
│  │  ├─ types.ts
│  │  └─ registry.ts
│  ├─ adapters/
│  │  ├─ evm.ts            # ethereum + polygon (kaia menyusul, tinggal tambah config)
│  │  ├─ solana.ts
│  │  ├─ xrpl.ts
│  │  └─ bitcoin.ts        # fase ini: derive + balance saja
│  ├─ contracts/
│  │  └─ TestToken.sol     # ERC-20 minimal + mint terbuka (testnet only)
│  ├─ cli/
│  └─ config/
│     ├─ networks.ts       # RPC, explorer, faucet, chainId + allowlist testnet
│     └─ tokens.ts         # address/mint/issuer token test per chain
├─ test/
│  ├─ vectors.test.ts      # test vector deterministik, offline, wajib hijau
│  └─ integration/         # uji kirim beneran di testnet, ditandai terpisah
├─ .env.example
├─ ledger.md
└─ PLAN.md
```

Adapter EVM dibuat **config-driven** (chainId + RPC + explorer sebagai data, bukan kode).
Konsekuensinya: saat Kaia diputuskan nanti, yang perlu ditambah hanya satu entri config — bukan adapter baru.

## 4. Kontrak Adapter

Build / sign / broadcast **dipisah** supaya alur unsigned-tx → signer terpisah bisa disimulasikan
(mirip pola custody), dan `--dry-run` jadi gratis.

```ts
export interface LedgerAdapter {
  readonly id: LedgerId;
  readonly caps: { tokens: boolean; memo: boolean };

  derive(seed: Uint8Array, index: number, opts?: DeriveOpts): Account;
  getBalance(address: string, asset: Asset): Promise<Balance>;

  buildTransfer(p: {
    from: Account; to: string; asset: Asset; amount: bigint; opts?: TransferOpts;
  }): Promise<UnsignedTx>;   // + preview fee + warning (mis. "ATA akan dibuat, biaya 0.00204 SOL")

  sign(tx: UnsignedTx, key: PrivateKey): Promise<SignedTx>;  // offline, tanpa network
  broadcast(tx: SignedTx): Promise<{ hash: string }>;
  waitConfirm(hash: string): Promise<TxStatus>;
  explorerTx(hash: string): string;
}
```

Bentuk `Asset` per ledger:
- EVM: `{ kind:'token', address:'0x…', decimals, symbol }`
- Solana: `{ kind:'token', mint:'…', decimals, programId: TOKEN | TOKEN_2022 }`
- XRPL: `{ kind:'token', currency:'TST'|hex40, issuer:'r…' }`
- Bitcoin: hanya `{ kind:'native' }`; adapter lempar `TokensNotSupported` untuk token — eksplisit, bukan diam-diam gagal.

## 5. Dependensi (versi terverifikasi hari ini)

```
@scure/bip39@2.4.0        # mnemonic (audited, minimal)
@scure/bip32@2.4.0        # HD derivation secp256k1
micro-key-producer@0.10.2 # SLIP-10 ed25519 (Solana)
@scure/btc-signer@2.4.1   # Bitcoin address/bech32 (+ PSBT saat transfer BTC dibuka nanti)
ethers@6.17.0             # Ethereum + Polygon
@solana/web3.js@1.99.0
@solana/spl-token@0.4.15
xrpl@5.1.0
commander + dotenv + vitest
```

## 6. Fase Implementasi

### Fase 0 — Scaffold (≈1 jam)
- `npm init`, TS strict, ESM, vitest, oxlint (samakan dengan `portal/.oxlintrc.json`).
- `git init` (repo ini belum git). `.gitignore`: `.env`, `*.key`, `keys/`.
- `config/networks.ts` + **allowlist chainId testnet**; `assertTestnet()` dipanggil di setiap jalur broadcast.
- **Selesai kalau:** `npm run build` & `npm test` hijau.

### Fase 1 — Seed & address (offline, tanpa network) (≈0.5 hari)
- `seed new [--words 12|24]`, `seed info` (validasi checksum; cetak fingerprint, bukan seed-nya).
- `address --ledger all --index 0` → tabel ledger / path / address.
- Implementasi mengikuti Path Registry di §1a; setiap output address **wajib** menyertakan path-nya.
- **Matriks cross-check** — satu mnemonic test, import ke tiap wallet referensi, address harus cocok:

  | Chain | Wallet pembanding | Harus cocok dengan |
  |---|---|---|
  | Ethereum / Polygon | MetaMask | address `0x…` yang sama untuk keduanya |
  | Solana | Phantom | address base58 account #1 |
  | XRPL | Ledger Live / xrpl.js | classic address `r…` |
  | Bitcoin | Sparrow (Native SegWit) | `tb1q…` |

- **Selesai kalau:** test vector hijau (offline, tanpa network) memakai mnemonic standar
  `abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about`,
  **dan** seluruh baris matriks di atas cocok.
  **Ini gate paling penting** — derivation salah = semua fase berikutnya sia-sia, dan dana faucet
  terkirim ke address yang tidak muncul di wallet mana pun.

### Fase 2 — Faucet native (≈0.5 hari)
- `faucet --ledger <id>`: otomatis untuk Solana (`requestAirdrop`) & XRPL (`fundWallet`);
  cetak link + address untuk faucet yang butuh manual (Sepolia, Amoy, signet).
- `balance --ledger all` → saldo native semua address.
- **Selesai kalau:** 5 address punya saldo native > 0.

### Fase 3 — Bikin token test (≈1 hari)
- `token deploy --ledger ethereum|polygon` → deploy `TestToken`, simpan address ke `config/tokens.ts`.
- `token create --ledger solana` → `createMint` (decimals 6).
- `token setup --ledger xrpl` → index 0 jadi issuer, `TrustSet` dari index 1.
- `token mint --ledger <id> --to <addr> --amount <n>` → faucet token internal.
- `balance --ledger <id> --token <ref>` → saldo token.
- **Selesai kalau:** saldo token > 0 terbaca di 4 ledger.

### Fase 4 — Transfer token antar address (≈1–2 hari)
Urutan dari yang paling cepat menang:
1. **EVM (ethereum → polygon):** satu adapter, 2 config. `transfer(address,uint256)`,
   baca `decimals()`/`symbol()` on-chain, EIP-1559 fee, `estimateGas` + buffer 20%,
   cek saldo native cukup untuk gas sebelum kirim.
2. **XRPL:** `Payment` dengan `{currency, issuer, value}`; penerima wajib punya trustline
   (sediakan `trustline set`); handle currency code 3-char vs 40-hex; ingat owner reserve per trustline.
3. **Solana:** resolve ATA pengirim & penerima, buat ATA penerima kalau belum ada
   (rent ≈0.00204 SOL — **tampilkan di preview**), pakai `transferChecked` (bawa decimals → aman).
   Deteksi `TOKEN_PROGRAM_ID` vs `TOKEN_2022_PROGRAM_ID` dari owner akun mint.
   Retry kalau blockhash expired (`lastValidBlockHeight`).
- Semua `send` wajib punya `--dry-run` (cetak unsigned tx + fee, tidak broadcast) + konfirmasi interaktif.
- **Selesai kalau:** transfer token index 0 → index 1 sukses & terkonfirmasi di 4 ledger, link explorer tercetak.

### Fase 5 — Kekokohan (≈0.5 hari)
- Validasi address penerima per-ledger (EIP-55, bech32 HRP `tb`, base58 length, checksum XRPL)
  → cegah salah paste address lintas chain.
- Mnemonic hanya dari `.env`/prompt — **tidak pernah** masuk log/argv/shell history; redaksi otomatis di error handler.
- `status --ledger <id> --hash <h>` + `waitConfirm` bertimeout; retry/backoff untuk RPC publik.
- **Selesai kalau:** uji negatif lolos — address salah-chain, saldo token kurang, gas kurang,
  XRPL tanpa trustline, token di Bitcoin → semuanya error dengan pesan jelas.

## 7. Perintah CLI Target

```bash
pg seed new --words 12
pg address --ledger all --index 0
pg faucet  --ledger solana
pg token deploy --ledger polygon
pg token mint   --ledger polygon --to <addr> --amount 1000
pg balance --ledger polygon --index 0 --token TST
pg send --ledger polygon --from 0 --to 1 --token TST --amount 10 --dry-run
pg status --ledger polygon --hash 0x…
```

## 8. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Derivation path salah → address tak cocok wallet lain | Fase 1 jadi gate; cross-check dengan wallet nyata sebelum lanjut |
| Presisi desimal (float) → salah nominal | `bigint` + `parseUnits`/`formatUnits` di seluruh jalur amount |
| Faucet native kering → token tak bisa dikirim (tak ada gas) | pantau saldo gas, minta faucet lebih awal; Solana & XRPL paling longgar (otomatis via RPC) |
| RPC publik rate-limit/flaky | RPC dari `.env`, retry + backoff, endpoint fallback |
| Solana blockhash expired | `confirmTransaction` dengan `lastValidBlockHeight` + retry send |
| XRPL gagal karena reserve/trustline | cek `reserve_base_xrp` & trustline sebelum build; pesan error eksplisit |
| Seed produksi tak sengaja dipakai | banner peringatan, guard testnet, `.env` di `.gitignore` |

## 9. Definition of Done

1. Satu mnemonic menghasilkan address yang **cocok** dengan wallet referensi tiap chain.
2. Semua address ter-fund native coin dari faucet.
3. Token test berhasil dibuat & di-mint di 4 ledger.
4. Transfer token antar address sukses & terkonfirmasi di 4 ledger, dengan link explorer.
5. `npm test` hijau tanpa network (unit + test vector); integration test terpisah & ditandai.
6. `README.md`: cara setup, daftar faucet, contoh sesi end-to-end.

## Lampiran A — Kaia: open question (ditunda)

**Masalahnya.** Kaia punya dua konvensi derivation path yang sama-sama sah, dan menghasilkan
address berbeda dari mnemonic yang sama:

| Opsi | Path | Address | Konsekuensi |
|---|---|---|---|
| **A. Coin type 60** | `m/44'/60'/0'/0/{i}` | identik dengan Ethereum & Polygon | 1 address `0x…` untuk 3 chain; cocok kalau Kaia diakses via MetaMask |
| **B. Coin type 8217** | `m/44'/8217'/0'/0/{i}` | berbeda dari Ethereum | coin type terdaftar resmi di SLIP-44 untuk Klaytn/Kaia |
| **C. Dukung keduanya** | keduanya | tampilkan dua-duanya | tidak perlu menebak; pilih setelah lihat wallet |

**Yang belum dipastikan:** Kaia Wallet (eks Kaikas) pakai yang mana sebagai default.
Ini fakta empiris, bukan soal preferensi — jadi jangan diputuskan dari dokumentasi saja.

**Cara memutuskan (±10 menit, kapan saja):**
1. Import mnemonic test ke Kaia Wallet.
2. Catat address yang muncul.
3. Bandingkan dengan address Ethereum dari mnemonic yang sama.
   Kalau sama → Kaia Wallet pakai coin type 60 (Opsi A). Kalau beda → 8217 (Opsi B).

**Rekomendasi saya: Opsi C.** Untuk playground, menurunkan dua-duanya nyaris gratis
(satu panggilan derive tambahan) dan langsung menghapus tebak-tebakan — `address --ledger kaia`
cukup mencetak kedua kandidat beserta path-nya, lalu kamu pilih yang cocok dengan wallet.
Opsi A/B baru relevan kalau nanti harus mengunci satu path untuk sistem lain.

**Kenapa ini tidak memblokir apa pun:** adapter EVM dibuat config-driven, jadi mengaktifkan Kaia
nanti = menambah satu entri di `config/networks.ts` (chainId 1001, RPC Kairos, explorer KaiaScan)
plus path pilihan. Tidak ada kode adapter yang perlu ditulis ulang.

**Catatan teknis untuk nanti:** KIP-7 kompatibel ERC-20, jadi jalur token tidak berubah.
`@kaiachain/ethers-ext` hanya diperlukan kalau mau fee delegation khas Kaia — untuk transfer biasa,
`ethers` v6 + RPC Kairos sudah cukup.

## Nanti (di luar scope sekarang)

Kaia (Lampiran A), transfer BTC native (UTXO/PSBT/fee sat/vB), Runes/BRC-20,
UI web (Vite + React + antd, reuse `core` + `adapters`), batch/sweep multi-index,
Kaia fee delegation, EIP-2612 permit, simulasi air-gapped
(export unsigned JSON → sign di mesin lain → import signed).

## Urutan mulai

Fase 0 → Fase 1 (**jangan lewati verifikasi test vector**) → Fase 2 → Fase 3 → Fase 4 EVM dulu → XRPL → Solana.
