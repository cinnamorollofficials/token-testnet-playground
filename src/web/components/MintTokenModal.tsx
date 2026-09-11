import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { NETWORKS } from '../../config/networks.js';
import { getActiveTokenAsset, setActiveTokenAddress } from '../../config/tokens.js';
import { TEST_TOKEN_ABI, TEST_TOKEN_BYTECODE } from '../../contracts/TestTokenArtifact.js';
import { ContractFactory, Contract, JsonRpcProvider, Wallet, getAddress } from 'ethers';
import type { LedgerId } from '../../core/types.js';
import { saveTransaction } from '../../core/history.js';
import { X, Coins, Sparkles, Loader2, CheckCircle2, AlertCircle, ExternalLink, Check, Save } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialLedger?: LedgerId;
}

export const MintTokenModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialLedger }) => {
  const { selectedLedger, accounts } = useSession();
  const [targetLedger, setTargetLedger] = useState<'ethereum' | 'polygon'>('ethereum');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string; hash?: string } | null>(null);
  const [contractInput, setContractInput] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (initialLedger === 'polygon' || selectedLedger === 'polygon') {
      setTargetLedger('polygon');
    } else {
      setTargetLedger('ethereum');
    }
  }, [initialLedger, selectedLedger]);

  useEffect(() => {
    const active = getActiveTokenAsset(targetLedger);
    if (active && 'address' in active) {
      if (active.address.toLowerCase().startsWith('0x3865296839352')) {
        const official = '0xf98a6e32dB5b1572C83016Ad70068850c8939063';
        setContractInput(official);
        setActiveTokenAddress(targetLedger, official);
      } else {
        setContractInput(active.address);
      }
    }
    setStatusMsg(null);
  }, [targetLedger]);

  const currentAccount = accounts[targetLedger];
  const currentNetwork = NETWORKS[targetLedger];

  if (!isOpen || !currentAccount) return null;

  const handleSaveContract = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = contractInput.trim();
    if (!trimmed) {
      setStatusMsg({ type: 'error', text: 'Harap masukkan alamat kontrak HTT.' });
      return;
    }

    try {
      const checksummed = getAddress(trimmed.toLowerCase());
      setActiveTokenAddress(targetLedger, checksummed);
      setContractInput(checksummed);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      setStatusMsg({
        type: 'success',
        text: `Alamat kontrak HTT aktif di ${currentNetwork.name} berhasil disimpan (${checksummed.slice(0, 8)}...${checksummed.slice(-6)})!`,
      });
      onSuccess();
    } catch {
      setStatusMsg({
        type: 'error',
        text: 'Format alamat kontrak EVM tidak valid. Pastikan diawali dengan 0x dan berjumlah 42 karakter heksadesimal.',
      });
    }
  };

  const handleDeployEVM = async () => {
    if (!currentAccount.privateKey) {
      setStatusMsg({ type: 'error', text: 'Private key tidak ditemukan di sesi memori.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const provider = new JsonRpcProvider(currentNetwork.rpcUrl);
      const wallet = new Wallet(currentAccount.privateKey, provider);

      // Cek apakah ada saldo gas
      const nativeBal = await provider.getBalance(currentAccount.address);
      if (nativeBal === 0n) {
        setStatusMsg({
          type: 'error',
          text: `Saldo ${currentNetwork.nativeAsset.symbol} Anda masih 0.00 di address ${currentAccount.address}. Anda membutuhkan gas fee untuk deploy kontrak baru. Silakan klaim faucet ${currentNetwork.name} terlebih dahulu, atau jika Anda sudah deploy via Remix/MetaMask, cukup paste alamat kontraknya di input atas.`,
        });
        setLoading(false);
        return;
      }

      const factory = new ContractFactory(TEST_TOKEN_ABI, TEST_TOKEN_BYTECODE, wallet);
      const contract = await factory.deploy();
      await contract.waitForDeployment();
      const addr = await contract.getAddress();
      const deployHash = contract.deploymentTransaction()?.hash || `deploy_${Date.now()}`;

      saveTransaction({
        hash: deployHash,
        ledger: targetLedger,
        type: 'mint',
        assetSymbol: 'HTT',
        amount: 'Deploy',
        from: currentAccount.address,
        to: addr,
        timestamp: Date.now(),
        status: 'confirmed',
        explorerUrl: `${currentNetwork.explorerUrl}/address/${addr}`,
        memo: 'Deploy HTT Token Contract',
      });

      setActiveTokenAddress(targetLedger, addr);
      setContractInput(addr);
      setStatusMsg({
        type: 'success',
        text: `Kontrak Hadi Token Test (HTT) berhasil di-deploy di ${currentNetwork.name}! Alamat otomatis disimpan: ${addr}`,
      });
      onSuccess();
    } catch (err: any) {
      console.error('Deploy error:', err);
      setStatusMsg({
        type: 'error',
        text: `Gagal deploy: ${err.message || 'Periksa saldo gas Anda.'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMintEVM = async () => {
    if (!currentAccount.privateKey) return;
    setLoading(true);
    setStatusMsg(null);

    try {
      const active = getActiveTokenAsset(targetLedger);
      const targetContract = contractInput.trim() || (active && 'address' in active ? active.address : '');

      if (!targetContract) {
        setStatusMsg({
          type: 'error',
          text: 'Alamat smart contract HTT belum diisi. Masukkan atau deploy kontrak terlebih dahulu.',
        });
        setLoading(false);
        return;
      }

      let validAddr = targetContract;
      try {
        validAddr = getAddress(targetContract.trim().toLowerCase());
      } catch {
        setStatusMsg({ type: 'error', text: 'Alamat smart contract HTT tidak valid.' });
        setLoading(false);
        return;
      }

      const provider = new JsonRpcProvider(currentNetwork.rpcUrl);
      const wallet = new Wallet(currentAccount.privateKey, provider);

      // Cek gas
      const nativeBal = await provider.getBalance(currentAccount.address);
      if (nativeBal === 0n) {
        setStatusMsg({
          type: 'error',
          text: `Saldo ${currentNetwork.nativeAsset.symbol} kosong (0.00). Minting token on-chain memerlukan sedikit gas. Silakan klaim faucet ${currentNetwork.name} terlebih dahulu.`,
        });
        setLoading(false);
        return;
      }

      const contract = new Contract(validAddr, TEST_TOKEN_ABI, wallet);
      const mintAmount = 1000n * 10n ** 18n; // 1,000 HTT
      const tx = await contract.mint(currentAccount.address, mintAmount);
      await tx.wait(1);

      saveTransaction({
        hash: tx.hash,
        ledger: targetLedger,
        type: 'mint',
        assetSymbol: 'HTT',
        amount: '1000',
        from: validAddr,
        to: currentAccount.address,
        timestamp: Date.now(),
        status: 'confirmed',
        explorerUrl: `${currentNetwork.explorerUrl}/tx/${tx.hash}`,
        memo: 'Mint 1,000 HTT Test Token',
      });

      setStatusMsg({
        type: 'success',
        text: `Berhasil mint 1,000 HTT ke akun #${currentAccount.index} di ${currentNetwork.name}!`,
        hash: tx.hash,
      });
      onSuccess();
    } catch (err: any) {
      console.error('Mint error:', err);
      setStatusMsg({
        type: 'error',
        text: `Gagal mint: ${err.message || 'Pastikan saldo gas mencukupi dan smart contract mendukung mint().'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rabby-modal-overlay">
      <div className="rabby-modal-card" style={{ maxWidth: '520px' }}>
        <div className="rabby-modal-header">
          <div className="rabby-modal-title">
            <Coins className="rabby-shield-icon" size={22} />
            Kelola & Mint Hadi Token Test (HTT)
          </div>
          <button className="rabby-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* EVM Chain tabs */}
        <div className="rabby-chain-tabs">
          <button
            type="button"
            className={`rabby-chain-tab ${targetLedger === 'ethereum' ? 'active' : ''}`}
            onClick={() => {
              setTargetLedger('ethereum');
              setStatusMsg(null);
            }}
          >
            Ethereum Sepolia (ETH)
          </button>
          <button
            type="button"
            className={`rabby-chain-tab ${targetLedger === 'polygon' ? 'active' : ''}`}
            onClick={() => {
              setTargetLedger('polygon');
              setStatusMsg(null);
            }}
          >
            Polygon Amoy (POL)
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
          Token uji <strong>Hadi Token Test (HTT)</strong> di jaringan <strong>{currentNetwork.name} ({currentNetwork.testnetName})</strong>.
        </p>

        {/* Active Contract Address Form */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-base)',
            padding: '12px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Alamat Smart Contract HTT ({currentNetwork.name}):
            </label>
            {contractInput && (
              <a
                href={`${currentNetwork.explorerUrl}/address/${contractInput}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '11px', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
              >
                Explorer <ExternalLink size={11} />
              </a>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="rabby-input"
              value={contractInput}
              onChange={(e) => setContractInput(e.target.value)}
              placeholder="0x..."
              style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                padding: '8px 10px',
                flex: 1,
              }}
            />
            <button
              type="button"
              className="rabby-btn-secondary"
              onClick={() => handleSaveContract()}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
              title="Simpan alamat kontrak ke memori/localStorage"
            >
              {savedSuccess ? <Check size={14} color="var(--success)" /> : <Save size={14} />}
              {savedSuccess ? 'Tersimpan!' : 'Simpan'}
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px', lineHeight: '1.4' }}>
            💡 Jika Anda men-deploy kontrak HTT via Remix / MetaMask / Etherscan, paste alamat kontraknya di sini lalu klik <strong>Simpan</strong> agar portofolio web dapat membaca saldonya.
          </p>
        </div>

        {statusMsg && (
          <div
            className="rabby-shield-box"
            style={{
              background: statusMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              borderColor: statusMsg.type === 'success' ? 'rgba(0, 196, 140, 0.3)' : 'rgba(255, 91, 91, 0.3)',
              marginBottom: '16px',
            }}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 color="var(--success)" size={18} style={{ flexShrink: 0 }} />
            ) : (
              <AlertCircle color="var(--danger)" size={18} style={{ flexShrink: 0 }} />
            )}
            <div style={{ fontSize: '12px', color: statusMsg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
              {statusMsg.text}
              {statusMsg.hash && (
                <div style={{ marginTop: '4px' }}>
                  <a
                    href={`${currentNetwork.explorerUrl}/tx/${statusMsg.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'inherit', fontWeight: 600 }}
                  >
                    Lihat Transaksi di Explorer ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="rabby-btn-primary" onClick={handleMintEVM} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Memproses...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Mint 1,000 HTT ke Akun Ini (#{currentAccount.index})
              </>
            )}
          </button>

          <button className="rabby-btn-secondary" onClick={handleDeployEVM} disabled={loading}>
            Deploy Kontrak Baru HTT dari Akun Ini (Butuh Gas Fee)
          </button>
        </div>
      </div>
    </div>
  );
};

