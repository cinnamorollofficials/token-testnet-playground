import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { LedgerId, Account, VaultPayload } from '../../core/types.js';
import { validate, toSeed, getFingerprint } from '../../core/mnemonic.js';
import { deriveAccount } from '../../core/derive.js';
import {
  hasStoredVault,
  getStoredVault,
  encryptVault,
  decryptVault,
  saveStoredVault,
  clearStoredVault,
} from '../../core/vault.js';

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
  hasVault: boolean;
  isVaultLoading: boolean;
  getAccount: (ledger: LedgerId, index?: number) => Account | null;
  unlockWithMnemonic: (phrase: string) => boolean;
  unlockWithPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  setupVaultWithPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  resetVault: () => Promise<void>;
  lockSession: () => void;
  setSelectedLedger: (ledger: ChainFilter) => void;
  setActiveAccountIndex: (index: number) => void;
}

const SessionContext = createContext<SessionState | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [selectedLedger, setSelectedLedger] = useState<ChainFilter>('all');
  const [activeAccountIndex, setActiveAccountIndex] = useState<number>(0);
  const [hasVault, setHasVault] = useState<boolean>(false);
  const [isVaultLoading, setIsVaultLoading] = useState<boolean>(true);

  // Check if an encrypted vault exists on mount
  useEffect(() => {
    let isMounted = true;
    hasStoredVault()
      .then((exists) => {
        if (isMounted) {
          setHasVault(exists);
          setIsVaultLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsVaultLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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

  const unlockWithPassword = useCallback(
    async (password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const stored = await getStoredVault();
        if (!stored) {
          return { success: false, error: 'Vault tidak ditemukan di penyimpanan browser' };
        }
        const payload = await decryptVault(stored, password);
        if (!validate(payload.mnemonic)) {
          return { success: false, error: 'Mnemonic dalam vault tidak valid' };
        }
        unlockWithMnemonic(payload.mnemonic);
        if (typeof payload.activeAccountIndex === 'number') {
          setActiveAccountIndex(payload.activeAccountIndex);
        }
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Password salah atau data vault rusak';
        return { success: false, error: msg };
      }
    },
    [unlockWithMnemonic]
  );

  const setupVaultWithPassword = useCallback(
    async (password: string): Promise<{ success: boolean; error?: string }> => {
      if (!mnemonic || !validate(mnemonic)) {
        return { success: false, error: 'Mnemonic belum aktif untuk disimpan' };
      }
      try {
        const payload: VaultPayload = {
          mnemonic,
          activeAccountIndex,
          createdAt: new Date().toISOString(),
        };
        const enc = await encryptVault(payload, password, fingerprint || undefined);
        await saveStoredVault(enc);
        setHasVault(true);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal mengenkripsi vault';
        return { success: false, error: msg };
      }
    },
    [mnemonic, activeAccountIndex, fingerprint]
  );

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

  const resetVault = useCallback(async (): Promise<void> => {
    await clearStoredVault();
    setHasVault(false);
    lockSession();
  }, [lockSession]);

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
    hasVault,
    isVaultLoading,
    getAccount,
    unlockWithMnemonic,
    unlockWithPassword,
    setupVaultWithPassword,
    resetVault,
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

