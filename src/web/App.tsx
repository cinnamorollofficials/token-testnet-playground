import React, { useState, useEffect, useCallback } from 'react';
import { useSession, ACTIVE_LEDGERS, type ChainFilter } from './context/SessionContext';
import { NETWORKS, LEDGER_LOGOS } from '../config/networks.js';
import { getAdapter } from '../core/registry.js';
import { getActiveTokenAsset } from '../config/tokens.js';
import type { LedgerId, Balance } from '../core/types.js';
import { QRGeneratorModal } from './components/QRGeneratorModal';
import { QRScannerModal } from './components/QRScannerModal';
import { FaucetModal } from './components/FaucetModal';
import { ReceiveModal } from './components/ReceiveModal';
import { MintTokenModal } from './components/MintTokenModal';
import { SendModal } from './components/SendModal';
import {
  Wallet,
  Lock,
  Copy,
  Check,
  Send,
  Droplets,
  Coins,
  QrCode,
  RefreshCw,
  Layers,
  ExternalLink,
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
  logoUrl?: string;
}

const ALL_ASSETS: AssetItem[] = [
  {
    id: 'ethereum-native',
    ledger: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    kind: 'native',
    networkName: 'Ethereum',
    testnetName: 'Sepolia',
    badge: 'Sepolia',
    decimals: 18,
    explorerUrl: 'https://sepolia.etherscan.io',
    logoUrl: LEDGER_LOGOS.ethereum,
  },
  {
    id: 'ethereum-token',
    ledger: 'ethereum',
    name: 'Hadi Token Test',
    symbol: 'HTT',
    kind: 'token',
    networkName: 'Ethereum',
    testnetName: 'Sepolia',
    badge: 'Sepolia',
    decimals: 18,
    avatarBg: 'linear-gradient(135deg, #FF9F43 0%, #FF6B6B 100%)',
    explorerUrl: 'https://sepolia.etherscan.io',
    logoUrl: LEDGER_LOGOS.ethereum,
  },
  {
    id: 'polygon-native',
    ledger: 'polygon',
    name: 'Polygon',
    symbol: 'POL',
    kind: 'native',
    networkName: 'Polygon',
    testnetName: 'Amoy',
    badge: 'Amoy',
    decimals: 18,
    avatarBg: 'linear-gradient(135deg, #8247E5 0%, #A855F7 100%)',
    explorerUrl: 'https://amoy.polygonscan.com',
    logoUrl: LEDGER_LOGOS.polygon,
  },
  {
    id: 'polygon-token',
    ledger: 'polygon',
    name: 'Hadi Token Test',
    symbol: 'HTT',
    kind: 'token',
    networkName: 'Polygon',
    testnetName: 'Amoy',
    badge: 'Amoy',
    decimals: 18,
    avatarBg: 'linear-gradient(135deg, #FF9F43 0%, #FF6B6B 100%)',
    explorerUrl: 'https://amoy.polygonscan.com',
    logoUrl: LEDGER_LOGOS.polygon,
  },
  {
    id: 'solana-native',
    ledger: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    kind: 'native',
    networkName: 'Solana',
    testnetName: 'Devnet',
    badge: 'Devnet',
    decimals: 9,
    avatarBg: 'linear-gradient(135deg, #14F195 0%, #9945FF 100%)',
    explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
    logoUrl: LEDGER_LOGOS.solana,
  },
  {
    id: 'xrpl-native',
    ledger: 'xrpl',
    name: 'XRP',
    symbol: 'XRP',
    kind: 'native',
    networkName: 'XRPL',
    testnetName: 'Testnet',
    badge: 'XRPL',
    decimals: 6,
    avatarBg: 'linear-gradient(135deg, #23292F 0%, #008CE7 100%)',
    explorerUrl: 'https://testnet.xrpl.org',
    logoUrl: LEDGER_LOGOS.xrpl,
  },
  {
    id: 'bitcoin-native',
    ledger: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'sBTC',
    kind: 'native',
    networkName: 'Bitcoin',
    testnetName: 'Signet',
    badge: 'Signet',
    decimals: 8,
    avatarBg: 'linear-gradient(135deg, #F7931A 0%, #FFA834 100%)',
    explorerUrl: 'https://mempool.space/signet',
    logoUrl: LEDGER_LOGOS.bitcoin,
  },
];

export function formatDisplayBalance(valueStr: string | null | undefined, maxDecimals: number = 4): string {
  if (!valueStr) return '0.00';
  const trimmed = valueStr.trim();
  if (trimmed === '0' || trimmed === '0.0') return '0.00';

  const parts = trimmed.split('.');
  const intPart = parts[0] || '0';
  let formattedInt = intPart;
  try {
    formattedInt = BigInt(intPart).toLocaleString('en-US');
  } catch {
    formattedInt = intPart;
  }

  if (parts.length === 1 || !parts[1]) {
    return formattedInt;
  }

  const decPart = parts[1];
  if (/^0+$/.test(decPart)) {
    return formattedInt;
  }

  let truncatedDec = decPart.slice(0, maxDecimals);
  if (/^0+$/.test(truncatedDec)) {
    const firstNonZero = decPart.search(/[1-9]/);
    if (firstNonZero !== -1) {
      truncatedDec = decPart.slice(0, Math.min(firstNonZero + 3, 8));
    }
  }

  truncatedDec = truncatedDec.replace(/0+$/, '');
  if (!truncatedDec) return formattedInt;

  return `${formattedInt}.${truncatedDec}`;
}

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
          const defToken = getActiveTokenAsset(ledger);
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

  const handleExpandTab = useCallback(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    } else {
      window.open(window.location.href, '_blank');
    }
  }, []);

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
      {/* Unified All-in-One Wallet Card */}
      <div className="rabby-card rabby-unified-card">
        {/* Card Top Header */}
        <header className="rabby-header">
          {/* Network Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedLedger !== 'all' && (
              <img
                src={LEDGER_LOGOS[selectedLedger]}
                alt={singleChainNetwork?.name}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  background: '#ffffff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                }}
              />
            )}
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

          {/* Header Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="rabby-header-action-btn"
              onClick={handleExpandTab}
              title="Buka di tab penuh (Expand to Tab)"
            >
              <ExternalLink size={15} />
            </button>

            {/* Header Lock Icon */}
            <button
              type="button"
              className={`rabby-header-lock-btn ${isUnlocked ? 'active' : 'locked'}`}
              onClick={isUnlocked ? lockSession : () => setIsScannerOpen(true)}
              title={
                isUnlocked
                  ? `Sesi aktif (${fingerprint}). Klik untuk mengunci wallet.`
                  : 'Wallet terkunci. Klik untuk scan QR atau login.'
              }
            >
              <Lock size={16} />
            </button>
          </div>
        </header>

        {/* Card Body */}
        <div className="rabby-card-body">
          {!isUnlocked ? (
            /* LOCKED / ONBOARDING VIEW */
            <div style={{ textAlign: 'center', padding: '28px 12px' }}>
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

              {/* Hero Portfolio Section */}
              <div className="rabby-hero-section">
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
                  </>
                ) : (
                  <>
                    <div className="rabby-hero-balance">
                      <span title={singleChainNativeBalance?.formatted}>
                        {singleChainNativeBalance ? formatDisplayBalance(singleChainNativeBalance.formatted, 5) : '0.00'}
                      </span>
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
                    <span>Mint HTT</span>
                  </button>
                  <button className="rabby-action-squircle" onClick={handleOpenGeneralReceive}>
                    <QrCode className="rabby-action-icon" />
                    <span>Receive</span>
                  </button>
                </div>
              </div>

              {/* Subtle Divider */}
              <div className="rabby-card-divider" />

              {/* Token List Section */}
              <div className="rabby-token-section">
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


                </div>

                <div className="rabby-token-list">
                  {filteredAssets.map((asset) => {
                    const bal = portfolioBalances[asset.id];
                    return (
                      <div key={asset.id} className="rabby-token-item">
                        <div className="rabby-token-left">
                          <div className="rabby-token-avatar-wrap">
                            {asset.kind === 'native' ? (
                              <img
                                src={LEDGER_LOGOS[asset.ledger]}
                                alt={asset.symbol}
                                className="rabby-token-avatar-img"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('.rabby-token-avatar') as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : (
                              <>
                                <div
                                  className="rabby-token-avatar"
                                  style={asset.avatarBg ? { background: asset.avatarBg } : undefined}
                                >
                                  {asset.symbol.slice(0, 3)}
                                </div>
                                <img
                                  src={LEDGER_LOGOS[asset.ledger]}
                                  alt={asset.networkName}
                                  className="rabby-token-chain-badge"
                                  title={`Network: ${asset.networkName}`}
                                />
                              </>
                            )}
                            <div
                              className="rabby-token-avatar"
                              style={{
                                display: 'none',
                                ...(asset.avatarBg ? { background: asset.avatarBg } : {}),
                              }}
                            >
                              {asset.symbol.slice(0, 3)}
                            </div>
                          </div>
                          <div className="rabby-token-info">
                            <div className="rabby-token-title-row">
                              <span className="rabby-token-name">{asset.name}</span>
                              <span className="rabby-chain-badge-tag">
                                <img
                                  src={LEDGER_LOGOS[asset.ledger]}
                                  alt=""
                                  style={{ width: 11, height: 11, borderRadius: '50%', objectFit: 'cover' }}
                                />
                                {asset.badge}
                              </span>
                            </div>
                            <div className="rabby-token-chain">
                              {asset.kind === 'native' ? (
                                <span>Native • {asset.networkName}</span>
                              ) : (
                                <>
                                  <span>{asset.networkName}</span>
                                  {(() => {
                                    const activeTok = getActiveTokenAsset(asset.ledger);
                                    if (activeTok && 'address' in activeTok) {
                                      return (
                                        <>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            className="rabby-contract-chip"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setModalTargetLedger(asset.ledger);
                                              setIsMintOpen(true);
                                            }}
                                            title="Klik untuk melihat atau mengganti alamat kontrak HTT"
                                          >
                                            {activeTok.address.slice(0, 6)}...{activeTok.address.slice(-4)}
                                            <ExternalLink size={9} />
                                          </button>
                                        </>
                                      );
                                    }
                                    return null;
                                  })()}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="rabby-token-right">
                          <div
                            className="rabby-token-amount"
                            title={bal ? `${bal.formatted} ${asset.symbol}` : `0.00 ${asset.symbol}`}
                          >
                            <span className="rabby-token-val">{formatDisplayBalance(bal?.formatted)}</span>
                            <span className="rabby-token-sym">{asset.symbol}</span>
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
        </div>
      </div>

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
