import React, { useState } from 'react';
import { Lock, Eye, EyeOff, KeyRound, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useSession } from '../context/SessionContext.js';

interface PasswordUnlockViewProps {
  onUnlockSuccess?: () => void;
}

export const PasswordUnlockView: React.FC<PasswordUnlockViewProps> = ({ onUnlockSuccess }) => {
  const { unlockWithPassword, resetVault } = useSession();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await unlockWithPassword(password);
      if (res.success) {
        onUnlockSuccess?.();
      } else {
        setErrorMessage(res.error || 'Password salah, silakan coba lagi');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan saat membuka wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    setIsLoading(true);
    await resetVault();
    setIsLoading(false);
    setShowResetConfirm(false);
  };

  return (
    <div className="rabby-unlock-container">
      {/* Visual Avatar / Lock Brand */}
      <div className="rabby-unlock-icon-wrap">
        <div className="rabby-unlock-icon-circle">
          <KeyRound size={26} color="#ffffff" />
        </div>
      </div>

      <h2 className="rabby-unlock-title">Unlock Wallet</h2>
      <p className="rabby-unlock-subtitle">
        Masukkan password Anda untuk membuka sesi playground
      </p>

      {errorMessage && (
        <div className="rabby-unlock-error-banner" role="alert">
          <AlertCircle size={15} color="var(--danger)" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Unlock Form */}
      <form onSubmit={handleUnlock} className="rabby-unlock-form">
        <div className="rabby-unlock-input-group">
          <div className="rabby-unlock-input-prefix">
            <Lock size={15} color="var(--text-dim)" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Masukkan password..."
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMessage) setErrorMessage(null);
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
            title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
          >
            {showPassword ? (
              <EyeOff size={16} color="var(--text-dim)" />
            ) : (
              <Eye size={16} color="var(--text-dim)" />
            )}
          </button>
        </div>

        <button
          type="submit"
          className="rabby-btn-primary rabby-unlock-submit-btn"
          disabled={!password || isLoading}
        >
          {isLoading ? (
            <span className="rabby-unlock-loading-content">
              <RefreshCw size={15} className="rabby-spin-animate" />
              <span>Membuka...</span>
            </span>
          ) : (
            'Unlock'
          )}
        </button>
      </form>

      {/* Reset Vault Secondary Option */}
      <div className="rabby-unlock-footer">
        {!showResetConfirm ? (
          <button
            type="button"
            className="rabby-unlock-reset-btn"
            onClick={() => setShowResetConfirm(true)}
          >
            Lupa password atau ganti wallet?
          </button>
        ) : (
          <div className="rabby-unlock-reset-box">
            <div className="rabby-unlock-reset-warning">
              <Trash2 size={16} color="var(--danger)" />
              <span>
                Reset akan menghapus vault tersimpan di browser ini. Pastikan Anda memiliki cadangan mnemonic!
              </span>
            </div>
            <div className="rabby-unlock-reset-actions">
              <button
                type="button"
                className="rabby-btn-secondary rabby-unlock-cancel-btn"
                onClick={() => setShowResetConfirm(false)}
                disabled={isLoading}
              >
                Batal
              </button>
              <button
                type="button"
                className="rabby-btn-danger rabby-unlock-danger-btn"
                onClick={handleConfirmReset}
                disabled={isLoading}
              >
                Ya, Reset Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
