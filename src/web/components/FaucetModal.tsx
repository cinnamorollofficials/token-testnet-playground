import React, { useState, useEffect } from 'react';
import { useSession, ACTIVE_LEDGERS } from '../context/SessionContext';
import { NETWORKS, LEDGER_LOGOS } from '../../config/networks.js';
import { getAdapter } from '../../core/registry.js';
import type { SolanaAdapter } from '../../adapters/solana.js';
import type { XRPLAdapter } from '../../adapters/xrpl.js';
import type { LedgerId } from '../../core/types.js';
import { X, Droplets, ExternalLink, Copy, Check, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialLedger?: LedgerId;
}

export const FaucetModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialLedger }) => {
  const { selectedLedger, accounts } = useSession();
  const [targetLedger, setTargetLedger] = useState<LedgerId>(
    initialLedger || (selectedLedger !== 'all' ? selectedLedger : 'ethereum')
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (initialLedger) {
      setTargetLedger(initialLedger);
    } else if (selectedLedger !== 'all') {
      setTargetLedger(selectedLedger);
    }
  }, [initialLedger, selectedLedger]);

  const currentAccount = accounts[targetLedger];
  const currentNetwork = NETWORKS[targetLedger];

  if (!isOpen || !currentAccount) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentAccount.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAutoFaucet = async () => {
    setLoading(true);
    setResultMsg(null);

    try {
      if (targetLedger === 'solana') {
        const solanaAdapter = getAdapter('solana') as SolanaAdapter;
        const sig = await solanaAdapter.requestAirdrop(currentAccount.address, 1);
        setResultMsg({
          type: 'success',
          text: `Airdrop 1 SOL berhasil! Signature: ${sig.slice(0, 16)}...`,
        });
        onSuccess();
      } else if (targetLedger === 'xrpl') {
        const xrplAdapter = getAdapter('xrpl') as XRPLAdapter;
        const res = await xrplAdapter.fundWallet(currentAccount);
        setResultMsg({
          type: 'success',
          text: `Dompet XRPL berhasil didanai! Saldo: ${res.balance} XRP`,
        });
        onSuccess();
      }
    } catch (err: any) {
      console.error('Faucet error:', err);
      setResultMsg({
        type: 'error',
        text: `Gagal klaim faucet: ${err.message || 'RPC rate limit atau timeout'}. Silakan coba beberapa saat lagi.`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rabby-modal-overlay">
      <div className="rabby-modal-card">
        <div className="rabby-modal-header">
          <div className="rabby-modal-title">
            <Droplets className="rabby-shield-icon" size={22} />
            Testnet Faucet ({currentNetwork.name})
          </div>
          <button className="rabby-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Chain selector tabs */}
        <div className="rabby-chain-tabs">
          {ACTIVE_LEDGERS.map((ledger) => (
            <button
              key={ledger}
              type="button"
              className={`rabby-chain-tab ${targetLedger === ledger ? 'active' : ''}`}
              onClick={() => {
                setTargetLedger(ledger);
                setResultMsg(null);
                setCopied(false);
              }}
            >
              <img
                src={LEDGER_LOGOS[ledger]}
                alt=""
                className="rabby-chain-tab-icon"
              />
              <span>{NETWORKS[ledger].nativeAsset.symbol} ({NETWORKS[ledger].testnetName})</span>
            </button>
          ))}
        </div>

        {/* Address info */}
        <div className="rabby-account-pill" style={{ marginBottom: '16px' }}>
          <div className="rabby-account-info">
            <div className="rabby-account-name">
              Target Address (Account #{currentAccount.index} • {currentNetwork.name})
            </div>
            <div className="rabby-account-addr" style={{ fontSize: '12px' }}>
              {currentAccount.address}
            </div>
          </div>
          <button className="rabby-btn-secondary" style={{ padding: '6px 10px' }} onClick={handleCopy}>
            {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Feedback message */}
        {resultMsg && (
          <div
            className="rabby-shield-box"
            style={{
              background: resultMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              borderColor: resultMsg.type === 'success' ? 'rgba(0, 196, 140, 0.3)' : 'rgba(255, 91, 91, 0.3)',
              marginBottom: '16px',
            }}
          >
            <div
              className="rabby-shield-desc"
              style={{ color: resultMsg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}
            >
              {resultMsg.text}
            </div>
          </div>
        )}

        {/* Dynamic Faucet Actions */}
        {currentNetwork.supportsAutoFaucet ? (
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
              Jaringan <strong>{currentNetwork.name}</strong> mendukung faucet otomatis langsung dari RPC testnet.
            </p>
            <button className="rabby-btn-primary" onClick={handleAutoFaucet} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Memproses Airdrop...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Klaim Faucet Otomatis ({targetLedger === 'solana' ? '1 SOL' : 'Test XRP'})
                </>
              )}
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
              Faucet untuk <strong>{currentNetwork.name} ({currentNetwork.testnetName})</strong> memerlukan verifikasi captcha manual melalui situs web resmi penyedia faucet:
            </p>

            <a
              href={currentNetwork.faucetUrl}
              target="_blank"
              rel="noreferrer"
              className="rabby-btn-primary"
              style={{ textDecoration: 'none', marginBottom: '12px' }}
            >
              <ExternalLink size={16} /> Buka Faucet {currentNetwork.name}
            </a>

            <button className="rabby-btn-secondary" onClick={handleCopy}>
              {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
              {copied ? 'Address Berhasil Dicopy!' : `Copy Address ${currentNetwork.nativeAsset.symbol} untuk di-paste di Faucet`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

