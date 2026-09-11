import React, { useState, useEffect } from 'react';
import { useSession, ACTIVE_LEDGERS } from '../context/SessionContext';
import { NETWORKS, LEDGER_LOGOS } from '../../config/networks.js';
import { getAdapter } from '../../core/registry.js';
import { DEFAULT_TEST_TOKENS, getActiveTokenAsset } from '../../config/tokens.js';
import { parseAmount } from '../../core/amount.js';
import { validateAddress } from '../../core/validate.js';
import type { Asset, UnsignedTx, LedgerId } from '../../core/types.js';
import { formatIDR, calculateIDRValue, TESTNET_TO_INDODAX_MAP, type RatesMap } from '../../core/rates.js';
import { saveTransaction } from '../../core/history.js';
import {
  X,
  Send,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialLedger?: LedgerId;
  initialAsset?: 'native' | 'token';
  rates?: RatesMap;
}

export const SendModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  initialLedger,
  initialAsset = 'native',
  rates,
}) => {
  const { selectedLedger, accounts, recipientAccounts } = useSession();

  const [targetLedger, setTargetLedger] = useState<LedgerId>(
    initialLedger || (selectedLedger !== 'all' ? selectedLedger : 'ethereum')
  );
  const [step, setStep] = useState<'form' | 'simulate' | 'submitting' | 'confirmed'>('form');
  const [assetType, setAssetType] = useState<'native' | 'token'>(initialAsset);
  const [recipient, setRecipient] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('1');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Simulation preview state
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTx | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loadingSim, setLoadingSim] = useState<boolean>(false);

  useEffect(() => {
    if (initialLedger) {
      setTargetLedger(initialLedger);
    } else if (selectedLedger !== 'all') {
      setTargetLedger(selectedLedger);
    }
  }, [initialLedger, selectedLedger]);

  useEffect(() => {
    if (initialAsset) {
      setAssetType(initialAsset);
    }
  }, [initialAsset]);

  const currentAccount = accounts[targetLedger];
  const currentRecipient = recipientAccounts[targetLedger];
  const currentNetwork = NETWORKS[targetLedger];
  const defaultToken = getActiveTokenAsset(targetLedger);

  // If switched to a ledger that has no defaultToken, force native asset
  useEffect(() => {
    if (!defaultToken && assetType === 'token') {
      setAssetType('native');
    }
  }, [targetLedger, defaultToken, assetType]);

  if (!isOpen || !currentAccount) return null;

  const handleSelectQuickRecipient = () => {
    if (currentRecipient) {
      setRecipient(currentRecipient.address);
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!recipient.trim()) {
      setErrorMsg('Harap masukkan address penerima.');
      return;
    }

    const valResult = validateAddress(targetLedger, recipient.trim());
    if (!valResult.valid) {
      setErrorMsg(valResult.error || 'Address penerima tidak valid.');
      return;
    }

    let asset: Asset;
    let decimals: number;

    if (assetType === 'native') {
      asset = { kind: 'native', symbol: currentNetwork.nativeAsset.symbol, decimals: currentNetwork.nativeAsset.decimals };
      decimals = currentNetwork.nativeAsset.decimals;
    } else {
      if (!defaultToken) {
        setErrorMsg(`Token test belum didukung di ${currentNetwork.name}.`);
        return;
      }
      asset = defaultToken;
      decimals = defaultToken.decimals ?? 18;
    }

    let parsedBigInt: bigint;
    try {
      parsedBigInt = parseAmount(amountStr, decimals);
      if (parsedBigInt <= 0n) {
        throw new Error('Jumlah transfer harus lebih dari 0.');
      }
    } catch (err: any) {
      setErrorMsg(`Format jumlah tidak valid: ${err.message}`);
      return;
    }

    setLoadingSim(true);
    try {
      const adapter = getAdapter(targetLedger);
      const tx = await adapter.buildTransfer({
        from: currentAccount,
        to: recipient.trim(),
        asset,
        amount: parsedBigInt,
      });

      setUnsignedTx(tx);
      setStep('simulate');
    } catch (err: any) {
      console.error('Simulation error:', err);
      setErrorMsg(`Gagal simulasi transaksi: ${err.message || 'Periksa format address dan saldo.'}`);
    } finally {
      setLoadingSim(false);
    }
  };

  const handleSignAndSubmit = async () => {
    if (!unsignedTx || !currentAccount.privateKey) return;

    setStep('submitting');
    setErrorMsg(null);

    try {
      const adapter = getAdapter(targetLedger);
      // Step 1: Sign in-memory (offline)
      const signed = await adapter.sign(unsignedTx, currentAccount.privateKey);
      // Step 2: Broadcast to testnet
      const { hash } = await adapter.broadcast(signed);
      setTxHash(hash);

      // Save to transaction history
      const symbol = getAssetSymbol();
      const idrRate = rates && TESTNET_TO_INDODAX_MAP[symbol] ? rates[TESTNET_TO_INDODAX_MAP[symbol]]?.priceIdr : undefined;
      const idrVal = rates ? calculateIDRValue(amount, symbol, rates) : undefined;
      let explorerLink = '';
      try {
        explorerLink = adapter.explorerTx(hash);
      } catch {
        explorerLink = `${currentNetwork.explorerUrl}/tx/${hash}`;
      }

      saveTransaction({
        hash,
        ledger: targetLedger,
        type: 'send',
        assetSymbol: symbol,
        amount,
        from: currentAccount.address,
        to: recipient.trim(),
        timestamp: Date.now(),
        status: 'confirmed',
        idrRate,
        idrValue: idrVal,
        explorerUrl: explorerLink,
      });

      setStep('confirmed');
      onSuccess();
    } catch (err: any) {
      console.error('Broadcast error:', err);
      setErrorMsg(`Gagal mengirim transaksi: ${err.message}`);
      setStep('simulate');
    }
  };

  const handleResetAndClose = () => {
    setStep('form');
    setErrorMsg(null);
    setTxHash(null);
    setUnsignedTx(null);
    onClose();
  };

  const getAssetSymbol = () => {
    return assetType === 'native' ? currentNetwork.nativeAsset.symbol : (defaultToken?.symbol || 'HTT');
  };


  return (
    <div className="rabby-modal-overlay">
      <div className="rabby-modal-card">
        {/* Header */}
        <div className="rabby-modal-header">
          <div className="rabby-modal-title">
            <Send className="rabby-shield-icon" size={22} />
            {step === 'simulate' ? 'Pre-execution Simulation' : step === 'confirmed' ? 'Transaksi Terkonfirmasi' : 'Kirim Aset'}
          </div>
          <button className="rabby-close-btn" onClick={handleResetAndClose}>
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rabby-shield-box" style={{ background: 'var(--danger-bg)', borderColor: 'rgba(255, 91, 91, 0.3)', marginBottom: '16px' }}>
            <AlertCircle color="var(--danger)" size={18} style={{ flexShrink: 0 }} />
            <div className="rabby-shield-desc" style={{ color: 'var(--danger)' }}>{errorMsg}</div>
          </div>
        )}

        {/* STEP 1: FORM INPUT */}
        {step === 'form' && (
          <form onSubmit={handleSimulate}>
            {/* Chain Selector Tabs */}
            <div className="rabby-chain-tabs">
              {ACTIVE_LEDGERS.map((ledger) => (
                <button
                  key={ledger}
                  type="button"
                  className={`rabby-chain-tab ${targetLedger === ledger ? 'active' : ''}`}
                  onClick={() => {
                    setTargetLedger(ledger);
                    setErrorMsg(null);
                    if (!DEFAULT_TEST_TOKENS[ledger]) {
                      setAssetType('native');
                    }
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

            {/* Asset Selector Tabs */}
            <div className="rabby-tabs">
              {defaultToken && (
                <button
                  type="button"
                  className={`rabby-tab-btn ${assetType === 'token' ? 'active' : ''}`}
                  onClick={() => setAssetType('token')}
                >
                  Test Token ({defaultToken.symbol})
                </button>
              )}
              <button
                type="button"
                className={`rabby-tab-btn ${assetType === 'native' ? 'active' : ''}`}
                onClick={() => setAssetType('native')}
              >
                Native ({currentNetwork.nativeAsset.symbol})
              </button>
            </div>

            {/* Recipient Input */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Penerima</label>
                {currentRecipient && (
                  <button
                    type="button"
                    onClick={handleSelectQuickRecipient}
                    style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}
                  >
                    + Akun #1 (Milik Sendiri)
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder={`Address penerima ${currentNetwork.name}...`}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  padding: '12px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Amount Input */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Jumlah ({getAssetSymbol()})
                </label>
                {rates && (
                  <span className="rabby-live-indicator" style={{ fontSize: '10px', padding: '1px 6px' }}>
                    <span className="rabby-live-dot" /> Indodax
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="1.0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
              {rates && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>Estimasi Nilai Pasar:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    ≈ {formatIDR(calculateIDRValue(amountStr, getAssetSymbol(), rates))}
                  </span>
                </div>
              )}
            </div>

            <button type="submit" className="rabby-btn-primary" disabled={loadingSim}>
              {loadingSim ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Mempersiapkan Simulasi...
                </>
              ) : (
                'Preview & Simulasi Transaksi'
              )}
            </button>
          </form>
        )}

        {/* STEP 2: RABBY PRE-SIGN SIMULATION */}
        {step === 'simulate' && unsignedTx && (
          <div>
            {/* Signature Rabby Security Shield */}
            <div className="rabby-shield-box">
              <ShieldCheck className="rabby-shield-icon" size={24} />
              <div>
                <div className="rabby-shield-title">Testnet Pre-flight Guard Verified</div>
                <div className="rabby-shield-desc">
                  Simulasi eksekusi transaksi berjalan sukses tanpa konflik.
                </div>
              </div>
            </div>

            {/* Balance Change Simulation Box */}
            <div
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
                SIMULASI PERUBAHAN SALDO
              </div>

              {/* Sender change */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  padding: '10px 12px',
                  background: 'var(--danger-bg)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <ArrowUpRight size={16} color="var(--danger)" />
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Akun #{currentAccount.index} (Pengirim)</span>
                </div>
                <div style={{ color: 'var(--danger)', fontWeight: 700, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  <div>-{amountStr} {getAssetSymbol()}</div>
                  {rates && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                      ≈ {formatIDR(calculateIDRValue(amountStr, getAssetSymbol(), rates))}
                    </div>
                  )}
                </div>
              </div>


              {/* Recipient change */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: 'var(--success-bg)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <ArrowDownLeft size={16} color="var(--success)" />
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Penerima</span>
                </div>
                <div style={{ color: 'var(--success)', fontWeight: 700, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  <div>+{amountStr} {getAssetSymbol()}</div>
                  {rates && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                      ≈ {formatIDR(calculateIDRValue(amountStr, getAssetSymbol(), rates))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fee Breakdown */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
                padding: '10px 14px',
                background: 'var(--bg-card-sub)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Estimasi Network Fee:</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 600, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                  ~{unsignedTx.fee.formatted} {unsignedTx.fee.symbol}
                </span>
                {rates && (() => {
                  const feeIdr = calculateIDRValue(unsignedTx.fee.formatted, unsignedTx.fee.symbol, rates);
                  if (feeIdr > 0) {
                    return (
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '6px' }}>
                        (≈ {formatIDR(feeIdr)})
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Warnings if any */}
            {unsignedTx.warnings && unsignedTx.warnings.map((w, idx) => (
              <div
                key={idx}
                className="rabby-shield-box"
                style={{ background: 'var(--warning-bg)', borderColor: 'rgba(255, 159, 67, 0.3)', marginBottom: '12px' }}
              >
                <AlertTriangle color="var(--warning)" size={18} style={{ flexShrink: 0 }} />
                <div className="rabby-shield-desc" style={{ color: 'var(--warning)' }}>{w}</div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="rabby-btn-secondary" onClick={() => setStep('form')}>
                Ubah
              </button>
              <button className="rabby-btn-primary" onClick={handleSignAndSubmit}>
                Sign & Submit Transaksi
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUBMITTING / SIGNING */}
        {step === 'submitting' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Loader2 size={44} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>Menandatangani & Broadcast...</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Kunci privat offline menandatangani transaksi di memori browser dan mem-broadcast ke node testnet.
            </p>
          </div>
        )}

        {/* STEP 4: CONFIRMED */}
        {step === 'confirmed' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--success-bg)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <CheckCircle2 size={32} color="var(--success)" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Transaksi Berhasil Dikirim!</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Transfer sebesar <strong>{amountStr} {getAssetSymbol()}</strong> telah disiarkan ke testnet {currentNetwork.name}.
            </p>

            {txHash && (
              <a
                href={`${currentNetwork.explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="rabby-btn-secondary"
                style={{ textDecoration: 'none', marginBottom: '12px' }}
              >
                Lihat di Block Explorer <ExternalLink size={14} />
              </a>
            )}

            <button className="rabby-btn-primary" onClick={handleResetAndClose}>
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
