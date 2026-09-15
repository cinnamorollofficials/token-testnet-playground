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
- [x] Jalankan `npm run build:ext` dan pastikan build bersih tanpa peringatan CSP (Content Security Policy)
- [x] Siapkan instruksi Load Unpacked di `chrome://extensions` pada browser Chrome / Brave
- [x] Update `README.md` dengan panduan instalasi & pengujian Web Extension
- [x] **Gate:**
  - Verifikasi otomatis seluruh file bundle `dist/ext` (manifest.json, HTML popup, icons 16/48/128)
  - Mnemonic persistence via `chrome.storage.session` (RAM runtime session)
  - Responsiveness popup wallet viewport (~400px x 600px) & modal vertical scroll
  - Tombol "Expand to Tab" & fallback scanner tab berfungsi
  - Build dan linter 100% bersih, 22 unit tests passed hijau

---

## Fase 7 — Standarisasi Border Radius (Design System 8px) 📐

- [x] **1. Design Tokens & CSS Variables Refactoring (`src/web/styles/rabby.css`)**
  - [x] Definisikan `--radius-base: 8px` sebagai standar utama elemen UI kotak
  - [x] Definisikan `--radius-outer: 12px` (atau selaraskan `--radius-lg: 12px`) untuk wadah luar kartu & modal
  - [x] Selaraskan `--radius-md: 8px` dan `--radius-sm: 8px`
  - [x] Pertahankan `--radius-pill: 9999px` untuk chips/pills dan `50%` untuk avatar/logo koin
- [x] **2. Standarisasi Elemen Dashboard Inti (`src/web/styles/rabby.css`)**
  - [x] `.rabby-chart-glass-card`: ubah dari 18px $\rightarrow$ `var(--radius-base)` (8px)
  - [x] `.rabby-action-squircle`: ubah dari 14px $\rightarrow$ `var(--radius-base)` (8px)
  - [x] `.rabby-token-item`: ubah dari 16px $\rightarrow$ `var(--radius-base)` (8px)
  - [x] `.rabby-tx-item`: ubah dari 14px $\rightarrow$ `var(--radius-base)` (8px)
  - [x] `.rabby-empty-tx`: ubah dari 16px $\rightarrow$ `var(--radius-base)` (8px)
  - [x] `.rabby-account-pill`: ubah dari 14px $\rightarrow$ `var(--radius-base)` (8px)
  - [x] `.rabby-card`: selaraskan border-radius ke `var(--radius-outer)` (12px)
  - [x] Pastikan avatar token koin (`.rabby-token-avatar-img`) & chain badge tetap `50%` (bulat)
- [x] **3. Standarisasi Modal & Form Controls (`rabby.css` & Modal Components)**
  - [x] `.rabby-modal-card`: selaraskan ke `var(--radius-outer)` (12px)
  - [x] `.rabby-btn-primary`, `.rabby-btn-secondary`: selaraskan ke `var(--radius-base)` (8px)
  - [x] `.rabby-input`, `.rabby-select`, `.rabby-chain-btn`: selaraskan ke `var(--radius-base)` (8px)
  - [x] `.rabby-shield-box`, `.rabby-qr-box`: selaraskan ke `var(--radius-base)` (8px)
  - [x] Selaraskan inline `borderRadius` di `SendModal.tsx`, `ReceiveModal.tsx`, `MintTokenModal.tsx`, `QRScannerModal.tsx`, `QRGeneratorModal.tsx` ke `var(--radius-base)` (8px)
- [x] **4. Verifikasi, Uji & Build**
  - [x] Validasi linter: `npm run lint` (0 error, 0 warning)
  - [x] Jalankan unit tests: `npm run test` (39 tests hijau)
  - [x] Validasi build web & extension: `npm run build:web` & `npm run build:ext`
  - [x] Commit per task rapi sesuai git workflow

---

## Fase 8 — Transisi UI: Bottom Sheet (Data Pendek) & Halaman Baru (Data Panjang) 📱

- [x] **1. Komponen Fondasi BottomSheet & SubpageLayout + Styling CSS**
  - [x] Buat `src/web/components/BottomSheet.tsx` (backdrop blur, slide-up animation, handle pill, header, close handlers)
  - [x] Buat `src/web/components/SubpageLayout.tsx` (sticky top bar, tombol Back `<ArrowLeft />`, title, right action, scrollable body)
  - [x] Tambahkan styling & animasi `.rabby-sheet-*` dan `.rabby-subpage-*` di `src/web/styles/rabby.css`
- [x] **2. Konversi Aksi Cepat ke Bottom Sheet (Data Pendek)**
  - [x] Konversi `ReceiveModal` menjadi `ReceiveSheet` (menggunakan `BottomSheet` untuk QR code & address copy)
  - [x] Konversi `FaucetModal` menjadi `FaucetSheet` (menggunakan `BottomSheet` untuk 1-click testnet funding)
- [x] **3. Konversi Alur Panjang ke Halaman Baru / Subpage (Data Panjang)**
  - [x] Konversi `SendModal` menjadi `SendView` (menggunakan `SubpageLayout` untuk form transfer, estimasi fee, simulasi saldo)
  - [x] Konversi `MintTokenModal` menjadi `MintTokenView` (menggunakan `SubpageLayout` untuk deploy smart contract & minting)
  - [x] Konversi `TransactionModal` menjadi `TransactionView` (menggunakan `SubpageLayout` untuk filter & riwayat transaksi panjang)
- [x] **4. Integrasi Screen Routing di App.tsx & Penyelarasan Onboarding**
  - [x] Tambahkan state navigasi `currentScreen` (`dashboard`, `send`, `mint`, `transactions`, `scanner`, `generator`) di `App.tsx`
  - [x] Hubungkan aksi tombol Quick Actions & Asset rows untuk berpindah screen atau memunculkan bottom sheet
  - [x] Hubungkan tombol Back pada setiap subpage untuk kembali ke `dashboard`
- [x] **5. Pengujian, Verifikasi & Dokumentasi**
  - [x] Validasi linter `npm run lint` (0 error, 0 warning)
  - [x] Validasi 39 unit tests `npm run test` (seluruh tes hijau)
  - [x] Validasi build web dan Chrome extension (`npm run build:web`, `npm run build:ext`)
  - [x] Update `walkthrough.md` dan commit per task

---

## Fase 9 — Tampilan Saldo Kripto & Harga Token di List Aset + Sembunyikan di Layar Kecil 📊

- [x] **1. CSS Design System & Responsivitas (`src/web/styles/rabby.css`)**
  - [x] Tambahkan styling `.rabby-token-right` (kolom kanan flex-end)
  - [x] Tambahkan styling `.rabby-token-fiat-val` (valuasi IDR bold di kanan atas)
  - [x] Tambahkan styling `.rabby-token-crypto-amount` (saldo koin kripto di kiri bawah)
  - [x] Tambahkan styling `.rabby-token-price-row` & `.rabby-token-unit-price` (kurs per token di kanan bawah)
  - [x] Tambahkan media query `@media (max-width: 400px)` untuk menyembunyikan `.rabby-token-price-row` di layar kecil
  - [x] Selaraskan transisi hover dengan tombol `.rabby-quick-send-btn`
- [x] **2. Integrasi Markup 2-Kolom List Aset di App.tsx**
  - [x] Perbarui perulangan aset di `App.tsx` agar menyajikan struktur 2-kolom 2-baris sesuai Rabby Wallet
  - [x] Kolom Kiri: Avatar & badge + Nama Token (atas) & Jumlah Saldo Kripto (bawah, `formatDisplayBalance(bal?.formatted, 4)`)
  - [x] Kolom Kanan: Total Valuasi IDR (atas, `formatIDR(assetIdrVal)`) & Harga Satuan Token (bawah, `formatIDR(rates[asset.symbol]?.priceIdr)`)
- [x] **3. Pengujian, Verifikasi & Dokumentasi**
  - [x] Validasi linter `npm run lint` (0 error, 0 warning)
  - [x] Validasi 39 unit tests `npm run test` (seluruh tes hijau)
  - [x] Validasi build web dan Chrome extension (`npm run build:web`, `npm run build:ext`)
  - [x] Update `walkthrough.md` dan commit per task

---

## Fase 10 — Penghilangan Seluruh Shadow di `.rabby-app-container` & Elemen Anaknya 🚫✨

- [x] **1. CSS Design System & Pembersihan Shadow (`src/web/styles/rabby.css`)**
  - [x] Set variabel `--shadow-card: none` dan `--shadow-glow: none`
  - [x] Tambahkan aturan penegakan flat `.rabby-app-container, .rabby-app-container * { box-shadow: none !important; }`
  - [x] Hapus seluruh deklarasi `box-shadow` pada header brand icon, network btn, card utama, chart glass card & hover, action squircle & hover, action tx badge, tombol primary & secondary, avatar wrap, chain badge, bottom sheet, modal dialog, qr box, active tabs, quick send btn & hover, live dot, dan tx item hover
- [x] **2. Pembersihan Inline Shadow Style di Komponen (`src/web/App.tsx`)**
  - [x] Hapus inline style `boxShadow: 'var(--shadow-glow)'` pada onboarding icon dompet
- [x] **3. Pengujian, Verifikasi & Dokumentasi**
  - [x] Validasi linter `npm run lint` (0 error, 0 warning)
  - [x] Validasi 39 unit tests `npm run test` (seluruh tes hijau)
  - [x] Validasi build web dan Chrome extension (`npm run build:web`, `npm run build:ext`)
  - [x] Update `walkthrough.md` dan commit per task

---

## Fase 11 — Tambah Bitcoin Testnet 4 (di samping Signet) ₿

### 1. Type System (`src/core/types.ts`)
- [x] Tambah `'bitcoin-t4'` ke union type `LedgerId`

### 2. Konfigurasi Jaringan (`src/config/networks.ts`)
- [x] Tambah `'btc-testnet4'` ke `ALLOWLISTED_TESTNET_IDS`
- [x] Tambah entry logo `'bitcoin-t4'` di `LEDGER_LOGOS`
- [x] Tambah blok `NetworkConfig` baru untuk `'bitcoin-t4'`:
  - `rpcUrl`: `mempool.space/testnet4/api` (env: `BITCOIN_TESTNET4_EXPLORER`)
  - `explorerUrl`: `mempool.space/testnet4`
  - `faucetUrl`: `testnet4.anyone.eu.org`
  - `nativeAsset.symbol`: `tBTC`
- [x] Bitcoin Signet (`'bitcoin'`) **tidak diubah**

### 3. Adapter Baru (`src/adapters/bitcoin-t4.ts`)
- [x] Buat `BitcoinT4Adapter` (LedgerId: `'bitcoin-t4'`)
- [x] Reuse `deriveBitcoin()` — BIP-84 coin type `1'` identik Signet, address `tb1q…` valid
- [x] `getBalance()` fetch dari `NETWORKS['bitcoin-t4'].rpcUrl` (config-driven)
- [x] Return symbol `tBTC`

### 4. Wiring Core (`registry.ts`, `derive.ts`, `tokens.ts`)
- [x] `registry.ts`: import & register `BitcoinT4Adapter`
- [x] `derive.ts`: tambah `case 'bitcoin-t4'` ke router `deriveAccount()`
- [x] `tokens.ts`: tambah `'bitcoin-t4': null` ke `DEFAULT_TEST_TOKENS`

### 5. Session Context (`src/web/context/SessionContext.tsx`)
- [x] Tambah `'bitcoin-t4'` ke `ACTIVE_LEDGERS`
- [x] Tambah `'bitcoin-t4': null` ke `accounts` & `recipientAccounts` emptyMap

### 6. Web UI (`src/web/App.tsx`)
- [x] `SUPPORTED_LEDGERS`: tambah `{ id: 'bitcoin-t4', label: 'BTC Testnet 4 (tBTC)' }`
- [x] `ALL_ASSETS`: tambah asset `'bitcoin-t4-native'` (tBTC, badge `Testnet 4`, gradient berbeda)
- [x] `loadingLedgers`: tambah `'bitcoin-t4': true` di initial & reset state
- [x] `fetchAllBalances` otomatis via loop `ACTIVE_LEDGERS` — tidak perlu perubahan tambahan

### 7. CLI & Env
- [x] `rate.ts`: tambah `{ name: 'Bitcoin', testnet: 'Testnet 4', symbol: 'tBTC' }` di `ASSET_CATALOG`
- [x] `.env.example`: tambah `BITCOIN_TESTNET4_EXPLORER=` di samping `BITCOIN_SIGNET_EXPLORER=`

### 8. Verifikasi & Gate ✅
- [x] `npm run lint` — 0 error, 0 warning (49 files)
- [x] `npm run test` — 39 tests hijau
- [x] `npm run build:web` — build bersih
- [x] `npm run build:ext` — build bersih
- [x] 7 commit per task: `feat(bitcoin-t4): ...`

---

## Fase 12 — Glass Morphism Effect ke Semua Card 🪟✨

- [x] **1. CSS Design Tokens (`src/web/styles/rabby.css`)**
  - [x] Tambah `--glass-bg-heavy/medium/light` (3 tier gradient semi-transparan)
  - [x] Tambah `--glass-blur-heavy/medium/light` (blur 16px / 12px / 8px)
  - [x] Tambah `--glass-border` (`rgba(255,255,255,0.09)`)
  - [x] Tambah `--glass-border-hover` (`rgba(112,91,255,0.40)` — primary glow)
- [x] **2. Glass Medium — Card Utama**
  - [x] `.rabby-card`: solid → `var(--glass-bg-medium)` + `backdrop-filter: blur(12px)` + hover glow
  - [x] `.rabby-hero-card`: gradient solid → `var(--glass-bg-medium)` + blur + hover glow
- [x] **3. Glass Medium — Overlay Surfaces**
  - [x] `.rabby-modal-card`: solid → glass-medium (sangat efektif di atas overlay backdrop)
  - [x] `.rabby-sheet-card`: solid → glass-medium (efektif di bottom sheet)
- [x] **4. Glass Light — Elemen Interaktif**
  - [x] `.rabby-action-squircle`: solid → glass-light; hover escalates ke glass-medium + glow
  - [x] `.rabby-account-pill`: solid → glass-light + hover glow
- [x] **5. Glass Light — Asset List**
  - [x] `.rabby-token-item`: solid → glass-light; hover escalates ke glass-medium + glow
- [x] **6. Hover System — Semua Card Glass**
  - [x] Semua card glass punya `border-color: var(--glass-border-hover)` saat hover
  - [x] `.rabby-chart-glass-card` sudah ada dari sebelumnya (tidak berubah)
  - [x] Shield box (hijau) & QR box (putih) **tidak disentuh** (intentional)
- [x] **7. Verifikasi & Gate**
  - [x] `npm run lint` — 0 error, 0 warning (49 files)
  - [x] `npm run test` — 39 tests hijau
  - [x] `npm run build:web` & `npm run build:ext` — build bersih
  - [x] 6 commit per task: `feat(glass): ...`

---

## Ditunda (Backlog)


- [ ] 👤 **Kaia — putuskan coin type** (coin type 60 vs 8217 di Kaia Wallet)
- [ ] Transfer BTC native (UTXO / PSBT / Fee sat/vB)
- [ ] Runes / BRC-20
- [ ] Batch / sweep multi-index transfer
- [ ] Kaia fee delegation
- [ ] EIP-2612 permit




## Fase 15 — Penyimpanan Aman Wallet & Enkripsi Password (AES-256-GCM + PBKDF2) (SELESAI)

- [x] **Task 1: Core Cryptography & Types** (Commit: `21a56d0`)
  - Implementasi `src/core/vault.ts` (WebCrypto AES-256-GCM, PBKDF2 100k rounds, salt/IV random)
  - Type definitions `EncryptedVault` & `VaultPayload` di `src/core/types.ts`
  - Cross-platform storage adapter (`localStorage` + `chrome.storage.local`)
- [x] **Task 2: Unit Testing Core Vault** (Commit: `b4678e8`)
  - `test/vault.test.ts` (uji enkripsi, dekripsi benar, salah password, tamper detection — 6 tests passed)
- [x] **Task 3: State Management (SessionContext)** (Commit: `83fa1b8`)
  - State `hasVault`, deteksi vault, method `unlockWithPassword`, `setupVaultWithPassword`, `resetVault`
- [x] **Task 4: UI PasswordUnlockView & Styling** (Commit: `934f989`)
  - Komponen lock screen glassmorphism, input password toggle visibility, tombol unlock & reset
  - Styling di `src/web/styles/rabby.css`
- [x] **Task 5: UI SetPasswordModal** (Commit: `6971bf5`)
  - Modal buat password baru saat onboarding / import mnemonic
- [x] **Task 6: Integrasi App.tsx** (Commit: `fda1378`)
  - Screen routing lock/unlock berdasarkan status vault & session
- [x] **Task 7: Verifikasi & Build**
  - Lint (0 warning, 0 error), test suite (45 tests passed), build web & chrome extension sukses