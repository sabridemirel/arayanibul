import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  EllipsisVerticalIcon,
  FlagIcon,
  LockClosedIcon,
  NoSymbolIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../hooks/useChat';
import { messageAPI, offerAPI } from '../services/api';
import type { Conversation, Message, Offer } from '../services/api';
import { Badge, Button, ErrorMessage, Loading, Modal, Toast } from '../components/ui';
import { Header, Footer } from '../components/layout';
import ReportModal from '../components/ReportModal';
import { blockAPI } from '../services/moderation';
import type { ReportTargetType } from '../services/moderation';
import { useToast } from '../hooks/useToast';

const MAX_MESSAGE_LENGTH = 1000;
const CLOSED_OFFER_TEXT = 'Bu teklif kapandığı için yeni mesaj gönderilemez.';

type OfferStatus = Offer['status'];

// ---------- helpers ----------

// Backend timestamps are UTC; treat values without an offset as UTC
const parseDate = (value: string): Date => {
  if (!value) return new Date(NaN);
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatRelative = (value: string): string => {
  const date = parseDate(value);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return 'Şimdi';
  if (diffMin < 60) return `${diffMin} dk`;
  if (isSameDay(date, now)) return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Dün';
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
};

const formatTime = (value: string) => {
  const date = parseDate(value);
  return isNaN(date.getTime()) ? '' : date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

const formatDayLabel = (date: Date): string => {
  const now = new Date();
  if (isSameDay(date, now)) return 'Bugün';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Dün';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const initials = (name?: string) => {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((p) => p.charAt(0).toLocaleUpperCase('tr-TR')).join('');
};

const isClosedStatus = (status?: OfferStatus) => status === 'Rejected' || status === 'Withdrawn';

const statusBadge = (status?: OfferStatus) => {
  switch (status) {
    case 'Pending':
      return <Badge variant="warning">Beklemede</Badge>;
    case 'Accepted':
      return <Badge variant="success">Kabul Edildi</Badge>;
    case 'Rejected':
      return <Badge variant="error">Reddedildi</Badge>;
    case 'Withdrawn':
      return <Badge variant="default">Geri Çekildi</Badge>;
    default:
      return null;
  }
};

// Insert or replace by id, keep ascending order by createdAt
const mergeMessage = (list: Message[], message: Message): Message[] => {
  const index = list.findIndex((m) => m.id === message.id);
  if (index >= 0) {
    const next = [...list];
    next[index] = { ...list[index], ...message };
    return next;
  }
  const next = [...list, message];
  next.sort((a, b) => parseDate(a.createdAt).getTime() - parseDate(b.createdAt).getTime() || a.id - b.id);
  return next;
};

const getErrorStatus = (err: unknown) => (err as { response?: { status?: number } })?.response?.status;

const getErrorText = (err: unknown): string | undefined => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object' && typeof (data as { message?: unknown }).message === 'string') {
    return (data as { message: string }).message;
  }
  return undefined;
};

const Avatar: React.FC<{ name?: string; size?: 'sm' | 'md' }> = ({ name, size = 'md' }) => (
  <div
    className={`flex-shrink-0 rounded-full bg-primary-light text-primary font-semibold flex items-center justify-center ${
      size === 'sm' ? 'w-9 h-9 text-sm' : 'w-11 h-11'
    }`}
    aria-hidden="true"
  >
    {initials(name)}
  </div>
);

// ---------- conversation list ----------

interface ConversationListProps {
  conversations: Conversation[];
  activeOfferId: number | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  currentUserId?: string;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeOfferId,
  loading,
  error,
  onRetry,
  currentUserId,
}) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <Loading text="Konuşmalar yükleniyor..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-3">
        <ErrorMessage message={error} />
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tekrar Dene
        </Button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
        <ChatBubbleLeftRightIcon className="h-12 w-12 text-text-secondary mb-3" />
        <p className="font-medium text-text mb-1">Henüz mesajınız yok</p>
        <p className="text-sm text-text-secondary">
          Bir teklif üzerinden mesajlaşmaya başladığınızda konuşmalarınız burada görünür.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto divide-y divide-border">
      {conversations.map((conversation) => {
        const isActive = conversation.offerId === activeOfferId;
        const last = conversation.lastMessage;
        const lastIsMine = !!last && last.senderId === currentUserId;
        const unread = isActive ? 0 : conversation.unreadCount;
        return (
          <li key={conversation.offerId}>
            <Link
              to={`/messages/${conversation.offerId}`}
              className={`flex gap-3 px-4 py-3 transition-colors border-l-4 ${
                isActive
                  ? 'bg-primary-light border-primary'
                  : 'border-transparent hover:bg-background'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Avatar name={conversation.otherUserName} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`truncate text-text ${unread > 0 ? 'font-bold' : 'font-semibold'}`}>
                    {conversation.otherUserName || 'Kullanıcı'}
                  </p>
                  <span className="flex-shrink-0 text-xs text-text-secondary">
                    {formatRelative(conversation.lastActivity || last?.createdAt || '')}
                  </span>
                </div>
                <p className="truncate text-xs text-primary font-medium">{conversation.needTitle}</p>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className={`truncate text-sm ${unread > 0 ? 'text-text font-medium' : 'text-text-secondary'}`}>
                    {last ? `${lastIsMine ? 'Siz: ' : ''}${last.content}` : 'Henüz mesaj yok'}
                  </p>
                  {unread > 0 && (
                    <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-xs font-semibold">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

// ---------- chat pane ----------

interface ChatPaneProps {
  offerId: number;
  conversation?: Conversation;
  conversationsLoaded: boolean;
  onMessageSent: (message: Message) => void;
  onRead: (offerId: number) => void;
}

const ChatPane: React.FC<ChatPaneProps> = ({
  offerId,
  conversation,
  conversationsLoaded,
  onMessageSent,
  onRead,
}) => {
  const { user } = useAuth();
  const { subscribe, joinConversation, leaveConversation, setActiveConversation, refreshUnread, reconnectCount } =
    useChat();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [closedByServer, setClosedByServer] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Moderation: block state, server-side refusal (e.g. the other party blocked us), report target
  const [isBlocked, setIsBlocked] = useState(false);
  const [forbiddenText, setForbiddenText] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: ReportTargetType; id: string | number } | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);

  const markRead = useCallback(async () => {
    try {
      await messageAPI.markConversationRead(offerId);
      onReadRef.current(offerId);
      await refreshUnread();
    } catch (err) {
      console.warn('[chat] mark-conversation-read failed', err);
    }
  }, [offerId, refreshUnread]);

  // Real-time group membership + active conversation (suppresses unread badge increments)
  useEffect(() => {
    setActiveConversation(offerId);
    joinConversation(offerId);
    return () => {
      leaveConversation(offerId);
      setActiveConversation(null);
    };
  }, [offerId, joinConversation, leaveConversation, setActiveConversation]);

  // Load history, then mark as read
  useEffect(() => {
    let cancelled = false;
    messageAPI
      .getConversation(offerId)
      .then((data) => {
        if (cancelled) return;
        setMessages((current) => data.reduce(mergeMessage, current));
        setLoadError(null);
        setLoading(false);
        void markRead();
      })
      .catch((err) => {
        if (cancelled) return;
        const status = getErrorStatus(err);
        setLoadError(
          status === 403 || status === 404
            ? 'Bu konuşma bulunamadı ya da görüntüleme yetkiniz yok.'
            : 'Mesajlar yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.',
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [offerId, markRead, reloadKey]);

  // Hub came back: messages may have been missed while it was down, merge a fresh snapshot
  const lastReconnectRef = useRef(reconnectCount);
  useEffect(() => {
    if (reconnectCount === lastReconnectRef.current) return;
    lastReconnectRef.current = reconnectCount;
    let cancelled = false;
    messageAPI
      .getConversation(offerId)
      .then((data) => {
        if (cancelled) return;
        setMessages((current) => data.reduce(mergeMessage, current));
        void markRead();
      })
      .catch((err) => console.warn('[chat] conversation resync failed', err));
    return () => {
      cancelled = true;
    };
  }, [reconnectCount, offerId, markRead]);

  // New thread (not in the list yet): fetch the offer for title/status
  const needOffer = conversationsLoaded && !conversation;
  useEffect(() => {
    if (!needOffer) return;
    let cancelled = false;
    offerAPI
      .getOfferById(offerId)
      .then((data) => {
        if (!cancelled) setOffer(data);
      })
      .catch((err) => {
        if (cancelled) return;
        const status = getErrorStatus(err);
        setOfferError(
          status === 403 || status === 404
            ? 'Teklif bulunamadı ya da bu teklife erişim yetkiniz yok.'
            : 'Teklif bilgileri yüklenemedi.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [needOffer, offerId]);

  // Incoming real-time messages for this conversation
  useEffect(() => {
    return subscribe((message) => {
      if (message.offerId !== offerId) return;
      setMessages((current) => mergeMessage(current, message));
      if (message.senderId !== user?.id) {
        void markRead();
      }
    });
  }, [subscribe, offerId, user?.id, markRead]);

  // Keep the view pinned to the newest message
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  // Header data: prefer the conversation summary, fall back to the offer / messages
  const needTitle = conversation?.needTitle || offer?.need?.title || '';
  const needId = conversation?.needId || offer?.needId || offer?.need?.id;
  const otherName = useMemo(() => {
    if (conversation?.otherUserName) return conversation.otherUserName;
    const fromMessages = messages.find((m) => m.senderId !== user?.id)?.senderName;
    if (fromMessages) return fromMessages;
    if (offer && offer.providerId !== user?.id && offer.provider) {
      return `${offer.provider.firstName} ${offer.provider.lastName}`.trim();
    }
    return '';
  }, [conversation, messages, offer, user?.id]);
  const otherUserId = useMemo(() => {
    if (conversation?.otherUserId) return conversation.otherUserId;
    const fromMessages = messages.find((m) => m.senderId !== user?.id)?.senderId;
    if (fromMessages) return fromMessages;
    if (offer) return offer.providerId !== user?.id ? offer.providerId : offer.need?.userId;
    return undefined;
  }, [conversation, messages, offer, user?.id]);
  const status: OfferStatus | undefined = conversation?.offerStatus || offer?.status;
  const isClosed = closedByServer || isClosedStatus(status);

  // Is the other party on my block list?
  useEffect(() => {
    if (!otherUserId) return;
    let cancelled = false;
    blockAPI
      .list()
      .then((list) => {
        if (!cancelled) setIsBlocked(list.some((b) => b.userId === otherUserId));
      })
      .catch((err) => console.warn('[chat] blocked list failed', err));
    return () => {
      cancelled = true;
    };
  }, [otherUserId]);

  // Close the header menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleToggleBlock = async () => {
    if (!otherUserId) return;
    setBlockBusy(true);
    setBlockError(null);
    try {
      if (isBlocked) {
        await blockAPI.unblock(otherUserId);
        setIsBlocked(false);
        setForbiddenText(null);
        showToast('Engel kaldırıldı.');
      } else {
        await blockAPI.block(otherUserId);
        setIsBlocked(true);
        showToast('Kullanıcı engellendi.');
      }
      setBlockDialogOpen(false);
    } catch (err) {
      setBlockError(
        getErrorText(err) ||
          (isBlocked
            ? 'Engel kaldırılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
            : 'Kullanıcı engellenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'),
      );
    } finally {
      setBlockBusy(false);
    }
  };

  const trimmed = draft.trim();
  const canSend = !isClosed && !sending && trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setSendError(null);
    try {
      const sent = await messageAPI.sendMessage({ offerId, content: trimmed, type: 'Text' });
      setMessages((current) => mergeMessage(current, sent));
      setDraft('');
      onMessageSent(sent);
    } catch (err) {
      const serverText = getErrorText(err);
      const errorStatus = getErrorStatus(err);
      if (errorStatus === 400 && serverText === CLOSED_OFFER_TEXT) {
        setClosedByServer(true);
      } else if (errorStatus === 403) {
        // Blocked (by either side) or not allowed to message: lock the composer with the server's reason
        setForbiddenText(serverText || 'Bu kullanıcıya mesaj gönderemezsiniz.');
      } else {
        setSendError('Mesajınız gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
      }
    } finally {
      setSending(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSend();
    }
  };

  const renderMessages = () => {
    if (loading) {
      return (
        <div className="h-full flex items-center justify-center">
          <Loading text="Mesajlar yükleniyor..." />
        </div>
      );
    }
    if (loadError) {
      return (
        <div className="p-4 space-y-3">
          <ErrorMessage message={loadError} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              setLoadError(null);
              setReloadKey((k) => k + 1);
            }}
          >
            Tekrar Dene
          </Button>
        </div>
      );
    }
    if (messages.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center px-6">
          <ChatBubbleLeftRightIcon className="h-12 w-12 text-text-secondary mb-3" />
          <p className="text-text-secondary">
            {isClosed ? 'Bu konuşmada mesaj yok.' : 'Henüz mesaj yok. İlk mesajı siz gönderin.'}
          </p>
        </div>
      );
    }

    let previousDay: Date | null = null;
    return (
      <div className="px-4 py-4 space-y-2">
        {messages.map((message) => {
          const mine = message.senderId === user?.id;
          const date = parseDate(message.createdAt);
          const showDay = !isNaN(date.getTime()) && (!previousDay || !isSameDay(previousDay, date));
          if (!isNaN(date.getTime())) previousDay = date;
          return (
            <React.Fragment key={message.id}>
              {showDay && (
                <div className="flex justify-center py-2">
                  <span className="text-xs text-text-secondary bg-surface border border-border rounded-full px-3 py-0.5">
                    {formatDayLabel(date)}
                  </span>
                </div>
              )}
              <div className={`group flex items-center gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                    mine
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-surface text-text border border-border rounded-bl-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                  <p className={`mt-1 text-[11px] text-right ${mine ? 'text-white/70' : 'text-text-secondary'}`}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
                {!mine && (
                  <button
                    type="button"
                    onClick={() => setReportTarget({ type: 'Message', id: message.id })}
                    className="p-1.5 rounded-full text-text-secondary opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-error hover:bg-surface transition-opacity"
                    aria-label="Mesajı Şikayet Et"
                    title="Mesajı Şikayet Et"
                  >
                    <FlagIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface">
        <Link
          to="/messages"
          className="md:hidden p-1 -ml-1 text-text-secondary hover:text-text"
          aria-label="Konuşmalara Dön"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <Avatar name={otherName || needTitle} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text truncate">
            {needTitle || (offerError ? 'Konuşma' : 'Yükleniyor...')}
          </p>
          {otherName && <p className="text-sm text-text-secondary truncate">{otherName}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {statusBadge(status)}
          {needId ? (
            <Link
              to={`/needs/${needId}`}
              className="hidden sm:inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium"
            >
              İlanı Gör
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </Link>
          ) : null}
          {otherUserId && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-background"
                aria-label="Diğer işlemler"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <EllipsisVerticalIcon className="h-5 w-5" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-border bg-surface shadow-lg py-1 z-20"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setReportTarget({ type: 'User', id: otherUserId });
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-background"
                  >
                    <FlagIcon className="h-4 w-4" />
                    Şikayet Et
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setBlockError(null);
                      setBlockDialogOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-error hover:bg-red-50"
                  >
                    <NoSymbolIcon className="h-4 w-4" />
                    {isBlocked ? 'Engeli Kaldır' : 'Kullanıcıyı Engelle'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {offerError && !conversation && (
        <div className="px-4 pt-3">
          <ErrorMessage message={offerError} />
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto bg-background">
        {renderMessages()}
      </div>

      {/* Composer */}
      {isBlocked ? (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-border bg-surface text-sm text-text-secondary">
          <NoSymbolIcon className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">Bu kullanıcıyı engellediniz.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBlockError(null);
              setBlockDialogOpen(true);
            }}
          >
            Engeli Kaldır
          </Button>
        </div>
      ) : forbiddenText ? (
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-surface text-sm text-text-secondary">
          <LockClosedIcon className="h-5 w-5 flex-shrink-0" />
          <span>{forbiddenText}</span>
        </div>
      ) : isClosed ? (
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-surface text-sm text-text-secondary">
          <LockClosedIcon className="h-5 w-5 flex-shrink-0" />
          <span>{CLOSED_OFFER_TEXT}</span>
        </div>
      ) : (
        <div className="border-t border-border bg-surface px-4 py-3">
          {sendError && (
            <ErrorMessage message={sendError} onDismiss={() => setSendError(null)} className="mb-2" />
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <div className="flex-1">
              <label htmlFor="message-input" className="sr-only">
                Mesajınız
              </label>
              <textarea
                id="message-input"
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Mesajınızı yazın..."
                disabled={sending || loading || !!loadError}
                className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent max-h-40 field-sizing-content disabled:opacity-60"
              />
              {draft.length > MAX_MESSAGE_LENGTH - 100 && (
                <p className="text-xs text-text-secondary text-right">
                  {draft.length}/{MAX_MESSAGE_LENGTH}
                </p>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={!canSend}
              isLoading={sending}
              leftIcon={<PaperAirplaneIcon className="h-4 w-4" />}
            >
              Gönder
            </Button>
          </form>
        </div>
      )}

      <Modal
        isOpen={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        locked={blockBusy}
        title={isBlocked ? 'Engeli Kaldır' : 'Kullanıcıyı Engelle'}
        description={
          isBlocked
            ? `${otherName || 'Bu kullanıcı'} size yeniden mesaj gönderebilecek ve teklif verebilecek.`
            : `${otherName || 'Bu kullanıcı'} size mesaj gönderemeyecek ve ilanlarınıza teklif veremeyecek. Engeli istediğiniz zaman kaldırabilirsiniz.`
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setBlockDialogOpen(false)} disabled={blockBusy}>
              Vazgeç
            </Button>
            <Button variant={isBlocked ? 'primary' : 'danger'} onClick={handleToggleBlock} isLoading={blockBusy}>
              {isBlocked ? 'Engeli Kaldır' : 'Engelle'}
            </Button>
          </>
        }
      >
        {blockError ? <ErrorMessage message={blockError} onDismiss={() => setBlockError(null)} /> : null}
      </Modal>

      {reportTarget && (
        <ReportModal
          isOpen
          onClose={() => setReportTarget(null)}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          onReported={(message) => showToast(message)}
        />
      )}
      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
};

// ---------- page ----------

const MessagesPage: React.FC = () => {
  const { offerId: offerIdParam } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribe, reconnectCount } = useChat();

  const parsedId = offerIdParam ? Number(offerIdParam) : NaN;
  const activeOfferId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeOfferIdRef = useRef(activeOfferId);
  useEffect(() => {
    activeOfferIdRef.current = activeOfferId;
  }, [activeOfferId]);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await messageAPI.getConversations();
      setConversations(data);
      setError(null);
    } catch {
      setError('Konuşmalar yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  // Hub came back: refresh previews / unread counts that may have changed meanwhile
  const lastReconnectRef = useRef(reconnectCount);
  useEffect(() => {
    if (reconnectCount === lastReconnectRef.current) return;
    lastReconnectRef.current = reconnectCount;
    void fetchConversations();
  }, [reconnectCount, fetchConversations]);

  // Invalid id in the URL: back to the list
  useEffect(() => {
    if (offerIdParam && activeOfferId === null) navigate('/messages', { replace: true });
  }, [offerIdParam, activeOfferId, navigate]);

  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Move a conversation to the top with the given message as its preview
  const applyMessage = useCallback((message: Message, countAsUnread: boolean) => {
    setConversations((current) => {
      const index = current.findIndex((c) => c.offerId === message.offerId);
      if (index < 0) return current;
      const existing = current[index];
      const updated: Conversation = {
        ...existing,
        lastMessage: message,
        lastActivity: message.createdAt,
        unreadCount: countAsUnread ? existing.unreadCount + 1 : existing.unreadCount,
      };
      return [updated, ...current.slice(0, index), ...current.slice(index + 1)];
    });
  }, []);

  // Keep the list fresh as messages arrive
  useEffect(() => {
    return subscribe((message) => {
      if (!conversationsRef.current.some((c) => c.offerId === message.offerId)) {
        void fetchConversations();
        return;
      }
      const isMine = message.senderId === user?.id;
      const isActive = message.offerId === activeOfferIdRef.current;
      applyMessage(message, !isMine && !isActive);
    });
  }, [subscribe, user?.id, fetchConversations, applyMessage]);

  // First message of a new thread: reload so the conversation shows up in the list
  const handleMessageSent = useCallback(
    (message: Message) => {
      if (!conversationsRef.current.some((c) => c.offerId === message.offerId)) {
        void fetchConversations();
        return;
      }
      applyMessage(message, false);
    },
    [fetchConversations, applyMessage],
  );

  const handleRead = useCallback((offerId: number) => {
    setConversations((current) =>
      current.map((c) => (c.offerId === offerId && c.unreadCount !== 0 ? { ...c, unreadCount: 0 } : c)),
    );
  }, []);

  const activeConversation = activeOfferId
    ? conversations.find((c) => c.offerId === activeOfferId)
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-6">
          <div className="bg-surface sm:rounded-lg sm:border border-border shadow-sm overflow-hidden h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-7rem)] min-h-[480px] flex">
            {/* Conversation list */}
            <aside
              className={`${activeOfferId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-shrink-0 flex-col border-r border-border min-h-0`}
            >
              <div className="px-4 py-4 border-b border-border">
                <h1 className="text-xl font-bold text-text">Mesajlar</h1>
              </div>
              <ConversationList
                conversations={conversations}
                activeOfferId={activeOfferId}
                loading={loading}
                error={error}
                onRetry={() => {
                  setLoading(true);
                  void fetchConversations();
                }}
                currentUserId={user?.id}
              />
            </aside>

            {/* Chat */}
            <section className={`${activeOfferId ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col min-h-0`}>
              {activeOfferId ? (
                <ChatPane
                  key={activeOfferId}
                  offerId={activeOfferId}
                  conversation={activeConversation}
                  conversationsLoaded={!loading}
                  onMessageSent={handleMessageSent}
                  onRead={handleRead}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-background">
                  <ChatBubbleLeftRightIcon className="h-16 w-16 text-text-secondary mb-4" />
                  <p className="text-lg font-semibold text-text mb-1">Bir konuşma seçin</p>
                  <p className="text-text-secondary max-w-sm">
                    Mesajlarınızı görmek için soldaki listeden bir konuşma seçin.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MessagesPage;
