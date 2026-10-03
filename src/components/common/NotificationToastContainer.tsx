import React from 'react';
import { useNotification, AppNotification, NotificationType } from '../../context/NotificationContext.js';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Megaphone, 
  Info, 
  X 
} from 'lucide-react';

export const NotificationToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 pointer-events-none space-y-2.5 max-h-screen overflow-hidden"
    >
      {notifications.map((notif) => (
        <ToastItem
          key={notif.id}
          notification={notif}
          onClose={() => removeNotification(notif.id)}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  notification: AppNotification;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ notification, onClose }) => {
  const getIconAndStyle = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle2,
          iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
          borderColor: 'border-emerald-200 dark:border-emerald-800/80',
          badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
          barColor: 'bg-emerald-500',
        };
      case 'announcement':
        return {
          icon: Megaphone,
          iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
          borderColor: 'border-amber-200 dark:border-amber-800/80',
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
          barColor: 'bg-amber-500',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
          borderColor: 'border-rose-200 dark:border-rose-800/80',
          badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
          barColor: 'bg-rose-500',
        };
      case 'info':
      default:
        return {
          icon: Bell,
          iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
          borderColor: 'border-blue-200 dark:border-blue-800/80',
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
          barColor: 'bg-blue-500',
        };
    }
  };

  const config = getIconAndStyle(notification.type);
  const Icon = config.icon;

  const handleClick = () => {
    if (notification.onClick) {
      notification.onClick();
      onClose();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`pointer-events-auto w-full bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md rounded-2xl border ${config.borderColor} shadow-lg p-3.5 transition-all duration-300 relative overflow-hidden flex items-start gap-3 animate-in fade-in slide-in-from-top-4 ${
        notification.onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      }`}
    >
      <div className={`p-2 rounded-xl shrink-0 ${config.iconBg}`}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug truncate">
          {notification.title}
        </h4>
        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        title="Tutup notifikasi"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Auto-dismiss progress bar animation */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full ${config.barColor} transition-all ease-linear`}
          style={{
            animation: 'toastProgress 5s linear forwards',
          }}
        />
      </div>
    </div>
  );
};
