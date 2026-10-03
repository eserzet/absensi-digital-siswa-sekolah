import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-2xl bg-amber-500/95 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-slate-950 shadow-lg border border-amber-400/50 animate-in fade-in">
      <span className="h-2 w-2 rounded-full bg-slate-950 animate-pulse" />
      <WifiOff className="w-4 h-4 text-slate-950" />
      <span>Mode Offline — Aplikasi berjalan dengan data tersimpan di cache</span>
    </div>
  );
};
