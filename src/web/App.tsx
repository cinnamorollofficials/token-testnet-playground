import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession, ACTIVE_LEDGERS, type ChainFilter } from './context/SessionContext';
import { NETWORKS, LEDGER_LOGOS } from '../config/networks.js';
import { getAdapter } from '../core/registry.js';
import { getActiveTokenAsset } from '../config/tokens.js';
import type { LedgerId, Balance } from '../core/types.js';
import { fetchIndodaxRates, formatIDR, calculateIDRValue, type RatesMap } from '../core/rates.js';
import { QRGeneratorModal } from './components/QRGeneratorModal';
import { QRScannerModal } from './components/QRScannerModal';
import { FaucetModal } from './components/FaucetModal';
import { ReceiveModal } from './components/ReceiveModal';
import { MintTokenModal } from './components/MintTokenModal';
import { SendModal } from './components/SendModal';
import { TransactionModal } from './components/TransactionModal';
import { PortfolioChart } from './components/PortfolioChart';
import { getTransactions } from '../core/history.js';
import {
  generate24hPortfolioTimeSeries,
  calculate24hChange,
  recordValuationSnapshot,
  type ChartPoint,
  type PortfolioHolding,
} from '../core/chart.js';
import {
  Wallet,
  Lock,
  Send,
  Droplets,
  Coins,
  QrCode,
  Layers,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
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
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);

  // Target ledger/asset for modals
  const [modalTargetLedger, setModalTargetLedger] = useState<LedgerId | undefined>(undefined);
  const [modalTargetAsset, setModalTargetAsset] = useState<'native' | 'token'>('native');
  const [hoveredChartPoint, setHoveredChartPoint] = useState<ChartPoint | null>(null);

  // Transaction count for badge
  const txCount = useMemo(() => {
    return getTransactions({
      ledger: selectedLedger,
      address: activeAccount?.address,
    }).length;
  }, [selectedLedger, activeAccount, isSendOpen, isFaucetOpen, isMintOpen]);

  const [portfolioBalances, setPortfolioBalances] = useState<Record<string, Balance | null>>({});
  const [loadingLedgers, setLoadingLedgers] = useState<Partial<Record<LedgerId, boolean>>>({
    ethereum: true,
    polygon: true,
    solana: true,
    xrpl: true,
    bitcoin: true,
    kaia: false,
  });

  const [rates, setRates] = useState<RatesMap>({});

  const fetchRates = useCallback(async (force = false) => {
    try {
      const r = await fetchIndodaxRates(force);
      setRates(r);
    } catch (err) {
      console.warn('Indodax rate fetch warning:', err);
    }
  }, []);

  // Auto-open scanner modal when opened with ?action=scan (e.g. from extension popup redirect)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('action=scan')) {
      setIsScannerOpen(true);
    }
  }, []);

  const fetchAllBalances = useCallback(async () => {
    if (!isUnlocked) return;

    setLoadingLedgers({
      ethereum: true,
      polygon: true,
      solana: true,
      xrpl: true,
      bitcoin: true,
      kaia: false,
    });

    fetchRates();

    ACTIVE_LEDGERS.forEach(async (ledger) => {
      const acc = accounts[ledger];
      if (!acc) {
        setLoadingLedgers((prev) => ({ ...prev, [ledger]: false }));
        return;
      }
      try {
        const adapter = getAdapter(ledger);
        const nativeBal = await adapter.getBalance(acc.address, { kind: 'native' });

        let tokenBal: Balance | null = null;
        const defToken = getActiveTokenAsset(ledger);
        if (defToken) {
          tokenBal = await adapter.getBalance(acc.address, defToken);
        }

        setPortfolioBalances((prev) => {
          const updated = { ...prev, [`${ledger}-native`]: nativeBal };
          if (tokenBal !== null) {
            updated[`${ledger}-token`] = tokenBal;
          }
          return updated;
        });
      } catch (err) {
        console.warn(`Balance fetch warning for ${ledger}:`, err);
      } finally {
        setLoadingLedgers((prev) => ({ ...prev, [ledger]: false }));
      }
    });
  }, [isUnlocked, accounts, fetchRates]);

  useEffect(() => {
    if (isUnlocked) {
      fetchAllBalances();
      fetchRates();
    }
  }, [isUnlocked, fetchAllBalances, fetchRates]);


  const truncateAddress = (addr: string, start = 6, end = 4) => {
    if (addr.length <= start + end + 3) return addr;
    return `${addr.slice(0, start)}...${addr.slice(-end)}`;
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

  // Calculators for IDR Valuations
  const totalPortfolioIdr = useMemo(() => {
    let sum = 0;
    for (const asset of ALL_ASSETS) {
      const bal = portfolioBalances[asset.id];
      if (bal) {
        sum += calculateIDRValue(bal.formatted, asset.symbol, rates);
      }
    }
    return sum;
  }, [portfolioBalances, rates]);

  const singleChainIdr = useMemo(() => {
    if (selectedLedger === 'all') return 0;
    const bal = portfolioBalances[`${selectedLedger}-native`];
    if (!bal) return 0;
    return calculateIDRValue(bal.formatted, bal.symbol, rates);
  }, [selectedLedger, portfolioBalances, rates]);

  const currentValuationIdr = selectedLedger === 'all' ? totalPortfolioIdr : singleChainIdr;

  // Track periodic snapshot in localStorage
  useEffect(() => {
    if (isUnlocked && currentValuationIdr > 0) {
      recordValuationSnapshot(currentValuationIdr);
    }
  }, [isUnlocked, currentValuationIdr]);

  const portfolioHoldings: PortfolioHolding[] = useMemo(() => {
    return filteredAssets.map((a) => {
      const bal = portfolioBalances[a.id];
      return {
        symbol: a.symbol,
        amount: bal?.formatted || 0,
      };
    });
  }, [filteredAssets, portfolioBalances]);

  const chartPoints = useMemo(() => {
    return generate24hPortfolioTimeSeries(portfolioHoldings, rates, currentValuationIdr);
  }, [portfolioHoldings, rates, currentValuationIdr]);

  const change24h = useMemo(() => {
    return calculate24hChange(currentValuationIdr, chartPoints);
  }, [currentValuationIdr, chartPoints]);

  return (
    <div className="rabby-app-container">
      {/* Unified All-in-One Wallet Card */}
      <div className="rabby-card rabby-unified-card">
        {/* Card Top Header */}
        {/* Card Top Header - Option 1: Single-Row Unified Header */}
        <header className="rabby-header">
          {/* Left Zone: Account Switcher Pill (if unlocked) OR Brand Title (if locked) */}
          {isUnlocked ? (
            <button
              type="button"
              className="rabby-header-acc-pill"
              onClick={() => {
                setPortfolioBalances({});
                setActiveAccountIndex(activeAccountIndex === 0 ? 1 : 0);
              }}
              title={
                displayedAddress
                  ? `Akun aktif: Account #${activeAccountIndex} (${truncateAddress(displayedAddress, 6, 4)}). Klik untuk beralih ke Account #${activeAccountIndex === 0 ? 1 : 0}`
                  : `Akun aktif: Account #${activeAccountIndex}. Klik untuk beralih ke Account #${activeAccountIndex === 0 ? 1 : 0}`
              }
            >
              <div className="rabby-header-avatar">#{activeAccountIndex}</div>
              <span className="rabby-header-acc-name">Acc #{activeAccountIndex}</span>
              <ArrowLeftRight size={11} className="rabby-header-acc-switch-icon" />
            </button>
          ) : (
            <div className="rabby-header-brand">
              <div className="rabby-header-brand-icon">
                <Wallet size={14} color="#fff" />
              </div>
              <span className="rabby-header-brand-title">Testnet Playground</span>
            </div>
          )}

          {/* Right Zone: Network Selector + Actions */}
          <div className="rabby-header-right-group">
            {/* Network Selector Button - Icon only (no text, no dot) */}
            <div
              className="rabby-header-network-btn"
              title={`Jaringan: ${selectedLedger === 'all' ? 'All Chains (5 Testnets)' : singleChainNetwork?.name}. Klik untuk mengganti.`}
            >
              {selectedLedger === 'all' ? (
                <Layers size={15} color="var(--primary)" />
              ) : (
                <img
                  src={LEDGER_LOGOS[selectedLedger]}
                  alt={singleChainNetwork?.name}
                  className="rabby-header-network-active-logo"
                />
              )}

              {/* Native invisible select covering the button for seamless click-to-change */}
              <select
                value={selectedLedger}
                onChange={(e) => setSelectedLedger(e.target.value as ChainFilter)}
                className="rabby-header-network-hidden-select"
                aria-label="Pilih Jaringan"
              >
                {SUPPORTED_LEDGERS.map((l) => (
                  <option key={l.id} value={l.id} style={{ background: '#FFFFFF', color: '#0F172A' }}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

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
              <Lock size={14} />
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
              {/* Hero Portfolio Section */}
              <div className="rabby-hero-section">
                {hoveredChartPoint ? (
                  <div className="rabby-hero-balance" style={{ fontSize: '28px' }}>
                    <span>{hoveredChartPoint.formattedValue}</span>
                  </div>
                ) : selectedLedger === 'all' ? (
                  <div className="rabby-hero-balance" style={{ fontSize: '28px' }}>
                    <span>{formatIDR(totalPortfolioIdr)}</span>
                  </div>
                ) : (
                  <>
                    <div className="rabby-hero-balance">
                      {loadingLedgers[selectedLedger] || !singleChainNativeBalance ? (
                        <div className="rabby-skeleton rabby-skeleton-hero" />
                      ) : (
                        <>
                          <span title={singleChainNativeBalance.formatted}>
                            {formatDisplayBalance(singleChainNativeBalance.formatted, 5)}
                          </span>
                          <span className="rabby-hero-symbol">{singleChainNetwork?.nativeAsset.symbol}</span>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      ≈ {formatIDR(singleChainIdr)}
                    </div>
                  </>
                )}

                {/* 24h Glass Effect Chart Card */}
                <div className="rabby-chart-glass-card">
                  <div className="rabby-chart-glass-top">
                    <div className="rabby-chart-glass-tag">
                      <span className="rabby-chart-glass-dot" />
                      <span>{hoveredChartPoint ? hoveredChartPoint.label : '24H Portfolio Trend'}</span>
                    </div>

                    <div className="rabby-pnl-row">
                      <span className={`rabby-pnl-chip ${change24h.direction}`}>
                        {change24h.direction === 'positive' ? (
                          <TrendingUp size={11} />
                        ) : change24h.direction === 'negative' ? (
                          <TrendingDown size={11} />
                        ) : (
                          <Minus size={11} />
                        )}
                        <span>
                          {change24h.direction === 'positive' ? '+' : ''}
                          {change24h.percentage.toFixed(2)}% ({change24h.formattedDiff})
                        </span>
                      </span>
                    </div>
                  </div>

                  <PortfolioChart
                    points={chartPoints}
                    change24h={change24h}
                    onHoverPoint={setHoveredChartPoint}
                  />
                </div>

                {/* Rabby Squircles Action Bar (3 per row) */}
                <div className="rabby-actions-grid">
                  <button
                    type="button"
                    className="rabby-action-squircle"
                    onClick={handleOpenGeneralSend}
                    title="Send"
                  >
                    <Send className="rabby-action-icon" />
                    <span className="rabby-action-label">Send</span>
                  </button>
                  <button
                    type="button"
                    className="rabby-action-squircle"
                    onClick={handleOpenGeneralReceive}
                    title="Receive"
                  >
                    <QrCode className="rabby-action-icon" />
                    <span className="rabby-action-label">Receive</span>
                  </button>
                  <button
                    type="button"
                    className="rabby-action-squircle"
                    onClick={handleOpenGeneralFaucet}
                    title="Faucet"
                  >
                    <Droplets className="rabby-action-icon" />
                    <span className="rabby-action-label">Faucet</span>
                  </button>
                  <button
                    type="button"
                    className="rabby-action-squircle"
                    onClick={handleOpenMint}
                    title="Mint HTT"
                  >
                    <Coins className="rabby-action-icon" />
                    <span className="rabby-action-label">Mint HTT</span>
                  </button>
                  <button
                    type="button"
                    className="rabby-action-squircle"
                    onClick={() => setIsTxModalOpen(true)}
                    title="Riwayat Transaksi"
                  >
                    <ArrowLeftRight className="rabby-action-icon" />
                    <span className="rabby-action-label">Transactions</span>
                    {txCount > 0 && <span className="rabby-action-tx-badge">{txCount}</span>}
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
                    const assetIdrVal = calculateIDRValue(bal?.formatted, asset.symbol, rates);

                    return (
                      <div
                        key={asset.id}
                        className="rabby-token-item"
                        onClick={() => handleOpenSendForAsset(asset.ledger, asset.kind)}
                        title={`${bal ? formatDisplayBalance(bal.formatted) : '0.00'} ${asset.symbol} (${formatIDR(assetIdrVal)}) - Klik untuk mengirim`}
                      >
                        <div className="rabby-token-left">
                          <div className="rabby-token-avatar-wrap">
                            {asset.kind === 'native' ? (
                              <>
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
                                <div
                                  className="rabby-token-avatar"
                                  style={{
                                    display: 'none',
                                    ...(asset.avatarBg ? { background: asset.avatarBg } : {}),
                                  }}
                                >
                                  {asset.symbol.slice(0, 3)}
                                </div>
                              </>
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
                                  style={{ width: 16, height: 16, objectFit: 'cover' }}
                                />
                              </>
                            )}
                          </div>
                          <div className="rabby-token-info">
                            <div className="rabby-token-title-row">
                              <span className="rabby-token-name">{asset.name}</span>
                              <span className="rabby-chain-badge-tag">
                                <img
                                  src={LEDGER_LOGOS[asset.ledger]}
                                  alt=""
                                  style={{ width: 10, height: 10, borderRadius: '50%', objectFit: 'cover' }}
                                />
                                {asset.badge.toUpperCase()}
                              </span>
                            </div>
                            <div className="rabby-token-balance-row">
                              {loadingLedgers[asset.ledger] || bal === undefined ? (
                                <div className="rabby-skeleton rabby-skeleton-token-bal" />
                              ) : (
                                <span className="rabby-token-balance-val">
                                  {formatIDR(assetIdrVal)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Send Button on Card Hover */}
                        <button
                          type="button"
                          className="rabby-quick-send-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSendForAsset(asset.ledger, asset.kind);
                          }}
                          title={`Kirim ${asset.symbol}`}
                        >
                          <Send size={12} />
                          <span>Send</span>
                        </button>
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
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        selectedLedger={selectedLedger}
        currentAccount={activeAccount}
        rates={rates}
        onOpenSend={handleOpenGeneralSend}
        onOpenFaucet={handleOpenGeneralFaucet}
      />
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
        rates={rates}
      />
    </div>
  );
};
