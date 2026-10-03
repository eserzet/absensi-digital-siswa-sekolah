import React from 'react';
import { Home, BookOpen, QrCode, History, User } from 'lucide-react';

export type StudentNavTab = 'home' | 'mapel' | 'riwayat' | 'profile';

interface StudentBottomNavProps {
  activeTab: StudentNavTab;
  onSelectTab?: (tab: StudentNavTab) => void;
  onTabChange?: (tab: StudentNavTab) => void;
  onOpenScan: () => void;
}

export const StudentBottomNav: React.FC<StudentBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onTabChange,
  onOpenScan,
}) => {
  const handleSelect = (tab: StudentNavTab) => {
    if (typeof onSelectTab === 'function') {
      onSelectTab(tab);
    } else if (typeof onTabChange === 'function') {
      onTabChange(tab);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0d1322]/95 backdrop-blur-md border-t-2 border-slate-200 dark:border-slate-800 pb-safe transition-colors shadow-lg">
      {/* Symmetrical 5-tab container for mobile & desktop */}
      <div className="max-w-md md:max-w-lg mx-auto px-4 h-16 flex items-center justify-around relative">
        
        {/* 1. Beranda */}
        <button
          type="button"
          onClick={() => handleSelect('home')}
          className={`flex flex-col items-center justify-center w-14 transition-all cursor-pointer ${
            activeTab === 'home'
              ? 'text-emerald-700 dark:text-emerald-400 font-black'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 transition-transform ${activeTab === 'home' ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[10px] mt-1 tracking-tight ${activeTab === 'home' ? 'font-black' : 'font-semibold'}`}>
            Beranda
          </span>
        </button>

        {/* 2. Mapel */}
        <button
          type="button"
          onClick={() => handleSelect('mapel')}
          className={`flex flex-col items-center justify-center w-14 transition-all cursor-pointer ${
            activeTab === 'mapel'
              ? 'text-emerald-700 dark:text-emerald-400 font-black'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className={`w-5 h-5 transition-transform ${activeTab === 'mapel' ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[10px] mt-1 tracking-tight ${activeTab === 'mapel' ? 'font-black' : 'font-semibold'}`}>
            Mapel
          </span>
        </button>

        {/* 3. Scan QR (Center Floating Action Button) */}
        <div className="relative -top-5 flex flex-col items-center shrink-0">
          <button
            type="button"
            onClick={onOpenScan}
            aria-label="Scan Presensi"
            className="w-14 h-14 shrink-0 aspect-square rounded-full !rounded-full bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white shadow-lg shadow-emerald-600/35 flex items-center justify-center border-4 border-white dark:border-[#0d1322] active:scale-95 transition-all group hover:shadow-emerald-600/50 cursor-pointer"
          >
            <div className="relative flex items-center justify-center">
              <QrCode className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="absolute -inset-1 rounded-full border border-white/40 animate-ping opacity-25 pointer-events-none" />
            </div>
          </button>
          <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 mt-1 tracking-wider uppercase">
            Scan
          </span>
        </div>

        {/* 4. Riwayat */}
        <button
          type="button"
          onClick={() => handleSelect('riwayat')}
          className={`flex flex-col items-center justify-center w-14 transition-all cursor-pointer ${
            activeTab === 'riwayat'
              ? 'text-emerald-700 dark:text-emerald-400 font-black'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <History className={`w-5 h-5 transition-transform ${activeTab === 'riwayat' ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[10px] mt-1 tracking-tight ${activeTab === 'riwayat' ? 'font-black' : 'font-semibold'}`}>
            Riwayat
          </span>
        </button>

        {/* 5. Profil */}
        <button
          type="button"
          onClick={() => handleSelect('profile')}
          className={`flex flex-col items-center justify-center w-14 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'text-emerald-700 dark:text-emerald-400 font-black'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <User className={`w-5 h-5 transition-transform ${activeTab === 'profile' ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[10px] mt-1 tracking-tight ${activeTab === 'profile' ? 'font-black' : 'font-semibold'}`}>
            Profil
          </span>
        </button>

      </div>
    </nav>
  );
};
