import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { TransactionList } from './TransactionList';
import { SubpageLayout } from './SubpageLayout';
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
    <SubpageLayout
      title="Riwayat Transaksi"
      icon={<ArrowLeftRight size={18} />}
      onBack={onClose}
    >
      <TransactionList
        selectedLedger={selectedLedger}
        currentAccount={currentAccount}
        rates={rates}
        onOpenSend={onOpenSend}
        onOpenFaucet={onOpenFaucet}
      />
    </SubpageLayout>
  );
};

export { TransactionModal as TransactionView };
