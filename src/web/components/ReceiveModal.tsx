import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useSession } from '../context/SessionContext.js';
import { NETWORKS } from '../../config/networks.js';
import { X, QrCode, Copy, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiveModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { selectedLedger, activeAccount } = useSession();
  const [copied, setCopied] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentNetwork = NETWORKS[selectedLedger];

  useEffect(() => {
    if (isOpen && activeAccount && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, activeAccount.address, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0C0D14',
          light: '#FFFFFF',
        },
      });
    }
  }, [isOpen, activeAccount]);

  if (!isOpen || !activeAccount) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeAccount.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rabby-modal-overlay">
      <div className="rabby-modal-card" style={{ textAlign: 'center' }}>
        <div className="rabby-modal-header">
          <div className="rabby-modal-title">
            <QrCode className="rabby-shield-icon" size={22} />
            Receive {currentNetwork.nativeAsset.symbol} ({currentNetwork.name})
          </div>
          <button className="rabby-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="rabby-qr-box">
          <canvas ref={canvasRef} />
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Derivation Path: <span style={{ fontFamily: 'var(--font-mono)' }}>{activeAccount.path}</span>
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
          {activeAccount.address}
        </div>

        <button className="rabby-btn-primary" onClick={handleCopy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Address Tersalin!' : 'Salin Address'}
        </button>
      </div>
    </div>
  );
};
