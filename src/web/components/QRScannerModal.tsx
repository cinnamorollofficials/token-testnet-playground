import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useSession } from '../context/SessionContext';
import { X, Camera, Upload, Edit3, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const QRScannerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { unlockWithMnemonic } = useSession();
  const [activeTab, setActiveTab] = useState<'camera' | 'file' | 'manual'>('camera');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualText, setManualText] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Stop camera helper
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error clearing scanner:', err);
      }
      scannerRef.current = null;
    }
  };

  const handleOpenScannerInTab = () => {
    stopCamera();
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html?action=scan') });
    } else {
      window.open(window.location.origin + window.location.pathname + '?action=scan', '_blank');
    }
  };

  const handleSuccessfulScan = (decodedText: string) => {
    setErrorMsg(null);
    const success = unlockWithMnemonic(decodedText);
    if (success) {
      stopCamera();
      onClose();
    } else {
      setErrorMsg('QR code terbaca, tetapi bukan frasa BIP-39 valid (checksum atau kata salah).');
    }
  };

  // Start Camera
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopCamera();
      return;
    }

    const html5QrCode = new Html5Qrcode('qr-reader-viewport');
    scannerRef.current = html5QrCode;

    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (cameras && cameras.length) {
          const cameraId = cameras[0].id;
          return html5QrCode.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              handleSuccessfulScan(decodedText);
            },
            () => {
              // scanning error / frame without QR, ignore
            }
          );
        } else {
          setErrorMsg('Tidak ada webcam/kamera terdeteksi. Silakan gunakan tab Upload Gambar atau Manual Input.');
        }
      })
      .catch((err) => {
        console.error('Camera init error:', err);
        setErrorMsg('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser.');
      });

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('qr-reader-file-dummy');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      handleSuccessfulScan(decodedText);
    } catch (err) {
      console.error('File scan error:', err);
      setErrorMsg('Gagal mendeteksi QR code pada file gambar yang diunggah. Pastikan gambar jelas dan tidak buram.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSuccessfulScan(manualText);
  };

  if (!isOpen) return null;

  return (
    <div className="rabby-modal-overlay">
      <div className="rabby-modal-card">
        {/* Header */}
        <div className="rabby-modal-header">
          <div className="rabby-modal-title">
            <Camera color="var(--primary)" size={20} />
            Unlock Sesi Runtime via QR
          </div>
          <button
            className="rabby-close-btn"
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="rabby-tabs">
          <button
            className={`rabby-tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
            onClick={() => setActiveTab('camera')}
          >
            <Camera size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
            Webcam Scan
          </button>
          <button
            className={`rabby-tab-btn ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => setActiveTab('file')}
          >
            <Upload size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
            Upload Foto
          </button>
          <button
            className={`rabby-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <Edit3 size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
            Manual
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rabby-shield-box" style={{ background: 'var(--danger-bg)', borderColor: 'rgba(255, 91, 91, 0.3)' }}>
            <AlertCircle color="var(--danger)" size={18} style={{ flexShrink: 0 }} />
            <div className="rabby-shield-desc" style={{ color: 'var(--danger)' }}>
              {errorMsg}
            </div>
          </div>
        )}

        {/* Mode 1: Camera Scanner */}
        {activeTab === 'camera' && (
          <div style={{ textAlign: 'center' }}>
            <div
              id="qr-reader-viewport"
              style={{
                width: '100%',
                borderRadius: 'var(--radius-base)',
                overflow: 'hidden',
                background: '#000',
                border: '1px solid var(--border-subtle)',
                minHeight: '260px',
              }}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
              Arahkan foto QR code di layar HP Anda ke kamera laptop ini.
            </p>

            {/* Quick action button for Extension popup */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="rabby-quick-send-btn"
                onClick={handleOpenScannerInTab}
                title="Buka scanner di tab penuh jika izin kamera di popup browser terhambat"
                style={{ fontSize: '12px', padding: '7px 14px' }}
              >
                <ExternalLink size={13} />
                Buka Scanner di Tab Penuh
              </button>
            </div>
          </div>
        )}

        {/* Mode 2: File Upload */}
        {activeTab === 'file' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div id="qr-reader-file-dummy" style={{ display: 'none' }} />
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '36px 20px',
                border: '2px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-base)',
                background: 'var(--bg-input)',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
            >
              <Upload size={36} color="var(--primary)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                  Pilih file gambar foto QR
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  PNG, JPG, JPEG, WEBP
                </div>
              </div>
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
              Unggah foto QR code yang telah Anda simpan di laptop/device.
            </p>
          </div>
        )}

        {/* Mode 3: Manual Input */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit}>
            <textarea
              rows={4}
              placeholder="Masukkan 12 atau 24 kata BIP-39 dipisahkan spasi..."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-base)',
                padding: '12px',
                fontSize: '13px',
                lineHeight: '1.5',
                resize: 'none',
                outline: 'none',
                marginBottom: '16px',
              }}
            />
            <button type="submit" className="rabby-btn-primary">
              <CheckCircle2 size={16} /> Unlock Sesi Sekarang
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
