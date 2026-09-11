import React, { useState } from 'react';
import { useSession } from '../context/SessionContext.js';
import { NETWORKS } from '../../config/networks.js';
import { TEST_TOKEN_ABI, TEST_TOKEN_BYTECODE } from '../../contracts/TestTokenArtifact.js';
import { ContractFactory, Contract, JsonRpcProvider, Wallet } from 'ethers';
import { X, Coins, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MintTokenModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { selectedLedger, activeAccount } = useSession();
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string; hash?: string } | null>(null);
  const [deployedContractAddr, setDeployedContractAddr] = useState<string>('');

  if (!isOpen || !activeAccount) return null;

  const currentNetwork = NETWORKS[selectedLedger];

  const handleDeployEVM = async () => {
    if (selectedLedger !== 'ethereum' && selectedLedger !== 'polygon') {
      setStatusMsg({ type: 'error', text: 'Fitur deploy ERC-20 hanya untuk Ethereum Sepolia atau Polygon Amoy.' });
      return;
    }

    if (!activeAccount.privateKey) {
      setStatusMsg({ type: 'error', text: 'Private key tidak ditemukan di sesi memori.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const provider = new JsonRpcProvider(currentNetwork.rpcUrl);
      const wallet = new Wallet(activeAccount.privateKey, provider);
      const factory = new ContractFactory(TEST_TOKEN_ABI, TEST_TOKEN_BYTECODE, wallet);

      const contract = await factory.deploy();
      await contract.waitForDeployment();
      const addr = await contract.getAddress();

      setDeployedContractAddr(addr);
      setStatusMsg({
        type: 'success',
        text: `Kontrak TestToken (TST) berhasil di-deploy di ${currentNetwork.name}! Address: ${addr}`,
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
    if (!activeAccount.privateKey) return;
    setLoading(true);
    setStatusMsg(null);

    try {
      const targetContract = deployedContractAddr || '0x3865296839352c86E8EbFfaA427845f2E0Eea046';
      const provider = new JsonRpcProvider(currentNetwork.rpcUrl);
      const wallet = new Wallet(activeAccount.privateKey, provider);
      const contract = new Contract(targetContract, TEST_TOKEN_ABI, wallet);

      const mintAmount = 1000n * 10n ** 18n; // 1,000 TST
      const tx = await contract.mint(activeAccount.address, mintAmount);
      await tx.wait(1);

      setStatusMsg({
        type: 'success',
        text: `Berhasil mint 1,000 TST ke akun #${activeAccount.index}!`,
        hash: tx.hash,
      });
      onSuccess();
    } catch (err: any) {
      console.error('Mint error:', err);
      setStatusMsg({
        type: 'error',
        text: `Gagal mint: ${err.message || 'Pastikan saldo gas mencukupi.'}`,
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
            <Coins className="rabby-shield-icon" size={22} />
            Mint Test Token (TST)
          </div>
          <button className="rabby-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
          Buat supply token uji <strong>TestToken (TST)</strong> sendiri di jaringan <strong>{currentNetwork.name}</strong> tanpa batas untuk keperluan pengetesan transaksi.
        </p>

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
                <Sparkles size={16} /> Mint 1,000 TST ke Akun Ini
              </>
            )}
          </button>

          {(selectedLedger === 'ethereum' || selectedLedger === 'polygon') && (
            <button className="rabby-btn-secondary" onClick={handleDeployEVM} disabled={loading}>
              Deploy Kontrak Baru TestToken.sol
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
