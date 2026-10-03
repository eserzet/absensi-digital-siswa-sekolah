import React from 'react';
import { X, Bell, Calendar, AlertCircle, CheckCircle2, CheckCheck, Megaphone } from 'lucide-react';
import { Announcement } from '../../types.js';

interface StudentAnnouncementsModalProps {
  isOpen: boolean;
  announcements?: Announcement[];
  onClose: () => void;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
}

export const StudentAnnouncementsModal: React.FC<StudentAnnouncementsModalProps> = ({
  isOpen,
  announcements = [],
  onClose,
  onMarkRead,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;
  const list = Array.isArray(announcements) ? announcements : [];
  const unreadCount = list.filter((a) => !a.is_read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-emerald-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl">
              <Bell className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white">Pengumuman Sekolah</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                    {unreadCount} Baru
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-200">Informasi & Surat Edaran Resmi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5">
          {list.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Megaphone className="w-12 h-12 mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="text-sm font-medium">Belum ada pengumuman baru dari pihak sekolah.</p>
            </div>
          ) : (
            list.map((item) => {
              const isRead = Boolean(item.is_read);
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl transition-all border ${
                    isRead
                      ? 'bg-slate-50/80 border-slate-200/70 text-slate-700'
                      : 'bg-emerald-50/40 border-emerald-200 shadow-2xs ring-1 ring-emerald-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(item.priority === 'important' || (item.priority as string) === 'penting') && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          <AlertCircle className="w-3 h-3" /> PENTING
                        </span>
                      )}
                      {!isRead && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white animate-pulse">
                          BARU
                        </span>
                      )}
                      <h3 className={`font-bold text-sm leading-snug ${isRead ? 'text-slate-800' : 'text-emerald-950 font-black'}`}>
                        {item.title}
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line mb-3.5">
                    {item.content}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    {isRead ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Telah dibaca</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onMarkRead?.(item.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 px-3 py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:text-white" />
                        <span>Tandai Sudah Dibaca</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {unreadCount > 0 && onMarkAllRead ? (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <CheckCheck className="w-4 h-4 text-emerald-700" />
              <span>Tandai Semua Dibaca ({unreadCount})</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Semua pengumuman telah dibaca
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
