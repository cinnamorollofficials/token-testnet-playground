import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxHeight?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  maxHeight,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="rabby-sheet-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="rabby-sheet-card"
        onClick={(e) => e.stopPropagation()}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {/* Drag / Pull Handle */}
        <div className="rabby-sheet-handle-bar">
          <div className="rabby-sheet-handle" />
        </div>

        {/* Header */}
        <div className="rabby-sheet-header">
          <div className="rabby-sheet-title">
            {icon && <span className="rabby-sheet-title-icon">{icon}</span>}
            <span>{title}</span>
          </div>
          <button
            type="button"
            className="rabby-close-btn"
            onClick={onClose}
            title="Tutup"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sheet Content Body */}
        <div className="rabby-sheet-body">{children}</div>
      </div>
    </div>
  );
};
