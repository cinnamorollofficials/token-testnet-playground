import React from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import { TransactionList } from './TransactionList';
import type { LedgerId, Account } from '../../core/types.js';
import type { RatesMap } from '../../core/rates.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedLedger: LedgerId | 'all';
  currentAccount?: Account | null;
  rates?: RatesMap;
  onOpenSend?: () => void;
  onOpenFaucet?: () => void;
}

export const TransactionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedLedger,
  currentAccount,
  rates,
  onOpenSend,
  onOpenFaucet,
}) => {
  if (!isOpen) return null;

  return (
    <div className="rabby-modal-overlay" onClick={onClose}>
      <div
        className="rabby-modal-card rabby-tx-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', width: '100%' }}
      >
        {/* Header */}
        <div className="rabby-modal-header">
          <div className="rabby-modal-title">
            <ArrowLeftRight className="rabby-shield-icon" size={20} />
            <span>Riwayat Transaksi</span>
          </div>
          <button type="button" className="rabby-close-btn" onClick={onClose} title="Tutup">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          className="rabby-modal-body"
          style={{
            maxHeight: '68vh',
            overflowY: 'auto',
            paddingRight: '4px',
            marginTop: '8px',
          }}
        >
          <TransactionList
            selectedLedger={selectedLedger}
            currentAccount={currentAccount}
            rates={rates}
            onOpenSend={() => {
              onClose();
              onOpenSend?.();
            }}
            onOpenFaucet={() => {
              onClose();
              onOpenFaucet?.();
            }}
          />
        </div>
      </div>
    </div>
  );
};
