import React, { useState } from 'react';
import { useSession } from '../context/SessionContext.js';
import { NETWORKS } from '../../config/networks.js';
import { getAdapter } from '../../core/registry.js';
import type { SolanaAdapter } from '../../adapters/solana.js';
import type { XRPLAdapter } from '../../adapters/xrpl.js';
import { X, Droplets, ExternalLink, Copy, Check, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FaucetModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { selectedLedger, activeAccount } = useSession();
  const [loading, setLoading] = useState<boolean>(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !activeAccount) return null;

  const currentNetwork = NETWORKS[selectedLedger];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeAccount.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAutoFaucet = async () => {
    setLoading(true);
    setResultMsg(null);

    try {
      if (selectedLedger === 'solana') {
        const solanaAdapter = getAdapter('solana') as SolanaAdapter;
        const sig = await solanaAdapter.requestAirdrop(activeAccount.address, 1);
        setResultMsg({
          type: 'success',
          text: `Airdrop 1 SOL berhasil! Signature: ${sig.slice(0, 16)}...`,
        });
        onSuccess();
      } else if (selectedLedger === 'xrpl') {
        const xrplAdapter = getAdapter('xrpl') as XRPLAdapter;
        const res = await xrplAdapter.fundWallet(activeAccount);
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

        {/* Address info */}
        <div className="rabby-account-pill" style={{ marginBottom: '16px' }}>
          <div className="rabby-account-info">
            <div className="rabby-account-name">Target Address (Account #{activeAccount.index})</div>
            <div className="rabby-account-addr" style={{ fontSize: '12px' }}>{activeAccount.address}</div>
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
                  <Sparkles size={16} /> Klaim Faucet Otomatis ({selectedLedger === 'solana' ? '1 SOL' : 'Test XRP'})
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
              {copied ? 'Address Berhasil Dicopy!' : 'Copy Address Anda untuk di-paste di Faucet'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
