import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { generate } from '../../core/mnemonic.js';
import { useSession } from '../context/SessionContext.js';
import { X, Download, RefreshCw, Key, ShieldAlert, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const QRGeneratorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { unlockWithMnemonic } = useSession();
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [phrase, setPhrase] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const generateNewPhrase = (words: 12 | 24 = wordCount) => {
    const newMnemonic = generate(words);
    setPhrase(newMnemonic);
    setCopied(false);
  };

  useEffect(() => {
    if (isOpen) {
      generateNewPhrase(wordCount);
    }
  }, [isOpen, wordCount]);

  useEffect(() => {
    if (phrase && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, phrase, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0C0D14',
          light: '#FFFFFF',
        },
      });
    }
  }, [phrase]);

  if (!isOpen) return null;

  const words = phrase.split(' ');

  const handleDownloadQR = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `testnet-seed-${words.length}words-qr.png`;
    a.click();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(phrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlockSession = () => {
    unlockWithMnemonic(phrase);
    onClose();
  };

  return (
    <div className="rabby-modal-overlay">
      <div className="rabby-modal-card">
        <div className="rabby-modal-header">
          <div className="rabby-modal-title">
            <Key className="rabby-shield-icon" size={22} />
            Generate New Seed & QR
          </div>
          <button className="rabby-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Testnet Alert Box */}
        <div className="rabby-shield-box" style={{ background: 'var(--warning-bg)', borderColor: 'rgba(255, 159, 67, 0.3)' }}>
          <ShieldAlert color="var(--warning)" size={20} style={{ flexShrink: 0 }} />
          <div>
            <div className="rabby-shield-title" style={{ color: 'var(--warning)' }}>TESTNET ONLY PLAYGROUND</div>
            <div className="rabby-shield-desc">
              Frasa dan QR code ini hanya untuk pengujian testnet. Jangan pernah gunakan untuk menyimpan aset bernilai nyata!
            </div>
          </div>
        </div>

        {/* Word count tabs */}
        <div className="rabby-tabs">
          <button
            className={`rabby-tab-btn ${wordCount === 12 ? 'active' : ''}`}
            onClick={() => {
              setWordCount(12);
              generateNewPhrase(12);
            }}
          >
            12 Words
          </button>
          <button
            className={`rabby-tab-btn ${wordCount === 24 ? 'active' : ''}`}
            onClick={() => {
              setWordCount(24);
              generateNewPhrase(24);
            }}
          >
            24 Words
          </button>
        </div>

        {/* QR Code Canvas */}
        <div style={{ textAlign: 'center' }}>
          <div className="rabby-qr-box">
            <canvas ref={canvasRef} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            📱 Foto QR code di atas menggunakan kamera HP Anda untuk scanning cepat nanti
          </div>
        </div>

        {/* Mnemonic Words Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            background: 'var(--bg-input)',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '16px',
          }}
        >
          {words.map((w, i) => (
            <div key={i} style={{ fontSize: '12px', display: 'flex', gap: '4px' }}>
              <span style={{ color: 'var(--text-dim)', width: '20px' }}>{i + 1}.</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{w}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button className="rabby-btn-secondary" onClick={handleDownloadQR}>
            <Download size={16} /> Unduh QR PNG
          </button>
          <button className="rabby-btn-secondary" onClick={handleCopy}>
            {copied ? <Check size={16} color="var(--success)" /> : <Key size={16} />}
            {copied ? 'Tersalin!' : 'Copy Frasa'}
          </button>
          <button className="rabby-btn-secondary" style={{ width: '48px', padding: 0 }} onClick={() => generateNewPhrase(wordCount)} title="Generate Ulang">
            <RefreshCw size={16} />
          </button>
        </div>

        <button className="rabby-btn-primary" onClick={handleUnlockSession}>
          Gunakan & Masuk ke Sesi Runtime
        </button>
      </div>
    </div>
  );
};
