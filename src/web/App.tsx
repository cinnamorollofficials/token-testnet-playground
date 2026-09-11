import React, { useState, useEffect, useCallback } from 'react';
import { useSession, ACTIVE_LEDGERS, type ChainFilter } from './context/SessionContext.js';
import { NETWORKS } from '../config/networks.js';
import { getAdapter } from '../core/registry.js';
import { DEFAULT_TEST_TOKENS } from '../config/tokens.js';
import type { LedgerId, Balance } from '../core/types.js';
import { QRGeneratorModal } from './components/QRGeneratorModal.js';
import { QRScannerModal } from './components/QRScannerModal.js';
import { FaucetModal } from './components/FaucetModal.js';
import { ReceiveModal } from './components/ReceiveModal.js';
import { MintTokenModal } from './components/MintTokenModal.js';
import { SendModal } from './components/SendModal.js';
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
  RefreshCw,
  Layers,
} from 'lucide-react';

const SUPPORTED_LEDGERS: { id: ChainFilter; label: string }[] = [
  { id: 'all', label: 'All Chains (Default)' },
  { id: 'ethereum', label: 'Sepolia (ETH)' },
  { id: 'polygon', label: 'Amoy (POL)' },
  { id: 'solana', label: 'Devnet (SOL)' },
  { id: 'xrpl', label: 'XRPL Testnet (XRP)' },
  { id: 'bitcoin', label: 'BTC Signet (sBTC)' },
];

interface AssetItem {
  id: string;
  ledger: LedgerId;
  name: string;
  symbol: string;
  kind: 'native' | 'token';
  networkName: string;
  testnetName: string;
  badge: string;
  decimals: number;
  avatarBg?: string;
  explorerUrl: string;
}

const ALL_ASSETS: AssetItem[] = [
  {
    id: 'ethereum-native',
    ledger: 'ethereum',
    name: 'Ethereum Sepolia',
    symbol: 'ETH',
    kind: 'native',
    networkName: 'Ethereum',
    testnetName: 'Sepolia',
    badge: 'Sepolia',
    decimals: 18,
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  {
    id: 'ethereum-token',
    ledger: 'ethereum',
    name: 'TestToken (ERC-20)',
    symbol: 'TST',
    kind: 'token',
    networkName: 'Ethereum',
    testnetName: 'Sepolia',
    badge: 'Sepolia ERC20',
    decimals: 18,
    avatarBg: 'linear-gradient(135deg, #FF9F43 0%, #FF6B6B 100%)',
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  {
    id: 'polygon-native',
    ledger: 'polygon',
    name: 'Polygon Amoy',
    symbol: 'POL',
    kind: 'native',
    networkName: 'Polygon',
    testnetName: 'Amoy',
    badge: 'Amoy',
    decimals: 18,
    avatarBg: 'linear-gradient(135deg, #8247E5 0%, #A855F7 100%)',
    explorerUrl: 'https://amoy.polygonscan.com',
  },
  {
    id: 'polygon-token',
    ledger: 'polygon',
    name: 'TestToken (Amoy)',
    symbol: 'TST',
    kind: 'token',
    networkName: 'Polygon',
    testnetName: 'Amoy',
    badge: 'Amoy ERC20',
    decimals: 18,
    avatarBg: 'linear-gradient(135deg, #FF9F43 0%, #FF6B6B 100%)',
    explorerUrl: 'https://amoy.polygonscan.com',
  },
  {
    id: 'solana-native',
    ledger: 'solana',
    name: 'Solana Devnet',
    symbol: 'SOL',
    kind: 'native',
    networkName: 'Solana',
    testnetName: 'Devnet',
    badge: 'Devnet',
    decimals: 9,
    avatarBg: 'linear-gradient(135deg, #14F195 0%, #9945FF 100%)',
    explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
  },
  {
    id: 'xrpl-native',
    ledger: 'xrpl',
    name: 'XRPL Testnet',
    symbol: 'XRP',
    kind: 'native',
    networkName: 'XRPL',
    testnetName: 'Testnet',
    badge: 'XRPL',
    decimals: 6,
    avatarBg: 'linear-gradient(135deg, #23292F 0%, #008CE7 100%)',
    explorerUrl: 'https://testnet.xrpl.org',
  },
  {
    id: 'bitcoin-native',
    ledger: 'bitcoin',
    name: 'Bitcoin Signet',
    symbol: 'sBTC',
    kind: 'native',
    networkName: 'Bitcoin',
    testnetName: 'Signet',
    badge: 'Signet',
    decimals: 8,
    avatarBg: 'linear-gradient(135deg, #F7931A 0%, #FFA834 100%)',
    explorerUrl: 'https://mempool.space/signet',
  },
];

export const App: React.FC = () => {
  const {
    isUnlocked,
    fingerprint,
    selectedLedger,
    activeAccountIndex,
    activeAccount,
    accounts,
    setSelectedLedger,
    setActiveAccountIndex,
    lockSession,
  } = useSession();

  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isFaucetOpen, setIsFaucetOpen] = useState<boolean>(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState<boolean>(false);
  const [isMintOpen, setIsMintOpen] = useState<boolean>(false);
  const [isSendOpen, setIsSendOpen] = useState<boolean>(false);

  // Target ledger/asset for modals
  const [modalTargetLedger, setModalTargetLedger] = useState<LedgerId | undefined>(undefined);
  const [modalTargetAsset, setModalTargetAsset] = useState<'native' | 'token'>('native');

  const [portfolioBalances, setPortfolioBalances] = useState<Record<string, Balance | null>>({});
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  const [copiedAddr, setCopiedAddr] = useState<boolean>(false);

  const fetchAllBalances = useCallback(async () => {
    if (!isUnlocked) return;
    setLoadingBalance(true);

    try {
      const promises = ACTIVE_LEDGERS.map(async (ledger) => {
        const acc = accounts[ledger];
        if (!acc) return null;
        try {
          const adapter = getAdapter(ledger);
          const nativeBal = await adapter.getBalance(acc.address, { kind: 'native' });

          let tokenBal: Balance | null = null;
          const defToken = DEFAULT_TEST_TOKENS[ledger];
          if (defToken) {
            tokenBal = await adapter.getBalance(acc.address, defToken);
          }
          return { ledger, nativeBal, tokenBal };
        } catch (err) {
          console.warn(`Balance fetch warning for ${ledger}:`, err);
          return null;
        }
      });

      const settled = await Promise.all(promises);
      const newBalances: Record<string, Balance | null> = {};

      for (const res of settled) {
        if (!res) continue;
        newBalances[`${res.ledger}-native`] = res.nativeBal;
        if (res.tokenBal !== null) {
          newBalances[`${res.ledger}-token`] = res.tokenBal;
        }
      }

      setPortfolioBalances((prev) => ({ ...prev, ...newBalances }));
    } catch (err) {
      console.warn('Failed fetching balances:', err);
    } finally {
      setLoadingBalance(false);
    }
  }, [isUnlocked, accounts]);

  useEffect(() => {
    if (isUnlocked) {
      fetchAllBalances();
    }
  }, [isUnlocked, fetchAllBalances]);

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const truncateAddress = (addr: string) => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const handleOpenSendForAsset = (ledger: LedgerId, kind: 'native' | 'token') => {
    setModalTargetLedger(ledger);
    setModalTargetAsset(kind);
    setIsSendOpen(true);
  };

  const handleOpenGeneralSend = () => {
    setModalTargetLedger(selectedLedger !== 'all' ? selectedLedger : 'ethereum');
    setModalTargetAsset('native');
    setIsSendOpen(true);
  };

  const handleOpenGeneralFaucet = () => {
    setModalTargetLedger(selectedLedger !== 'all' ? selectedLedger : 'solana');
    setIsFaucetOpen(true);
  };

  const handleOpenGeneralReceive = () => {
    setModalTargetLedger(selectedLedger !== 'all' ? selectedLedger : 'ethereum');
    setIsReceiveOpen(true);
  };

  const handleOpenMint = () => {
    setModalTargetLedger(selectedLedger === 'polygon' ? 'polygon' : 'ethereum');
    setIsMintOpen(true);
  };

  // Filter assets based on selectedLedger
  const filteredAssets = selectedLedger === 'all'
    ? ALL_ASSETS
    : ALL_ASSETS.filter((a) => a.ledger === selectedLedger);

  // Account address to display in top pill
  const displayedAddress = selectedLedger === 'all'
    ? (accounts.ethereum?.address || activeAccount?.address || '')
    : (accounts[selectedLedger]?.address || activeAccount?.address || '');

  const singleChainNetwork = selectedLedger !== 'all' ? NETWORKS[selectedLedger] : null;
  const singleChainNativeBalance = selectedLedger !== 'all'
    ? portfolioBalances[`${selectedLedger}-native`]
    : null;

  return (
    <div className="rabby-app-container">
      {/* Header Bar */}
      <header className="rabby-header">
        {/* Network Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={selectedLedger}
            onChange={(e) => setSelectedLedger(e.target.value as ChainFilter)}
            className="rabby-network-badge"
            style={{
              appearance: 'none',
              WebkitAppearance: 'none',
              cursor: 'pointer',
              paddingRight: '28px',
              position: 'relative',
            }}
          >
            {SUPPORTED_LEDGERS.map((l) => (
              <option key={l.id} value={l.id} style={{ background: '#FFFFFF', color: '#0F172A' }}>
                {l.label}
              </option>
            ))}
          </select>
          <div
            className="rabby-network-dot"
            title={selectedLedger === 'all' ? 'All Testnets Connected (5 Chains)' : `${singleChainNetwork?.name} Testnet Connected`}
          />
        </div>

        {/* Session Status Pill */}
        {isUnlocked ? (
          <button
            className="rabby-session-btn active"
            onClick={lockSession}
            title="Sesi aktif di memori browser. Klik untuk menghapus frasa dari memori (Lock)."
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
            Keamanan in-memory: Mnemonic tidak disimpan di disk. Masuk dengan memindai foto QR Code atau buat frasa baru.
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
                <span>
                  Account #{activeAccountIndex}
                  {selectedLedger === 'all' ? ' (Multi-Chain)' : ` • ${singleChainNetwork?.name}`}
                </span>
                <span className="rabby-account-path">
                  ({selectedLedger === 'all' ? '5 Testnets' : accounts[selectedLedger]?.path})
                </span>
              </div>
              <div className="rabby-account-addr">
                {displayedAddress ? truncateAddress(displayedAddress) : 'Deriving...'}
                {selectedLedger === 'all' && (
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '6px' }}>
                    (EVM Primary)
                  </span>
                )}
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
                onClick={() => displayedAddress && handleCopyAddress(displayedAddress)}
                title="Copy Address"
              >
                {copiedAddr ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Hero Portfolio Card */}
          <div className="rabby-card rabby-hero-card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '6px',
              }}
            >
              <span className="rabby-hero-label">
                {selectedLedger === 'all'
                  ? 'Multi-Chain Testnet Portfolio'
                  : `${singleChainNetwork?.name} (${singleChainNetwork?.testnetName})`}
              </span>
              <button
                onClick={fetchAllBalances}
                title="Refresh Seluruh Saldo"
                style={{ color: 'var(--text-dim)', verticalAlign: 'middle', padding: '2px' }}
              >
                <RefreshCw
                  size={14}
                  style={{ animation: loadingBalance ? 'spin 1s linear infinite' : 'none' }}
                />
              </button>
            </div>

            {selectedLedger === 'all' ? (
              <>
                <div className="rabby-hero-balance" style={{ fontSize: '24px' }}>
                  <span>5 Active Testnets</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                  Sepolia • Amoy • Solana Devnet • XRPL • BTC Signet
                </div>
              </>
            ) : (
              <>
                <div className="rabby-hero-balance">
                  <span>{singleChainNativeBalance ? singleChainNativeBalance.formatted : '0.00'}</span>
                  <span className="rabby-hero-symbol">{singleChainNetwork?.nativeAsset.symbol}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  Testnet Balance (Auto-refreshed via RPC)
                </div>
              </>
            )}

            {/* Rabby Squircles Action Bar */}
            <div className="rabby-actions-grid">
              <button className="rabby-action-squircle" onClick={handleOpenGeneralSend}>
                <Send className="rabby-action-icon" />
                <span>Send</span>
              </button>
              <button className="rabby-action-squircle" onClick={handleOpenGeneralFaucet}>
                <Droplets className="rabby-action-icon" />
                <span>Faucet</span>
              </button>
              <button className="rabby-action-squircle" onClick={handleOpenMint}>
                <Coins className="rabby-action-icon" />
                <span>Mint TST</span>
              </button>
              <button className="rabby-action-squircle" onClick={handleOpenGeneralReceive}>
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: '15px' }}>
                  {selectedLedger === 'all' ? 'All Chain Assets' : `${singleChainNetwork?.name} Assets`}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    background: 'var(--primary-glow)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                  }}
                >
                  {filteredAssets.length}
                </span>
              </div>

              {singleChainNetwork ? (
                <a
                  href={singleChainNetwork.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '12px',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    textDecoration: 'none',
                  }}
                >
                  Explorer <ExternalLink size={12} />
                </a>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Default Filter: All Chains
                </span>
              )}
            </div>

            <div className="rabby-token-list">
              {filteredAssets.map((asset) => {
                const bal = portfolioBalances[asset.id];
                return (
                  <div key={asset.id} className="rabby-token-item">
                    <div className="rabby-token-left">
                      <div
                        className="rabby-token-avatar"
                        style={asset.avatarBg ? { background: asset.avatarBg } : undefined}
                      >
                        {asset.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span className="rabby-token-name">{asset.name}</span>
                          <span className="rabby-chain-badge-tag">{asset.badge}</span>
                        </div>
                        <div className="rabby-token-chain">
                          {asset.kind === 'native' ? 'Native Testnet Coin' : 'Custom Test Token'} • {asset.networkName}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="rabby-token-amount">
                        {bal ? bal.formatted : '0.00'} {asset.symbol}
                      </div>
                      <button
                        className="rabby-quick-send-btn"
                        onClick={() => handleOpenSendForAsset(asset.ledger, asset.kind)}
                        title={`Kirim ${asset.symbol} di ${asset.networkName}`}
                      >
                        <Send size={11} /> Send
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <QRGeneratorModal isOpen={isGeneratorOpen} onClose={() => setIsGeneratorOpen(false)} />
      <QRScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
      <FaucetModal
        isOpen={isFaucetOpen}
        onClose={() => setIsFaucetOpen(false)}
        onSuccess={fetchAllBalances}
        initialLedger={modalTargetLedger}
      />
      <ReceiveModal
        isOpen={isReceiveOpen}
        onClose={() => setIsReceiveOpen(false)}
        initialLedger={modalTargetLedger}
      />
      <MintTokenModal
        isOpen={isMintOpen}
        onClose={() => setIsMintOpen(false)}
        onSuccess={fetchAllBalances}
        initialLedger={modalTargetLedger}
      />
      <SendModal
        isOpen={isSendOpen}
        onClose={() => setIsSendOpen(false)}
        onSuccess={fetchAllBalances}
        initialLedger={modalTargetLedger}
        initialAsset={modalTargetAsset}
      />
    </div>
  );
};
