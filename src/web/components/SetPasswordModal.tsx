import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { useSession } from '../context/SessionContext.js';

interface SetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SetPasswordModal: React.FC<SetPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { setupVaultWithPassword } = useSession();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password minimal harus 8 karakter');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await setupVaultWithPassword(password);
      if (res.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(res.error || 'Gagal menyimpan password vault');
      }
    } catch {
      setError('Terjadi kesalahan saat mengenkripsi wallet');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rabby-modal-overlay" onClick={onClose}>
      <div
        className="rabby-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '380px' }}
      >
        {/* Modal Header */}
        <div className="rabby-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="var(--primary)" />
            <span className="rabby-modal-title">Amankan Wallet Anda</span>
          </div>
          <button
            type="button"
            className="rabby-modal-close-btn"
            onClick={onClose}
            title="Tutup"
            disabled={isLoading}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 0 8px 0' }}>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              marginBottom: '16px',
            }}
          >
            Atur password untuk mengenkripsi mnemonic wallet Anda (AES-256-GCM). Data tersimpan aman di browser sehingga Anda dapat login langsung tanpa harus mengetik ulang 12 kata mnemonic.
          </p>

          {error && (
            <div className="rabby-unlock-error-banner" style={{ marginBottom: '14px' }}>
              <AlertCircle size={15} color="var(--danger)" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Password Input */}
            <div className="rabby-unlock-input-group">
              <div className="rabby-unlock-input-prefix">
                <Lock size={15} color="var(--text-dim)" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Buat password (min. 8 karakter)..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                className="rabby-unlock-input"
                autoFocus
                disabled={isLoading}
              />
              <button
                type="button"
                className="rabby-unlock-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff size={16} color="var(--text-dim)" />
                ) : (
                  <Eye size={16} color="var(--text-dim)" />
                )}
              </button>
            </div>

            {/* Confirm Password Input */}
            <div className="rabby-unlock-input-group">
              <div className="rabby-unlock-input-prefix">
                <Lock size={15} color="var(--text-dim)" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Konfirmasi password..."
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                className="rabby-unlock-input"
                disabled={isLoading}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                className="rabby-btn-secondary"
                onClick={onClose}
                disabled={isLoading}
                style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-pill)', fontSize: '13px' }}
              >
                Nanti Saja
              </button>
              <button
                type="submit"
                className="rabby-btn-primary"
                disabled={password.length < 8 || password !== confirmPassword || isLoading}
                style={{ flex: 1.4, padding: '10px', borderRadius: 'var(--radius-pill)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {isLoading ? (
                  <span className="rabby-unlock-loading-content">
                    <RefreshCw size={14} className="rabby-spin-animate" />
                    <span>Menyimpan...</span>
                  </span>
                ) : (
                  'Simpan & Enkripsi'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
