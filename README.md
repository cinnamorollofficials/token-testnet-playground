# Token Testing & Faucet Playground

Aplikasi multi-chain khusus lingkungan **testnet** untuk pengujian lifecycle token, klaim faucet, pembuatan token uji (ERC-20, SPL Token, XRPL IOU), dan simulasi transfer antar-akun (Index 0 → Index 1).

* **Antarmuka Utama:** **Web Application (Vite + React)** dengan referensi desain **Rabby Wallet** (Dark slate `#0C0D14`, Rabby purple `#705BFF`, kartu portfolio hero, squircle action buttons, dan modal simulasi pre-execution transfer).
* **Antarmuka Kedua:** **CLI (`pg`)** untuk kebutuhan scripting dan terminal.
* **Keamanan Mnemonic:** Mnemonic **hanya di-load di runtime** (in-memory session). Dibuat bersama QR Code (untuk difoto/disimpan), dan di-load via **Scan QR (Kamera Webcam / Upload Foto)** saat aplikasi dijalankan, tanpa menyimpan plaintext di harddisk.

> [!WARNING]
> **TESTNET ONLY — NOL NILAI NYATA**
> Playground ini dilindungi secara ketat oleh fungsi `assertTestnet()` yang memblokir transaksi ke Mainnet Chain ID. **Dilarang keras** menggunakan frasa mnemonic atau kunci privat dari dompet utama/produksi Anda!

---

## Daftar Ledger yang Didukung

| Ledger | Jaringan Testnet | Chain ID / Net ID | Derivation Path | Format Alamat | Status |
|---|---|---|---|---|---|
| **Ethereum** | Sepolia | `11155111` | `m/44'/60'/0'/0/{i}` | EIP-55 Checksum (`0x…`) | **Aktif** |
| **Polygon** | Amoy | `80002` | `m/44'/60'/0'/0/{i}` | EIP-55 Checksum (`0x…`) | **Aktif** |
| **Solana** | Devnet | `solana-devnet` | `m/44'/501'/{i}'/0'` | Base58 (SLIP-0010 All-Hardened) | **Aktif** |
| **XRPL (Ripple)** | Testnet | `xrpl-testnet` | `m/44'/144'/0'/0/{i}` | Classic Address (`r…`) | **Aktif** |
| **Bitcoin** | Signet | `btc-signet` | `m/84'/1'/0'/0/{i}` | Bech32 Native SegWit (`tb1q…`) | **Aktif (Saldo)** |
| **Kaia** | Kairos | `1001` | *60 vs 8217* | EIP-55 Checksum (`0x…`) | **Ditunda (Backlog)** |

---

## Memulai Aplikasi Web (Primary)

```bash
# 1. Instal dependensi
npm install

# 2. Jalankan Dev Server Web UI
npm run dev
```

Buka browser di `http://localhost:3000`.

### Alur Penggunaan Web UI (Referensi: Rabby Wallet)

1. **Unlock Sesi Runtime via QR Code:**
   - **Pilihan A (Pengguna Baru):** Klik **"Generate Mnemonic Baru + QR Code"**. Frasa 12/24 kata akan digenerate bersama tampilan QR Code interaktif. Unduh atau foto QR Code tersebut menggunakan HP.
   - **Pilihan B (Scan QR):** Klik **"Scan QR Code via Kamera / Foto"**. Anda dapat:
     - Mengarahkan layar HP berisi foto QR ke kamera webcam laptop.
     - Meng-upload file foto/screenshot QR dari laptop.
     - Memasukkan frasa teks manual.
   - Mnemonic otomatis ter-load ke **memori RAM browser**.
   - Kapan saja Anda ingin mengunci kembali, klik tombol **"Active (ae0d...) - Lock"** di pojok kanan atas untuk menghapus seed dari memori seketika.
2. **Dashboard & Portfolio Hero:**
   - Ganti jaringan melalui pemilih network (Sepolia, Amoy, Solana Devnet, XRPL, Signet).
   - Lihat alamat Akun #0 (Utama) dan beralih ke Akun #1 (Penerima) untuk menyalin address.
   - Saldo native coin dan test token ter-refresh secara real-time via RPC.
3. **Klaim Faucet:**
   - Klik squircle **Faucet**:
     - Solana Devnet: 1-klik `Airdrop 1 SOL`.
     - XRPL Testnet: 1-klik `Fund XRP`.
     - Sepolia / Amoy / Signet: Buka link faucet web resmi + tombol copy address siap paste.
4. **Deploy & Mint Token Test:**
   - Klik squircle **Mint TST** untuk mencetak 1,000 token test TST atau men-deploy kontrak `TestToken.sol` sendiri di testnet.
5. **Kirim Aset (Send Asset) dengan Simulasi Khas Rabby:**
   - Klik squircle **Send**.
   - Pilih aset (Test Token TST atau Native Coin).
   - Klik **"+ Akun #1 (Milik Sendiri)"** untuk otomatis mengisi address akun penerima Index 1.
   - Masukkan jumlah nominal.
   - Klik **"Preview & Simulasi Transaksi"** untuk memunculkan **Pre-execution Simulation Modal**:
     - *Green Shield*: Testnet Pre-flight Guard Verified.
     - *Simulasi Perubahan Saldo*: Pengirim `-10.0 TST`, Penerima `+10.0 TST`.
     - *Estimasi Fee*: Rincian gas fee dan peringatan ATA rent / reserve.
   - Klik **"Sign & Submit Transaksi"**: Transaksi ditandatangani secara offline di memori dan disiarkan ke testnet. Tautan resmi ke Block Explorer langsung tersedia.

---

## Menjalankan sebagai Web Extension (Chrome / Brave Manifest V3) 🧩

Aplikasi ini dapat langsung dipasang sebagai **ekstensi browser** (popup toolbar atau side panel):

```bash
# 1. Build bundle ekstensi (output ke dist/ext)
npm run build:ext
```

### Cara Memasang di Chrome / Brave:
1. Buka `chrome://extensions/` (atau `brave://extensions/`) di browser Anda.
2. Aktifkan sakelar **"Developer mode"** di pojok kanan atas.
3. Klik tombol **"Load unpacked"** di pojok kiri atas.
4. Pilih folder **`dist/ext`** dari repository ini.
5. Selesai! Pin ikon **Token Testnet Playground** ke toolbar browser Anda.

### Fitur di Lingkungan Ekstensi:
* **Popup Viewport yang Pas**: Desain responsif otomatis menyesuaikan dimensi popup wallet (~400px x 600px).
* **In-Memory Session Persistence (`chrome.storage.session`)**: Mnemonic sesi disimpan di RAM runtime browser selama browser dibuka, sehingga sesi tetap aktif saat popup ditutup dan dibuka kembali tanpa menyimpan plaintext di disk.
* **Tombol Expand to Tab**: Klik ikon tautan eksternal di header kapan saja untuk membuka dashboard playground dalam mode tab penuh.
* **Side Panel Ready**: Mendukung Chrome Side Panel API (`chrome.sidePanel`) untuk pengujian berdampingan dengan web dApp/explorer.

---

## Menggunakan CLI (`pg`) (Secondary)

CLI dapat digunakan jika Anda lebih menyukai antarmuka terminal:

```bash
# 1. Konfigurasi .env (opsional untuk CLI)
cp .env.example .env
# Isi MNEMONIC="..." di .env

# 2. Perintah CLI
npm run pg -- seed new                     # Buat mnemonic baru
npm run pg -- seed info                    # Cek fingerprint mnemonic
npm run pg -- address                      # Tampilkan address Index 0 untuk semua ledger
npm run pg -- address -i 1                 # Tampilkan address Index 1
npm run pg -- balance                      # Cek saldo native semua ledger
npm run pg -- faucet -l solana             # Airdrop 1 SOL
npm run pg -- send -l ethereum --to 1 -a 0.001 --dry-run  # Simulasi kirim tanpa broadcast
```

---

## Pengujian & Verifikasi Kualitas

```bash
# Menjalankan 22 unit tests Vitest (Derivasi, amount bigint, testnet guards, cross-chain address validation)
npm test

# Menjalankan oxlint
npm run lint

# Kompilasi TypeScript & Web build Vite
npm run build && npm run build:web
```

---

## Struktur Direktori Proyek

```
test-playground/
├── src/
│   ├── web/                       # Web Application (Rabby Wallet Style)
│   │   ├── components/            # QRGeneratorModal, QRScannerModal, FaucetModal, ReceiveModal, MintTokenModal, SendModal
│   │   ├── context/               # SessionContext (In-memory ephemeral runtime mnemonic)
│   │   ├── styles/                # rabby.css (Design system, squircles, dark slate palette)
│   │   ├── App.tsx                # Dashboard view utama
│   │   └── main.tsx               # React root entry
│   ├── cli/                       # CLI commands (pg seed, address, balance, faucet, send)
│   ├── contracts/                 # TestToken.sol & TestTokenArtifact.ts
│   ├── adapters/                  # Multi-chain adapters (EVM, Solana, XRPL, Bitcoin)
│   ├── core/                      # amount.ts, derive.ts, mnemonic.ts, registry.ts, types.ts, validate.ts
│   └── config/                    # networks.ts, tokens.ts
├── test/                          # Unit tests & deterministic vectors
├── index.html                     # Web entry HTML
├── vite.config.ts                 # Vite bundler & browser crypto polyfills
├── tsconfig.json                  # Strict TypeScript configuration
├── PLAN.md                        # Master architectural specification
├── TODO.md                        # Task checklist & execution gates
└── ledger.md                      # Supported ledgers & status matrix
```
