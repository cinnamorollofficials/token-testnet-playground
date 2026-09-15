import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { LedgerId, Account } from '../../core/types.js';
import { validate, toSeed, getFingerprint } from '../../core/mnemonic.js';
import { deriveAccount } from '../../core/derive.js';

export type ChainFilter = LedgerId | 'all';

export const ACTIVE_LEDGERS: LedgerId[] = ['ethereum', 'polygon', 'solana', 'xrpl', 'bitcoin', 'bitcoin-t4'];

const SESSION_STORAGE_KEY = 'pg_active_mnemonic_session';

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

  // Restore session from memory storage on mount (chrome.storage.session or sessionStorage)
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      try {
        chrome.storage.session.get([SESSION_STORAGE_KEY], (items) => {
          if (chrome.runtime?.lastError) return;
          const phrase = items?.[SESSION_STORAGE_KEY];
          if (typeof phrase === 'string' && validate(phrase)) {
            setMnemonic(phrase);
          }
        });
      } catch {
        // Ignore extension storage error
      }
    } else if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored && validate(stored)) {
          setMnemonic(stored);
        }
      } catch {
        // Ignore
      }
    }

    // Synchronize state across popup re-opens or sibling tabs in extension
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      const handleStorageChange = (
        changes: { [key: string]: chrome.storage.StorageChange },
        areaName: string
      ) => {
        if (areaName === 'session' && changes[SESSION_STORAGE_KEY]) {
          const newVal = changes[SESSION_STORAGE_KEY].newValue;
          if (typeof newVal === 'string' && validate(newVal)) {
            setMnemonic(newVal);
          } else if (!newVal) {
            setMnemonic(null);
          }
        }
      };

      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, []);

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
      'bitcoin-t4': null,
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
      'bitcoin-t4': null,
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

  const unlockWithMnemonic = useCallback((phrase: string): boolean => {
    const trimmed = phrase.trim().replace(/\s+/g, ' ');
    if (!validate(trimmed)) {
      return false;
    }
    setMnemonic(trimmed);

    // Save in RAM session storage
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      try {
        chrome.storage.session.set({ [SESSION_STORAGE_KEY]: trimmed });
      } catch {
        // Ignore
      }
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, trimmed);
      } catch {
        // Ignore
      }
    }
    return true;
  }, []);

  const lockSession = useCallback(() => {
    setMnemonic(null);

    // Clear RAM session storage
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      try {
        chrome.storage.session.remove([SESSION_STORAGE_KEY]);
      } catch {
        // Ignore
      }
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  }, []);

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

