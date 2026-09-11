import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveTransaction,
  getTransactions,
  getAllTransactions,
  updateTransactionStatus,
  clearTransactions,
  formatTxRelativeTime,
  type TransactionRecord,
} from '../src/core/history.js';

describe('Transaction History Module', () => {
  beforeEach(() => {
    clearTransactions();
  });

  it('should save and retrieve transactions correctly', () => {
    const tx: Omit<TransactionRecord, 'id'> = {
      hash: '0x1234567890abcdef',
      ledger: 'ethereum',
      type: 'send',
      assetSymbol: 'ETH',
      amount: '0.05',
      from: '0xsender1111111111111111111111111111111111',
      to: '0xreceiver2222222222222222222222222222222222',
      timestamp: Date.now(),
      status: 'confirmed',
      idrValue: 2250000,
      explorerUrl: 'https://sepolia.etherscan.io/tx/0x1234567890abcdef',
    };

    const saved = saveTransaction(tx);
    expect(saved.id).toBeDefined();
    expect(saved.hash).toBe(tx.hash);

    const all = getAllTransactions();
    expect(all.length).toBe(1);
    expect(all[0].amount).toBe('0.05');
    expect(all[0].status).toBe('confirmed');
  });

  it('should filter transactions by ledger', () => {
    saveTransaction({
      hash: '0xeth1',
      ledger: 'ethereum',
      type: 'send',
      assetSymbol: 'ETH',
      amount: '0.1',
      from: '0x1',
      to: '0x2',
      timestamp: 1000,
      status: 'confirmed',
    });

    saveTransaction({
      hash: '0xsol1',
      ledger: 'solana',
      type: 'faucet',
      assetSymbol: 'SOL',
      amount: '1.0',
      from: 'faucet',
      to: 'solAddr1',
      timestamp: 2000,
      status: 'confirmed',
    });

    const ethTxs = getTransactions({ ledger: 'ethereum' });
    expect(ethTxs.length).toBe(1);
    expect(ethTxs[0].ledger).toBe('ethereum');

    const solTxs = getTransactions({ ledger: 'solana' });
    expect(solTxs.length).toBe(1);
    expect(solTxs[0].ledger).toBe('solana');

    const allTxs = getTransactions({ ledger: 'all' });
    expect(allTxs.length).toBe(2);
  });

  it('should filter transactions by address', () => {
    saveTransaction({
      hash: '0x1',
      ledger: 'ethereum',
      type: 'send',
      assetSymbol: 'ETH',
      amount: '0.1',
      from: '0xTargetAddress',
      to: '0xOtherAddress',
      timestamp: 1000,
      status: 'confirmed',
    });

    saveTransaction({
      hash: '0x2',
      ledger: 'ethereum',
      type: 'receive',
      assetSymbol: 'ETH',
      amount: '0.2',
      from: '0xOtherAddress',
      to: '0xTARGETADDRESS',
      timestamp: 2000,
      status: 'confirmed',
    });

    saveTransaction({
      hash: '0x3',
      ledger: 'ethereum',
      type: 'send',
      assetSymbol: 'ETH',
      amount: '0.3',
      from: '0xUnrelated1',
      to: '0xUnrelated2',
      timestamp: 3000,
      status: 'confirmed',
    });

    const targetTxs = getTransactions({ address: '0xtargetaddress' });
    expect(targetTxs.length).toBe(2);
  });

  it('should update transaction status', () => {
    saveTransaction({
      hash: '0xpending123',
      ledger: 'polygon',
      type: 'send',
      assetSymbol: 'POL',
      amount: '10',
      from: '0x1',
      to: '0x2',
      timestamp: Date.now(),
      status: 'pending',
    });

    const updated = updateTransactionStatus('0xpending123', 'confirmed');
    expect(updated).toBe(true);

    const all = getAllTransactions();
    expect(all[0].status).toBe('confirmed');
  });

  it('should clear transactions correctly per ledger or completely', () => {
    saveTransaction({
      hash: '0x1',
      ledger: 'ethereum',
      type: 'send',
      assetSymbol: 'ETH',
      amount: '0.1',
      from: '0x1',
      to: '0x2',
      timestamp: 1000,
      status: 'confirmed',
    });

    saveTransaction({
      hash: '0x2',
      ledger: 'polygon',
      type: 'send',
      assetSymbol: 'POL',
      amount: '5',
      from: '0x1',
      to: '0x2',
      timestamp: 2000,
      status: 'confirmed',
    });

    clearTransactions({ ledger: 'ethereum' });
    const remaining = getAllTransactions();
    expect(remaining.length).toBe(1);
    expect(remaining[0].ledger).toBe('polygon');

    clearTransactions({ ledger: 'all' });
    expect(getAllTransactions().length).toBe(0);
  });

  it('should format relative time properly', () => {
    const now = Date.now();
    expect(formatTxRelativeTime(now - 10_000)).toBe('Baru saja');
    expect(formatTxRelativeTime(now - 300_000)).toBe('5 mnt lalu');
    expect(formatTxRelativeTime(now - 7_200_000)).toBe('2 jam lalu');
  });
});
