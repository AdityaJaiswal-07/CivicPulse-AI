import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Bell, Sparkles, ClipboardList, MessageSquare, Clock, CheckCircle2, Check, Inbox } from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore';

export const NotificationDropdown: React.FC = () => {
  const { notifications, markAllRead, markAsRead, unreadCount } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = unreadCount();

  const [isMobile, setIsMobile] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const prevOpenRef = useRef(open);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      setOpen(false);
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (open && isMobile) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open, isMobile]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current && !ref.current.contains(target) &&
        (!portalRef.current || !portalRef.current.contains(target))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (prevOpenRef.current && !open) {
      buttonRef.current?.focus();
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleOpen = () => {
    setOpen(v => !v);
  };

  const getRelativeTime = (isoString: string): string => {
    const now = new Date();
    const date = new Date(isoString);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_issue':
        return (
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-600">
            <ClipboardList className="w-4 h-4" />
          </div>
        );
      case 'ai_completed':
        return (
          <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
        );
      case 'summary_generated':
        return (
          <div className="p-2 rounded-lg bg-teal-50 border border-teal-100 text-teal-600">
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      case 'status_updated':
        return (
          <div className="p-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-600">
            <Clock className="w-4 h-4" />
          </div>
        );
      case 'resolved':
        return (
          <div className="p-2 rounded-lg bg-green-50 border border-green-100 text-green-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-600">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button ref={buttonRef} onClick={handleOpen} className="relative p-1.5 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-danger ring-2 ring-white animate-pulse" />
        )}
      </button>

      {open && (
        isMobile ? (
          createPortal(
            <>
              <div 
                onClick={() => setOpen(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[9998]" 
              />
              <div 
                ref={portalRef}
                className="fixed top-[72px] left-3 right-3 w-auto max-h-[75vh] flex flex-col bg-white rounded-2xl border border-gray-200 shadow-2xl z-[9999] overflow-hidden animate-sheet-enter"
              >
                <style>{`
                  @keyframes sheet-enter {
                    from { transform: translateY(-8px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                  }
                  .animate-sheet-enter {
                    animation: sheet-enter 180ms ease-out forwards;
                    padding-top: env(safe-area-inset-top);
                    padding-bottom: env(safe-area-inset-bottom);
                  }
                `}</style>
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
                  <h4 className="text-sm font-semibold text-gray-900">Notifications Center</h4>
                  {count > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs font-semibold text-primary hover:text-blue-700 hover:underline transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto divide-y divide-gray-50 flex-1 max-h-[calc(75vh-45px)]">
                  {notifications.length === 0 ? (
                    <div className="max-w-md mx-auto rounded-2xl border border-gray-200/60 bg-white shadow-soft p-8 text-center animate-in fade-in duration-300 transition-all duration-200 hover:shadow-hover hover:scale-[1.004] hover:border-gray-200 my-4 select-none">
                      <div className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-50 border border-gray-100 text-gray-400 select-none">
                        <Inbox className="w-6 h-6" />
                      </div>
                      <h5 className="text-sm font-semibold text-gray-900">You're all caught up!</h5>
                      <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
                        There are no new notifications.
                      </p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`relative flex items-start gap-3 min-h-[72px] px-4 py-3.5 hover:bg-indigo-50/10 transition-all duration-200 group ${
                          n.read ? 'opacity-85' : 'bg-blue-50/10'
                        }`}
                      >
                        {!n.read && (
                          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        )}

                        <div className="shrink-0 mt-0.5">
                          {renderNotificationIcon(n.type)}
                        </div>

                        <div className="flex-1 min-w-0 pr-6">
                          <Link
                            to={`/issue/${n.issueId}`}
                            onClick={() => setOpen(false)}
                            className="block select-none"
                          >
                            <h5 className={`text-xs leading-tight text-gray-900 break-words whitespace-normal ${!n.read ? 'font-bold' : 'font-medium'}`}>
                              {n.title}
                            </h5>
                            <p className="text-sm mt-0.5 leading-snug break-words whitespace-normal text-muted-foreground">
                              {n.description}
                            </p>
                          </Link>
                          <span className="text-xs text-gray-400 mt-1.5 block whitespace-nowrap">
                            {getRelativeTime(n.createdAt)}
                          </span>
                        </div>

                        {!n.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(n.id);
                            }}
                            title="Mark as read"
                            className="absolute right-3 top-3.5 p-1 rounded-full text-gray-300 hover:text-primary hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>,
            document.body
          )
        ) : (
          <div className="absolute mt-2 right-0 w-96 max-w-sm left-auto bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
              <h4 className="text-sm font-semibold text-gray-900">Notifications Center</h4>
              {count > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-semibold text-primary hover:text-blue-700 hover:underline transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-50 flex-1">
              {notifications.length === 0 ? (
                <div className="max-w-md mx-auto rounded-2xl border border-gray-200/60 bg-white shadow-soft p-8 text-center animate-in fade-in duration-300 transition-all duration-200 hover:shadow-hover hover:scale-[1.004] hover:border-gray-200 my-4 select-none">
                  <div className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-50 border border-gray-100 text-gray-400 select-none">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <h5 className="text-sm font-semibold text-gray-900">You're all caught up!</h5>
                  <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
                    There are no new notifications.
                  </p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`relative flex items-start gap-3 min-h-[72px] px-4 py-3.5 hover:bg-indigo-50/10 transition-all duration-200 group ${
                      n.read ? 'opacity-85' : 'bg-blue-50/10'
                    }`}
                  >
                    {!n.read && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}

                    <div className="shrink-0 mt-0.5">
                      {renderNotificationIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <Link
                        to={`/issue/${n.issueId}`}
                        onClick={() => setOpen(false)}
                        className="block select-none"
                      >
                        <h5 className={`text-xs leading-tight text-gray-900 break-words whitespace-normal ${!n.read ? 'font-bold' : 'font-medium'}`}>
                          {n.title}
                        </h5>
                        <p className="text-sm mt-0.5 leading-snug break-words whitespace-normal text-muted-foreground">
                          {n.description}
                        </p>
                      </Link>
                      <span className="text-xs text-gray-400 mt-1.5 block whitespace-nowrap">
                        {getRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    {!n.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        title="Mark as read"
                        className="absolute right-3 top-3.5 p-1 rounded-full text-gray-300 hover:text-primary hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
};
