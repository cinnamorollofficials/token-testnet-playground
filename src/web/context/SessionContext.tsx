import React, { createContext, useContext, useState, useMemo } from 'react';
import type { LedgerId, Account } from '../../core/types.js';
import { validate, toSeed, getFingerprint } from '../../core/mnemonic.js';
import { deriveAccount } from '../../core/derive.js';

interface SessionState {
  isUnlocked: boolean;
  mnemonic: string | null;
  fingerprint: string | null;
  selectedLedger: LedgerId;
  activeAccountIndex: number;
  activeAccount: Account | null;
  recipientAccount: Account | null; // index 1 for quick transfer
  unlockWithMnemonic: (phrase: string) => boolean;
  lockSession: () => void;
  setSelectedLedger: (ledger: LedgerId) => void;
  setActiveAccountIndex: (index: number) => void;
}

const SessionContext = createContext<SessionState | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [selectedLedger, setSelectedLedger] = useState<LedgerId>('ethereum');
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

  const activeAccount = useMemo(() => {
    if (!seed) return null;
    try {
      return deriveAccount(selectedLedger, seed, activeAccountIndex);
    } catch {
      return null;
    }
  }, [seed, selectedLedger, activeAccountIndex]);

  const recipientAccount = useMemo(() => {
    if (!seed) return null;
    try {
      // Default recipient is account Index 1 (milik sendiri)
      return deriveAccount(selectedLedger, seed, 1);
    } catch {
      return null;
    }
  }, [seed, selectedLedger]);

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
