import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useSession, ACTIVE_LEDGERS } from '../context/SessionContext';
import { NETWORKS, LEDGER_LOGOS } from '../../config/networks.js';
import type { LedgerId } from '../../core/types.js';
import { X, QrCode, Copy, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialLedger?: LedgerId;
}

export const ReceiveModal: React.FC<Props> = ({ isOpen, onClose, initialLedger }) => {
  const { selectedLedger, accounts } = useSession();
  const [targetLedger, setTargetLedger] = useState<LedgerId>(
    initialLedger || (selectedLedger !== 'all' ? selectedLedger : 'ethereum')
  );
  const [copied, setCopied] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (initialLedger) {
      setTargetLedger(initialLedger);
    } else if (selectedLedger !== 'all') {
      setTargetLedger(selectedLedger);
    }
  }, [initialLedger, selectedLedger]);

  const currentAccount = accounts[targetLedger];
  const currentNetwork = NETWORKS[targetLedger];

  useEffect(() => {
    if (isOpen && currentAccount && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, currentAccount.address, {
        width: 200,
        margin: 2,
        color: {
          dark: '#0C0D14',
          light: '#FFFFFF',
        },
      });
    }
  }, [isOpen, currentAccount, targetLedger]);

  if (!isOpen || !currentAccount) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentAccount.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rabby-modal-overlay">
      <div className="rabby-modal-card" style={{ textAlign: 'center' }}>
        <div className="rabby-modal-header">
          <div className="rabby-modal-title">
            <QrCode className="rabby-shield-icon" size={22} />
            Receive Asset ({currentNetwork.nativeAsset.symbol})
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

        <div className="rabby-qr-box">
          <canvas ref={canvasRef} />
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Jaringan: <strong>{currentNetwork.name} ({currentNetwork.testnetName})</strong> • Path: <span style={{ fontFamily: 'var(--font-mono)' }}>{currentAccount.path}</span>
        </div>

        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            wordBreak: 'break-all',
            marginBottom: '16px',
            color: 'var(--text-main)',
          }}
        >
          {currentAccount.address}
        </div>

        <button className="rabby-btn-primary" onClick={handleCopy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Address Tersalin!' : `Salin Address ${currentNetwork.nativeAsset.symbol}`}
        </button>
      </div>
    </div>
  );
};

