import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import type { HubConnection } from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { ChatContext } from '../hooks/useChat';
import type { ChatContextType, MessageHandler } from '../hooks/useChat';
import { API_BASE_URL, messageAPI } from '../services/api';
import type { Message } from '../services/api';

// Hub lives at the API origin, not under /api
const HUB_URL = `${API_BASE_URL.replace(/\/+$/, '').replace(/\/api$/i, '')}/chathub`;

// Retry delays for the initial connection (withAutomaticReconnect only covers drops after a successful start)
const START_RETRY_DELAYS_MS = [2000, 5000, 10000, 30000, 60000];
const MAX_TRACKED_IDS = 500;

const rememberId = (set: Set<number>, id: number) => {
  set.add(id);
  if (set.size > MAX_TRACKED_IDS) {
    const oldest = set.values().next().value;
    if (oldest !== undefined) set.delete(oldest);
  }
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isGuest } = useAuth();
  const enabled = isAuthenticated && !isGuest && !!user;
  const userId = enabled ? user?.id ?? null : null;

  const [unreadCountState, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);

  const connectionRef = useRef<HubConnection | null>(null);
  const handlersRef = useRef(new Set<MessageHandler>());
  const dispatchedIdsRef = useRef(new Set<number>());
  const countedIdsRef = useRef(new Set<number>());
  const joinedRef = useRef(new Set<number>());
  const activeConversationRef = useRef<number | null>(null);
  const userIdRef = useRef<string | null>(userId);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const refreshUnread = useCallback(async () => {
    if (!userIdRef.current) return;
    try {
      const count = await messageAPI.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.warn('[chat] unread count could not be loaded', err);
    }
  }, []);

  const invokeGroup = useCallback((method: 'JoinOfferConversation' | 'LeaveOfferConversation', offerId: number) => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== HubConnectionState.Connected) return;
    connection.invoke(method, String(offerId)).catch((err) => {
      console.warn(`[chat] ${method} failed`, err);
    });
  }, []);

  const joinConversation = useCallback((offerId: number) => {
    joinedRef.current.add(offerId);
    invokeGroup('JoinOfferConversation', offerId);
  }, [invokeGroup]);

  const leaveConversation = useCallback((offerId: number) => {
    joinedRef.current.delete(offerId);
    invokeGroup('LeaveOfferConversation', offerId);
  }, [invokeGroup]);

  const setActiveConversation = useCallback((offerId: number | null) => {
    activeConversationRef.current = offerId;
  }, []);

  const subscribe = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  // Connection lifecycle: one connection per signed-in (non-guest) user
  useEffect(() => {
    if (!userId) return;

    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    const dispatchedIds = dispatchedIdsRef.current;
    const countedIds = countedIdsRef.current;
    const joined = joinedRef.current;

    const dispatch = (message: Message) => {
      if (!message || typeof message.id !== 'number') return;
      if (dispatchedIds.has(message.id)) return;
      rememberId(dispatchedIds, message.id);
      handlersRef.current.forEach((handler) => {
        try {
          handler(message);
        } catch (err) {
          console.warn('[chat] message handler failed', err);
        }
      });
    };

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => localStorage.getItem('authToken') ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();
    connectionRef.current = connection;

    connection.on('ReceiveMessage', (message: Message) => dispatch(message));
    connection.on('NewMessage', (message: Message) => {
      if (message && typeof message.id === 'number' && !countedIds.has(message.id)) {
        rememberId(countedIds, message.id);
        const isMine = message.senderId === userIdRef.current;
        if (!isMine && message.offerId !== activeConversationRef.current) {
          setUnreadCount((count) => count + 1);
        }
      }
      dispatch(message);
    });
    // Read state is not shown in the UI; keep the badge in sync if another tab/device reads
    connection.on('ConversationRead', () => {
      void refreshUnread();
    });

    const rejoinAll = () => {
      joined.forEach((offerId) => invokeGroup('JoinOfferConversation', offerId));
    };

    connection.onreconnecting(() => setConnected(false));
    connection.onreconnected(() => {
      setConnected(true);
      rejoinAll();
      void refreshUnread();
    });

    const start = async () => {
      if (disposed) return;
      try {
        await connection.start();
        if (disposed) return;
        attempt = 0;
        setConnected(true);
        rejoinAll();
      } catch (err) {
        if (disposed) return;
        const delay = START_RETRY_DELAYS_MS[Math.min(attempt, START_RETRY_DELAYS_MS.length - 1)];
        attempt += 1;
        console.warn(`[chat] real-time connection failed, retrying in ${delay / 1000}s`, err);
        retryTimer = setTimeout(start, delay);
      }
    };

    // Automatic reconnect gave up: fall back to periodic start attempts
    connection.onclose(() => {
      setConnected(false);
      if (disposed) return;
      retryTimer = setTimeout(start, START_RETRY_DELAYS_MS[START_RETRY_DELAYS_MS.length - 1]);
    });

    messageAPI.getUnreadCount()
      .then((count) => {
        if (!disposed) setUnreadCount(count);
      })
      .catch((err) => console.warn('[chat] unread count could not be loaded', err));
    void start();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      connectionRef.current = null;
      joined.clear();
      dispatchedIds.clear();
      countedIds.clear();
      setConnected(false);
      connection.stop().catch(() => undefined);
    };
  }, [userId, refreshUnread, invokeGroup]);

  const unreadCount = userId ? unreadCountState : 0;
  const isConnected = !!userId && connected;

  const value = useMemo<ChatContextType>(() => ({
    unreadCount,
    refreshUnread,
    subscribe,
    joinConversation,
    leaveConversation,
    setActiveConversation,
    isConnected,
  }), [unreadCount, refreshUnread, subscribe, joinConversation, leaveConversation, setActiveConversation, isConnected]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatProvider;
