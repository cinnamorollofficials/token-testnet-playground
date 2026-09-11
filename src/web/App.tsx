import React, { useState } from 'react';
import { useSession } from './context/SessionContext.js';
import { NETWORKS } from '../config/networks.js';
import type { LedgerId } from '../core/types.js';
import { QRGeneratorModal } from './components/QRGeneratorModal.js';
import { QRScannerModal } from './components/QRScannerModal.js';
import {
  Wallet,
  Lock,
  Unlock,
  Copy,
  Check,
  Send,
  Droplets,
  Coins,
  QrCode,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

const SUPPORTED_LEDGERS: { id: LedgerId; label: string }[] = [
  { id: 'ethereum', label: 'Sepolia (ETH)' },
  { id: 'polygon', label: 'Amoy (POL)' },
  { id: 'solana', label: 'Devnet (SOL)' },
  { id: 'xrpl', label: 'XRPL Testnet (XRP)' },
  { id: 'bitcoin', label: 'BTC Signet (sBTC)' },
];

export const App: React.FC = () => {
  const {
    isUnlocked,
    fingerprint,
    selectedLedger,
    activeAccountIndex,
    activeAccount,
    setSelectedLedger,
    setActiveAccountIndex,
    lockSession,
  } = useSession();

  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [copiedAddr, setCopiedAddr] = useState<boolean>(false);

  const currentNetwork = NETWORKS[selectedLedger];

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const truncateAddress = (addr: string) => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  return (
    <div className="rabby-app-container">
      {/* Header Bar */}
      <header className="rabby-header">
        {/* Network Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={selectedLedger}
            onChange={(e) => setSelectedLedger(e.target.value as LedgerId)}
            className="rabby-network-badge"
            style={{ appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', paddingRight: '28px', position: 'relative' }}
          >
            {SUPPORTED_LEDGERS.map((l) => (
              <option key={l.id} value={l.id} style={{ background: '#1A1D2E', color: '#fff' }}>
                {l.label}
              </option>
            ))}
          </select>
          <div className="rabby-network-dot" title="Testnet Connected" />
        </div>

        {/* Session Status Pill */}
        {isUnlocked ? (
          <button
            className="rabby-session-btn active"
            onClick={lockSession}
            title="Sesi aktif di memori browser. Klik untuk menghapus mnemonic dari memori (Lock)."
          >
            <Unlock size={14} />
            <span>Active ({fingerprint})</span>
            <Lock size={12} style={{ marginLeft: 4, opacity: 0.6 }} />
          </button>
        ) : (
          <button className="rabby-session-btn locked" onClick={() => setIsScannerOpen(true)}>
            <Lock size={14} />
            <span>Locked — Scan QR</span>
          </button>
        )}
      </header>

      {/* Main Content Area */}
      {!isUnlocked ? (
        /* LOCKED / ONBOARDING VIEW */
        <div className="rabby-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'var(--primary-gradient)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Wallet size={34} color="#fff" />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>
            Rabby-Style Testnet Playground
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '28px' }}>
            Keamanan in-memory: Mnemonic tidak disimpan permanen di disk. Masuk dengan memindai foto QR Code atau buat frasa baru.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button className="rabby-btn-primary" onClick={() => setIsScannerOpen(true)}>
              <QrCode size={18} /> Scan QR Code via Kamera / Foto
            </button>
            <button className="rabby-btn-secondary" onClick={() => setIsGeneratorOpen(true)}>
              <Coins size={18} /> Generate Mnemonic Baru + QR Code
            </button>
          </div>
        </div>
      ) : (
        /* UNLOCKED DASHBOARD VIEW */
        <>
          {/* Account Pill (Index 0 vs Index 1 toggle) */}
          <div className="rabby-account-pill">
            <div className="rabby-account-info">
              <div className="rabby-account-name">
                <span>Account #{activeAccountIndex}</span>
                <span className="rabby-account-path">({activeAccount?.path})</span>
              </div>
              <div className="rabby-account-addr">
                {activeAccount ? truncateAddress(activeAccount.address) : 'Deriving...'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="rabby-btn-secondary"
                style={{ padding: '8px 10px', fontSize: '12px' }}
                onClick={() => setActiveAccountIndex(activeAccountIndex === 0 ? 1 : 0)}
                title="Ganti antara Account #0 dan Account #1"
              >
                Index {activeAccountIndex === 0 ? '0 ➔ 1' : '1 ➔ 0'}
              </button>
              <button
                className="rabby-btn-secondary"
                style={{ padding: '8px 10px' }}
                onClick={() => activeAccount && handleCopyAddress(activeAccount.address)}
                title="Copy Address"
              >
                {copiedAddr ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Hero Portfolio Card */}
          <div className="rabby-card rabby-hero-card">
            <div className="rabby-hero-label">{currentNetwork.name} ({currentNetwork.testnetName})</div>
            <div className="rabby-hero-balance">
              <span>0.00</span>
              <span className="rabby-hero-symbol">{currentNetwork.nativeAsset.symbol}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Testnet Balance (Auto-refreshed via RPC)
            </div>

            {/* Rabby Squircles Action Bar */}
            <div className="rabby-actions-grid">
              <button className="rabby-action-squircle" onClick={() => alert('Fitur Send Asset akan aktif di Fase 4!')}>
                <Send className="rabby-action-icon" />
                <span>Send</span>
              </button>
              <button className="rabby-action-squircle" onClick={() => alert('Fitur Faucet akan aktif di Fase 3!')}>
                <Droplets className="rabby-action-icon" />
                <span>Faucet</span>
              </button>
              <button className="rabby-action-squircle" onClick={() => alert('Fitur Token Mint akan aktif di Fase 4!')}>
                <Coins className="rabby-action-icon" />
                <span>Mint TST</span>
              </button>
              <button
                className="rabby-action-squircle"
                onClick={() => activeAccount && handleCopyAddress(activeAccount.address)}
              >
                <QrCode className="rabby-action-icon" />
                <span>Receive</span>
              </button>
            </div>
          </div>

          {/* Rabby Signature Security Shield */}
          <div className="rabby-shield-box">
            <ShieldCheck className="rabby-shield-icon" size={22} />
            <div>
              <div className="rabby-shield-title">Testnet Pre-flight Guard Active</div>
              <div className="rabby-shield-desc">
                Transaksi dilindungi oleh <code>assertTestnet()</code>. Seluruh panggilan dibatasi pada chain ID testnet resmi (0 risiko dana nyata).
              </div>
            </div>
          </div>

          {/* Token List Card */}
          <div className="rabby-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Assets & Tokens</div>
              <a
                href={currentNetwork.explorerUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              >
                Explorer <ExternalLink size={12} />
              </a>
            </div>

            <div className="rabby-token-list">
              {/* Native Coin Row */}
              <div className="rabby-token-item">
                <div className="rabby-token-left">
                  <div className="rabby-token-avatar">
                    {currentNetwork.nativeAsset.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="rabby-token-name">{currentNetwork.nativeAsset.symbol}</div>
                    <div className="rabby-token-chain">Native Coin • {currentNetwork.name}</div>
                  </div>
                </div>
                <div className="rabby-token-amount">
                  0.00 {currentNetwork.nativeAsset.symbol}
                </div>
              </div>

              {/* Test Token Row */}
              <div className="rabby-token-item">
                <div className="rabby-token-left">
                  <div className="rabby-token-avatar" style={{ background: 'linear-gradient(135deg, #FF9F43 0%, #FF6B6B 100%)' }}>
                    TST
                  </div>
                  <div>
                    <div className="rabby-token-name">TestToken (TST)</div>
                    <div className="rabby-token-chain">Custom Test Token • 18 Decimals</div>
                  </div>
                </div>
                <div className="rabby-token-amount">
                  0.00 TST
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <QRGeneratorModal isOpen={isGeneratorOpen} onClose={() => setIsGeneratorOpen(false)} />
      <QRScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
    </div>
  );
};
