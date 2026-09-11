# Token Testing & Faucet Playground (`pg`)

Playground CLI multi-chain khusus lingkungan **testnet** untuk pengujian lifecycle token, derivasi alamat multi-chain deterministik dari satu master seed BIP-39, integrasi faucet, pembuatan token uji (ERC-20, SPL Token, XRPL IOU), dan simulasi transfer antar-akun.

> [!WARNING]
> **TESTNET ONLY — NOL NILAI NYATA**
> Playground ini dilindungi secara ketat oleh fungsi `assertTestnet()` yang memblokir transaksi ke Mainnet Chain ID. **Dilarang keras** menggunakan frasa mnemonic atau kunci privat dari dompet utama/produksi Anda!

---

## Daftar Ledger yang Didukung

| Ledger | Jaringan Testnet | Chain ID / Net ID | Derivation Path | Format Alamat | Status |
|---|---|---|---|---|---|
| **Ethereum** | Sepolia | `11155111` | `m/44'/60'/0'/0/{i}` | EIP-55 Checksum (`0x…`) | Aktif |
| **Polygon** | Amoy | `80002` | `m/44'/60'/0'/0/{i}` | EIP-55 Checksum (`0x…`) | Aktif |
| **Solana** | Devnet | `solana-devnet` | `m/44'/501'/{i}'/0'` | Base58 (SLIP-0010 All-Hardened) | Aktif |
| **XRPL** | Testnet | `xrpl-testnet` | `m/44'/144'/0'/0/{i}` | Classic Address (`r…`) | Aktif |
| **Bitcoin** | Signet | `btc-signet` | `m/84'/1'/0'/0/{i}` | Bech32 Native SegWit (`tb1q…`) | Faucet & Saldo |
| **Kaia** | Kairos | `1001` | *60 vs 8217* | EIP-55 Checksum (`0x…`) | Ditunda (Kandidat A & B siap) |

---

## Fitur Utama & Prinsip Desain

1. **Satu Seed BIP-39 untuk Seluruh Chain:**
   Hanya satu frasa mnemonic yang perlu di-backup. Derivasi ke tiap chain mengikuti standar resmi:
   - **BIP-32 (secp256k1):** Ethereum, Polygon, XRPL, Bitcoin.
   - **SLIP-0010 (ed25519):** Solana dengan path **all-hardened** (`0'/0'`).
2. **Presisi Nominal Berbasis `bigint`:**
   Semua kalkulasi nilai token dan coin terkecil (*smallest units / wei / satoshi / lamports / drops*) menggunakan `bigint`. Dilarang menggunakan JavaScript floating-point `number`.
3. **Pemisahan Siklus Transaksi (Air-gap / Custody Friendly):**
   Setiap adapter memisahkan logika `buildTransfer` (estimasi fee & preview), `sign` (offline), dan `broadcast`.
4. **Keamanan & Privasi CLI:**
   Mnemonic hanya dibaca dari `.env` atau interactive prompt. Frasa rahasia tidak pernah dilewatkan via argumen baris perintah (`argv`) dan otomatis diredaksi pada log/error.

---

## Panduan Instalasi & Setup

### Prasyarat
- **Node.js:** Versi 22 atau lebih baru (ESM native).
- **npm:** Versi 10 atau lebih baru.

### Langkah Instalasi
```bash
# 1. Clone repositori & masuk ke direktori
git clone git@github.com:cinnamorollofficials/token-testnet-playground.git
cd token-testnet-playground

# 2. Instal dependensi
npm install

# 3. Buat file konfigurasi lingkungan (.env)
cp .env.example .env

# 4. Compile kode TypeScript
npm run build
```

---

## Panduan Penggunaan CLI (`pg`)

CLI dapat dijalankan menggunakan:
```bash
npm run pg -- <command>
# atau langsung:
node dist/index.js <command>
```

### 1. Manajemen Seed Phrase (`pg seed`)

#### Generate Seed Baru (`pg seed new`)
Menghasilkan frasa seed BIP-39 acak baru khusus testnet beserta fingerprint-nya:
```bash
# 12 kata (default)
npm run pg -- seed new

# 24 kata
npm run pg -- seed new --words 24
```
*Tempelkan mnemonic yang dihasilkan ke dalam `.env`: `MNEMONIC="..."`.*

#### Cek Info & Validasi Seed (`pg seed info`)
Memvalidasi frasa seed di `.env` dan menampilkan fingerprint SHA-256 tanpa pernah mencetak frasa mnemonic aslinya ke terminal:
```bash
npm run pg -- seed info
```

---

### 2. Menampilkan Alamat Derivasi (`pg address`)

Menderivasi address untuk tiap ledger sesuai account index. Derivation path akan selalu ditampilkan di samping alamat.

#### Tampilkan Semua Ledger (Index 0 - Default)
```bash
npm run pg -- address
```

Contoh output:
```text
Derived Testnet Addresses (Index 0):
+----------+-------+-------------------+----------------------------------------------+
| Ledger   | Index | Derivation Path   | Address                                      |
+----------+-------+-------------------+----------------------------------------------+
| ethereum | 0     | m/44'/60'/0'/0/0  | 0xfdd7E802723745ED8140D1fa8da8C3266545CE7f   |
| polygon  | 0     | m/44'/60'/0'/0/0  | 0xfdd7E802723745ED8140D1fa8da8C3266545CE7f   |
| solana   | 0     | m/44'/501'/0'/0'  | AEcmiNdYVrUUcbrjVMsBqLrtHzfw7ciTYv4GZCjvppFT |
| xrpl     | 0     | m/44'/144'/0'/0/0 | raTfyLnjjuHaj6nm3LeBiqirpqyDKeowS7           |
| bitcoin  | 0     | m/84'/1'/0'/0/0   | tb1q9ztsj3jx7kdk492evnh2c3kr958pg3v54g2gea   |
+----------+-------+-------------------+----------------------------------------------+
```

#### Tampilkan Akun Index Tertentu (Misal Index 1 untuk Akun Penerima)
```bash
npm run pg -- address --index 1
# atau singkatnya:
npm run pg -- address -i 1
```

#### Tampilkan Ledger Tertentu
```bash
# Solana saja
npm run pg -- address --ledger solana

# Kaia (menampilkan kedua opsi kandidat: coin type 60 dan 8217)
npm run pg -- address --ledger kaia
```

---

## Daftar Faucet Testnet (Koin Native untuk Gas & Reserve)

Sebelum dapat membuat atau mentransfer token, akun Index 0 memerlukan saldo koin native:

| Ledger | Koin Native | Faucet URL / Mekanisme | Keterangan |
|---|---|---|---|
| **Ethereum Sepolia** | ETH | [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) / [Alchemy Sepolia Faucet](https://www.alchemy.com/faucets/ethereum-sepolia) | Klaim manual ke address Sepolia Anda |
| **Polygon Amoy** | POL | [Polygon Technology Faucet](https://faucet.polygon.technology/) | Klaim manual ke address Amoy Anda |
| **Solana Devnet** | SOL | `requestAirdrop` otomatis via CLI atau [Solana Web Faucet](https://faucet.solana.com/) | Otomatis via `pg faucet --ledger solana` |
| **XRPL Testnet** | XRP | [XRPL Testnet Faucet](https://faucet.altnet.rippletest.net/accounts) | Otomatis via `pg faucet --ledger xrpl` |
| **Bitcoin Signet** | sBTC | [Signet Faucet](https://signetfaucet.com/) | Masukkan address `tb1q…` |

---

## Menjalankan Pengujian (Testing & Quality)

```bash
# Menjalankan suite pengujian unit & test vector offline
npm test

# Menjalankan linter oxlint
npm run lint

# Kompilasi TypeScript strict
npm run build
```

---

## Struktur Direktori

```
test-playground/
├── src/
│   ├── index.ts                   # CLI entry point (commander)
│   ├── config/
│   │   ├── networks.ts            # Konfigurasi RPC, explorer, dan guard assertTestnet()
│   │   └── tokens.ts              # Token registry (EVM, SPL, XRPL)
│   ├── core/
│   │   ├── types.ts               # Domain types & LedgerAdapter interface
│   │   ├── amount.ts              # Konversi nominal presisi bigint
│   │   ├── mnemonic.ts            # Generator BIP-39, validator, & fingerprint
│   │   ├── derive.ts              # Logika derivasi BIP-32 & SLIP-0010 multi-chain
│   │   └── registry.ts            # Adapter registry
│   ├── adapters/                  # Implementasi blockchain adapters (EVM, Solana, XRPL, BTC)
│   └── cli/
│       ├── commands/              # Sub-command CLI (seed, address, balance, faucet, token, send)
│       └── utils/                 # Formatter tabel & prompt terminal
├── test/
│   ├── scaffold.test.ts           # Uji assertTestnet guard & konfigurasi jaringan
│   ├── amount.test.ts             # Uji presisi parsing & format bigint
│   └── vectors.test.ts            # Test vector deterministik BIP-39/BIP-32/SLIP-10
├── .env.example                   # Template konfigurasi environment
├── .oxlintrc.json                 # Konfigurasi linter
├── tsconfig.json                  # Konfigurasi compiler TypeScript
├── PLAN.md                        # Master architectural plan
├── TODO.md                        # Task checklist & execution gates
└── ledger.md                      # Daftar status dukungan chain
```
