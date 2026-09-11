# TODO — Token Testing & Faucet Playground (Web UI Primary)

**Goal Utama:** Transaksi kirim aset melalui **Web UI**. CLI menjadi opsi kedua (secondary).
**Keamanan Mnemonic:** Mnemonic **hanya di-load di runtime** (in-memory session). Mnemonic di-generate bersama QR code (untuk difoto/disimpan), dan di-load via Scan QR (kamera/file) saat aplikasi dijalankan.

Legenda: `👤` = butuh tindakan manual user · `🌐` = butuh network/testnet RPC · sisanya offline.

---

## Fase 0 — Scaffold (Selesai ✅)

- [x] `git init` (branch `dev`)
- [x] `npm init -y`, set `"type": "module"`, Node 22+
- [x] Install runtime deps: `@scure/bip39`, `@scure/bip32`, `micro-key-producer`, `@scure/btc-signer`, `ethers`, `@solana/web3.js`, `@solana/spl-token`, `xrpl`, `commander`, `dotenv`
- [x] Install dev deps: `typescript`, `@types/node`, `vitest`, `oxlint`
- [x] `tsconfig.json` — strict, ESM, target ES2023, `moduleResolution: bundler`
- [x] `.oxlintrc.json` & `.gitignore`
- [x] `.env.example`
- [x] Script npm: `build`, `test`, `lint`, `pg`
- [x] `src/core/types.ts` — `LedgerId`, `Account`, `Asset`, `UnsignedTx`, `SignedTx`, `Balance`, `TxStatus`
- [x] `src/config/networks.ts` — RPC, explorer, faucet, chainId per ledger
- [x] `assertTestnet()` + **allowlist chainId** (11155111, 80002, solana-devnet, xrpl-testnet, btc-signet)
- [x] **Gate:** `npm run build` & `npm test` hijau

---

## Fase 1 — Seed, Derivasi Multi-Chain & Test Vectors (Selesai ✅)

- [x] `src/core/mnemonic.ts` — `generate()`, `validate()`, `toSeed()`, `getFingerprint()`
- [x] `src/core/amount.ts` — `parseAmount`/`formatAmount` pakai `bigint` (dilarang `number`)
- [x] `src/core/derive.ts` — BIP-32 (secp256k1) & SLIP-0010 (ed25519 all-hardened)
- [x] `src/core/registry.ts` — adapter registry
- [x] Derivasi 5 chain aktif: Ethereum, Polygon, Solana, XRPL, Bitcoin Signet
- [x] CLI commands: `pg seed new`, `pg seed info`, `pg address --ledger all|<id> --index <n>`
- [x] `test/vectors.test.ts` — deterministik test vectors mnemonic baku `abandon ... about`
- [x] **Gate:** 16 unit tests hijau, linting bersih, commit per task rapi

---

## Fase 2 — Web App Setup, QR Generator & Camera Scanner (Prioritas Utama 🚀)

### Setup Frontend
- [x] Setup Vite + React (TypeScript) untuk Web UI
- [x] Konfigurasi Vite polyfills (`buffer`, `crypto`) agar library blockchain berjalan di browser
- [x] Install library QR: `qrcode` (generate QR) & `html5-qrcode` (kamera & file scanner)
- [x] In-Memory Session Store — state runtime saja; frasa hilang saat tab ditutup / di-lock

### Komponen QR & Runtime Session
- [x] **QR Generator Modal / View**: Tampilkan frasa 12/24 kata + render gambar QR Code + tombol "Download QR"
- [x] **QR Scanner Modal**:
  - Tab 1: Pemindai Kamera/Webcam (scan foto QR dari layar HP)
  - Tab 2: Upload Gambar Foto QR (drag & drop file foto)
  - Tab 3: Paste frasa manual
- [x] **Header Bar & Status Sesi**: Indikator "Locked" / "Active (Fingerprint: ae0d...)" + tombol **"Lock / Clear Memory"**
- [x] **Desain Terinspirasi Rabby Wallet UI** (Palet Rabby Blue `#705BFF`, Dark Slate `#13141E`, rounded squircles, kartu portfolio, badge security shield, simulasi pre-flight transaksi, Google Font Inter/Outfit)
- [x] **Gate:** Generate seed -> Download/Foto QR -> Lock -> Scan QR via kamera/file -> Mnemonic ter-load di memori

---

## Fase 3 — Web UI Dashboard: Multi-Chain Accounts, Faucet & Balance 🌐

### Client-Side Adapters
- [x] `src/adapters/evm.ts` — Browser JSON-RPC provider (Sepolia & Amoy)
- [x] `src/adapters/solana.ts` — Browser Connection (Devnet)
- [x] `src/adapters/xrpl.ts` — Browser WebSocket client (Testnet)
- [x] `src/adapters/bitcoin.ts` — Fetch Esplora API (Signet)

### Komponen Dashboard
- [x] **Chain Selector**: Dropdown / Tabs untuk berganti jaringan (Ethereum, Polygon, Solana, XRPL, Bitcoin)
- [x] **Account Card**: Tampilkan address Index 0 (Utama) dan Index 1 (Penerima) + Derivation Path + tombol copy
- [x] **Balance Card**: Tampilkan saldo Native Coin & Test Token (real-time refresh)
- [x] **Integrated Faucet Card**:
  - Tombol 1-klik `Airdrop SOL` (Devnet)
  - Tombol 1-klik `Fund XRP` (Testnet)
  - Tautan Faucet eksternal + tombol copy address untuk Sepolia ETH, Amoy POL, Signet sBTC
- [x] **Gate:** Saldo native > 0 terbaca di dashboard Web UI untuk akun aktif

---

## Fase 4 — Web UI Transaksi: Deploy/Mint Token & Kirim Aset (Goal Utama 🎯) 🌐

### Bikin Token Test via UI
- [x] Tab/Modal **Token Creator**:
  - EVM: Deploy kontrak ERC-20 `TestToken.sol` & minting
  - Solana: Create SPL Mint & minting ke Associated Token Account (ATA)
  - XRPL: Set Trustline (Holder Index 1 → Issuer Index 0) & Issue TST IOU
- [x] Simpan registry token aktif di session storage / config

### Form Transaksi Kirim Aset (Send Asset)
- [x] Pilihan Aset: Native Coin atau Test Token
- [x] Pilihan Penerima: Quick-select "Akun Index 1 (Milik Sendiri)" atau input manual address lain
- [x] Input Jumlah (Amount) dengan validasi presisi `bigint` + tombol "Max"
- [x] Preview Biaya (Gas Fee, ATA Rent warning di Solana, Reserve requirement di XRPL)
- [x] Tombol **Kirim & Tanda Tangan** (offline signing di memori browser -> broadcast ke testnet)
- [x] Modal Konfirmasi Transaksi: Status Real-time (Pending → Confirmed) + Link ke Block Explorer
- [x] **Gate:** Berhasil kirim token dari Index 0 ke Index 1 di 4 ledger via Web UI, tautan explorer terverifikasi

---

## Fase 5 — CLI Parity (Opsi Kedua) & Kekokohan

- [x] CLI balance, faucet, dan send (dengan opsi `--dry-run` dan auto-resolve index penerima)
- [x] Validasi format address ketat lintas chain (`validateAddress` mencegah salah kirim antar chain)
- [x] Uji negatif di UI & CLI (saldo gas kurang, penerima salah format, RPC timeout)
- [x] **Gate:** Semua uji negatif menampilkan notifikasi error yang ramah di UI

---

## Dokumentasi & Finalisasi

- [x] `README.md` — setup & arsitektur awal
- [x] Update `README.md` — panduan menjalankan Web UI (`npm run dev`), alur QR Scanner, dan transaksi aset
- [x] Update `ledger.md` — status implementasi tiap chain
- [x] Catat transaksi contoh (tx hash) di `walkthrough.md`

---

## Fase 6 — Web Extension Migration (Chrome / Brave Manifest V3) 🧩

### 1. Bundler & Manifest Setup
- [x] Install dependency: `@types/chrome` & exclude `vm` polyfill untuk pencegahan error `eval` CSP
- [x] Buat file `manifest.json` (Manifest V3) di `public/manifest.json`:
  - Action popup: `index.html`
  - Side panel: `index.html` (Chrome 114+)
  - Permissions: `["storage", "sidePanel"]`
  - Host permissions: `["https://*/*", "wss://*/*"]` (untuk RPC EVM, Solana, XRPL WebSocket, Esplora API)
  - Icons: siapkan aset icon ekstensi (16x16, 48x48, 128x128 di `public/icons`)
- [x] Update `vite.config.ts`: Konfigurasi polyfill aman tanpa `eval` & build ekstensi
- [x] Update `package.json`: Tambahkan script `npm run build:ext`

### 2. Penyesuaian UI & Layout Extension
- [x] Sesuaikan style container utama di `src/web/styles/rabby.css` agar pas di viewport popup (~400px x 600px)
- [x] Pastikan modal (`MintTokenModal`, `FaucetModal`, `SendModal`, `QRGeneratorModal`, `QRScannerModal`) tidak overflow dan memiliki vertical scrolling yang rapi di dalam jendela popup
- [x] Tambahkan tombol **"Expand to Tab"** (`chrome.tabs.create`) di header agar pengguna bisa membuka dashboard dalam mode layar penuh (full-tab) kapan saja

### 3. Adaptasi Sesi Runtime (Mnemonic & Keamanan Memory)
- [x] Integrasikan `chrome.storage.session` ke dalam `src/web/context/SessionContext.tsx`:
  - Mnemonic disimpan di RAM browser runtime via `chrome.storage.session` agar tidak ter-reset saat jendela popup tertutup (unmount)
  - Tetap mematuhi prinsip non-persistent di disk: sesi otomatis terhapus saat browser di-close
- [x] Perbarui tombol **"Lock / Clear Memory"** agar seketika menghapus state React sekaligus membersihkan `chrome.storage.session`

### 4. Kamera & Pemindai QR di Extension
- [x] Evaluasi izin `getUserMedia` di popup:
  - Sediakan tombol "Buka Scanner di Tab Penuh" (`index.html?action=scan`) agar scan webcam laptop bebas hambatan dialog izin browser
  - Tab Upload Gambar QR dan Input Teks manual tetap aktif sebagai opsi utama

### 5. Pengujian & Verifikasi
- [ ] Jalankan `npm run build:ext` dan pastikan build bersih tanpa peringatan CSP (Content Security Policy)
- [ ] Load Unpacked di `chrome://extensions` pada browser Chrome / Brave
- [ ] **Gate:**
  - Ekstensi terbuka sebagai popup dari toolbar browser
  - Mnemonic berhasil di-unlock via QR / teks dan tersimpan di session storage
  - Popup ditutup lalu dibuka kembali: sesi tetap aktif tanpa meminta scan ulang
  - Saldo multi-chain ter-refresh via RPC
  - Klaim faucet (Solana / XRPL) dan mint TST berjalan sukses dari dalam ekstensi
  - Klik "Lock" berhasil membersihkan sesi seketika

---

## Ditunda (Backlog)

- [ ] 👤 **Kaia — putuskan coin type** (coin type 60 vs 8217 di Kaia Wallet)
- [ ] Transfer BTC native (UTXO / PSBT / Fee sat/vB)
- [ ] Runes / BRC-20
- [ ] Batch / sweep multi-index transfer
- [ ] Kaia fee delegation
- [ ] EIP-2612 permit

