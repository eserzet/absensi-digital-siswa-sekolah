import React, { useState } from 'react';
import { Download, Smartphone, ArrowDownToLine } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';
import { PWAInstallPopupModal } from './PWAInstallPopupModal.js';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'compact' | 'outline';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'primary',
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed as standalone app, hide button
  if (isInstalled) {
    return null;
  }

  const handleAction = async () => {
    // If native 1-click install prompt is supported by browser, trigger immediately!
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const success = await install();
        if (success) {
          return;
        }
      } catch (err) {
        console.error('PWA install error:', err);
      } finally {
        setIsInstalling(false);
      }
    }

    // If native prompt is not available, or user on iOS, or prompt dismissed, open the guide modal
    setShowModal(true);
  };

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={handleAction}
          disabled={isInstalling}
          title={isInstallable ? "Klik untuk langsung pasang App ke Layar HP/PC" : "Panduan Pasang App SMASTIKA"}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
            isInstalling
              ? 'bg-emerald-700 text-white opacity-80'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          } ${className}`}
        >
          {isInstalling ? (
            <ArrowDownToLine className="w-3.5 h-3.5 animate-bounce" />
          ) : (
            <Smartphone className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{isInstalling ? 'Memasang...' : 'Install App'}</span>
          <span className="sm:hidden">{isInstalling ? '...' : 'Install'}</span>
        </button>

        {showModal && (
          <PWAInstallPopupModal
            forceOpen={true}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  if (variant === 'outline') {
    return (
      <>
        <button
          type="button"
          onClick={handleAction}
          disabled={isInstalling}
          className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer active:scale-95 ${className}`}
        >
          {isInstalling ? (
            <>
              <ArrowDownToLine className="w-3.5 h-3.5 animate-bounce" />
              <span>Memasang Aplikasi...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>{isInstallable ? 'Install App SMASTIKA' : 'Panduan Install App'}</span>
            </>
          )}
        </button>

        {showModal && (
          <PWAInstallPopupModal
            forceOpen={true}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleAction}
        disabled={isInstalling}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm shadow-emerald-900/10 active:scale-95 transition-all cursor-pointer ${className}`}
      >
        {isInstalling ? (
          <>
            <ArrowDownToLine className="w-4 h-4 animate-bounce" />
            <span>Memasang Aplikasi...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>{isInstallable ? 'Install App SMASTIKA Sekarang' : 'Panduan Pasang Aplikasi PWA'}</span>
          </>
        )}
      </button>

      {showModal && (
        <PWAInstallPopupModal
          forceOpen={true}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};
