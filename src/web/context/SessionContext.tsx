import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { LedgerId, Account } from '../../core/types.js';
import { validate, toSeed, getFingerprint } from '../../core/mnemonic.js';
import { deriveAccount } from '../../core/derive.js';

export type ChainFilter = LedgerId | 'all';

export const ACTIVE_LEDGERS: LedgerId[] = ['ethereum', 'polygon', 'solana', 'xrpl', 'bitcoin'];

interface SessionState {
  isUnlocked: boolean;
  mnemonic: string | null;
  fingerprint: string | null;
  selectedLedger: ChainFilter;
  activeAccountIndex: number;
  activeAccount: Account | null;
  recipientAccount: Account | null;
  accounts: Record<LedgerId, Account | null>;
  recipientAccounts: Record<LedgerId, Account | null>;
  getAccount: (ledger: LedgerId, index?: number) => Account | null;
  unlockWithMnemonic: (phrase: string) => boolean;
  lockSession: () => void;
  setSelectedLedger: (ledger: ChainFilter) => void;
  setActiveAccountIndex: (index: number) => void;
}

const SessionContext = createContext<SessionState | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [selectedLedger, setSelectedLedger] = useState<ChainFilter>('all');
  const [activeAccountIndex, setActiveAccountIndex] = useState<number>(0);

  const seed = useMemo(() => {
    if (!mnemonic) return null;
    try {
      return toSeed(mnemonic);
    } catch {
      return null;
    }
  }, [mnemonic]);

  const fingerprint = useMemo(() => {
    if (!seed) return null;
    return getFingerprint(seed);
  }, [seed]);

  const accounts = useMemo(() => {
    const emptyMap: Record<LedgerId, Account | null> = {
      ethereum: null,
      polygon: null,
      solana: null,
      xrpl: null,
      bitcoin: null,
      kaia: null,
    };
    if (!seed) return emptyMap;

    for (const ledger of ACTIVE_LEDGERS) {
      try {
        emptyMap[ledger] = deriveAccount(ledger, seed, activeAccountIndex);
      } catch {
        emptyMap[ledger] = null;
      }
    }
    return emptyMap;
  }, [seed, activeAccountIndex]);

  const recipientAccounts = useMemo(() => {
    const emptyMap: Record<LedgerId, Account | null> = {
      ethereum: null,
      polygon: null,
      solana: null,
      xrpl: null,
      bitcoin: null,
      kaia: null,
    };
    if (!seed) return emptyMap;

    for (const ledger of ACTIVE_LEDGERS) {
      try {
        emptyMap[ledger] = deriveAccount(ledger, seed, 1);
      } catch {
        emptyMap[ledger] = null;
      }
    }
    return emptyMap;
  }, [seed]);

  const activeAccount = useMemo(() => {
    if (!seed) return null;
    if (selectedLedger !== 'all') {
      return accounts[selectedLedger];
    }
    return accounts.ethereum;
  }, [seed, selectedLedger, accounts]);

  const recipientAccount = useMemo(() => {
    if (!seed) return null;
    if (selectedLedger !== 'all') {
      return recipientAccounts[selectedLedger];
    }
    return recipientAccounts.ethereum;
  }, [seed, selectedLedger, recipientAccounts]);

  const getAccount = useCallback(
    (ledger: LedgerId, index: number = activeAccountIndex): Account | null => {
      if (!seed) return null;
      try {
        return deriveAccount(ledger, seed, index);
      } catch {
        return null;
      }
    },
    [seed, activeAccountIndex]
  );

  const unlockWithMnemonic = (phrase: string): boolean => {
    const trimmed = phrase.trim().replace(/\s+/g, ' ');
    if (!validate(trimmed)) {
      return false;
    }
    setMnemonic(trimmed);
    return true;
  };

  const lockSession = () => {
    setMnemonic(null);
  };

  const value: SessionState = {
    isUnlocked: Boolean(mnemonic && seed),
    mnemonic,
    fingerprint,
    selectedLedger,
    activeAccountIndex,
    activeAccount,
    recipientAccount,
    accounts,
    recipientAccounts,
    getAccount,
    unlockWithMnemonic,
    lockSession,
    setSelectedLedger,
    setActiveAccountIndex,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = (): SessionState => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

