import React, { useState, useEffect, useCallback } from 'react';
import type { LedgerId, Account } from '../../core/types.js';
import { NETWORKS, LEDGER_LOGOS } from '../../config/networks.js';
import {
  getTransactions,
  clearTransactions,
  formatTxRelativeTime,
  type TransactionRecord,
} from '../../core/history.js';
import { formatIDR, type RatesMap } from '../../core/rates.js';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Droplets,
  ExternalLink,
  Trash2,
  Send,
  Sparkles,
  Inbox,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface Props {
  selectedLedger: LedgerId | 'all';
  currentAccount?: Account | null;
  rates?: RatesMap;
  onOpenSend?: () => void;
  onOpenFaucet?: () => void;
}

export const TransactionList: React.FC<Props> = ({
  selectedLedger,
  currentAccount,
  rates: _rates,
  onOpenSend,
  onOpenFaucet,
}) => {
  const [txs, setTxs] = useState<TransactionRecord[]>([]);

  const reloadTxs = useCallback(() => {
    const list = getTransactions({
      ledger: selectedLedger,
      address: currentAccount?.address,
    });
    setTxs(list);
  }, [selectedLedger, currentAccount]);

  useEffect(() => {
    reloadTxs();
    // Dengarkan event storage antar-tab atau pembaruan lokal
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'testnet_pg_tx_history_v1') {
        reloadTxs();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [reloadTxs]);

  const handleClearAll = () => {
    if (window.confirm('Hapus seluruh riwayat transaksi tersimpan di playground ini?')) {
      clearTransactions({ ledger: selectedLedger });
      reloadTxs();
    }
  };

  const getTxTypeDetails = (tx: TransactionRecord) => {
    switch (tx.type) {
      case 'send':
        return {
          label: `Kirim ${tx.assetSymbol}`,
          icon: <ArrowUpRight size={16} />,
          badgeClass: 'rabby-tx-icon-send',
          amountPrefix: '-',
          amountClass: 'rabby-tx-amount-out',
        };
      case 'faucet':
        return {
          label: `Faucet ${tx.assetSymbol}`,
          icon: <Droplets size={16} />,
          badgeClass: 'rabby-tx-icon-faucet',
          amountPrefix: '+',
          amountClass: 'rabby-tx-amount-in',
        };
      case 'mint':
        return {
          label: tx.amount === 'Deploy' ? 'Deploy Kontrak' : `Mint ${tx.assetSymbol}`,
          icon: <Coins size={16} />,
          badgeClass: 'rabby-tx-icon-mint',
          amountPrefix: tx.amount === 'Deploy' ? '' : '+',
          amountClass: 'rabby-tx-amount-in',
        };
      case 'receive':
      default:
        return {
          label: `Terima ${tx.assetSymbol}`,
          icon: <ArrowDownLeft size={16} />,
          badgeClass: 'rabby-tx-icon-receive',
          amountPrefix: '+',
          amountClass: 'rabby-tx-amount-in',
        };
    }
  };

  const currentNetwork = selectedLedger !== 'all' ? NETWORKS[selectedLedger] : null;

  return (
    <div className="rabby-tx-container">
      {/* Header bar */}
      <div className="rabby-tx-header">
        <div className="rabby-tx-header-left">
          <span className="rabby-tx-header-title">
            {selectedLedger === 'all' ? 'Semua Aktivitas Transaksi' : `Aktivitas ${currentNetwork?.name}`}
          </span>
          <span className="rabby-tx-count-pill">{txs.length}</span>
        </div>

        <div className="rabby-tx-header-actions">
          {currentNetwork && currentAccount && (
            <a
              href={`${currentNetwork.explorerUrl}/${selectedLedger === 'solana' ? 'address' : selectedLedger === 'xrpl' ? 'account' : 'address'}/${currentAccount.address}`}
              target="_blank"
              rel="noreferrer"
              className="rabby-tx-action-link"
              title="Buka akun di On-chain Block Explorer"
            >
              <ExternalLink size={12} />
              <span>Explorer</span>
            </a>
          )}

          {txs.length > 0 && (
            <button
              type="button"
              className="rabby-tx-action-btn"
              onClick={handleClearAll}
              title="Bersihkan riwayat transaksi"
            >
              <Trash2 size={12} />
              <span>Hapus</span>
            </button>
          )}
        </div>
      </div>

      {/* List / Empty State */}
      {txs.length === 0 ? (
        <div className="rabby-empty-tx">
          <div className="rabby-empty-tx-icon">
            <Inbox size={32} />
          </div>
          <div className="rabby-empty-tx-title">Belum Ada Transaksi</div>
          <div className="rabby-empty-tx-desc">
            Transaksi pengiriman aset, klaim faucet, atau mint token akan tercatat di sini.
          </div>
          <div className="rabby-empty-tx-buttons">
            {onOpenSend && (
              <button type="button" className="rabby-btn-primary rabby-btn-sm" onClick={onOpenSend}>
                <Send size={12} />
                <span>Kirim Aset</span>
              </button>
            )}
            {onOpenFaucet && (
              <button type="button" className="rabby-btn-secondary rabby-btn-sm" onClick={onOpenFaucet}>
                <Sparkles size={12} />
                <span>Klaim Faucet</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rabby-tx-list">
          {txs.map((tx) => {
            const details = getTxTypeDetails(tx);
            const netConfig = NETWORKS[tx.ledger];
            const hasIdr = tx.idrValue !== undefined && tx.idrValue > 0;

            return (
              <div
                key={tx.id}
                className="rabby-tx-item"
                onClick={() => {
                  if (tx.explorerUrl) {
                    window.open(tx.explorerUrl, '_blank', 'noreferrer');
                  }
                }}
                title="Klik untuk melihat transaksi di block explorer"
              >
                {/* Ikon Badge Tipe Transaksi */}
                <div className="rabby-tx-left">
                  <div className={`rabby-tx-icon-badge ${details.badgeClass}`}>
                    {details.icon}
                  </div>

                  <div className="rabby-tx-info">
                    <div className="rabby-tx-title-row">
                      <span className="rabby-tx-type-name">{details.label}</span>
                      <span className="rabby-chain-badge-tag">
                        {netConfig && (
                          <img
                            src={LEDGER_LOGOS[tx.ledger]}
                            alt=""
                            style={{ width: 10, height: 10, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        )}
                        {netConfig?.testnetName.toUpperCase() || tx.ledger.toUpperCase()}
                      </span>
                    </div>

                    <div className="rabby-tx-sub-row">
                      <span className="rabby-tx-time">
                        {formatTxRelativeTime(tx.timestamp)}
                      </span>
                      <span className="rabby-tx-dot">•</span>
                      <span className="rabby-tx-addr" title={tx.type === 'send' ? `Penerima: ${tx.to}` : `Pengirim: ${tx.from}`}>
                        {tx.type === 'send'
                          ? `Ke: ${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`
                          : `Dari: ${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bagian Kanan: Nominal & IDR Valuation */}
                <div className="rabby-tx-right">
                  <div className={`rabby-tx-amount ${details.amountClass}`}>
                    {details.amountPrefix}
                    {tx.amount} {tx.assetSymbol}
                  </div>

                  <div className="rabby-tx-right-sub">
                    {hasIdr ? (
                      <span className="rabby-tx-idr">{formatIDR(tx.idrValue!)}</span>
                    ) : (
                      <span className="rabby-tx-status-pill">
                        {tx.status === 'confirmed' ? (
                          <>
                            <CheckCircle2 size={10} color="#10b981" />
                            <span>Sukses</span>
                          </>
                        ) : tx.status === 'pending' ? (
                          <>
                            <Clock size={10} color="#f59e0b" />
                            <span>Pending</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={10} color="#ef4444" />
                            <span>Gagal</span>
                          </>
                        )}
                      </span>
                    )}

                    {tx.explorerUrl && (
                      <a
                        href={tx.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rabby-tx-ext-icon"
                        onClick={(e) => e.stopPropagation()}
                        title="Buka di block explorer"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
