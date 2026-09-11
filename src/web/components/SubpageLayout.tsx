import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface SubpageLayoutProps {
  title: React.ReactNode;
  onBack: () => void;
  backLabel?: string;
  icon?: React.ReactNode;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SubpageLayout: React.FC<SubpageLayoutProps> = ({
  title,
  onBack,
  backLabel = 'Kembali',
  icon,
  rightAction,
  children,
  className = '',
}) => {
  return (
    <div className={`rabby-subpage ${className}`}>
      {/* Sticky Top Header Navigation */}
      <div className="rabby-subpage-header">
        <button
          type="button"
          className="rabby-subpage-back-btn"
          onClick={onBack}
          title={backLabel}
        >
          <ArrowLeft size={16} />
          <span>{backLabel}</span>
        </button>

        <div className="rabby-subpage-title">
          {icon && <span className="rabby-subpage-title-icon">{icon}</span>}
          <span>{title}</span>
        </div>

        <div className="rabby-subpage-right-slot">
          {rightAction || <div style={{ width: 48 }} />}
        </div>
      </div>

      {/* Subpage Scrollable Content */}
      <div className="rabby-subpage-body">{children}</div>
    </div>
  );
};
