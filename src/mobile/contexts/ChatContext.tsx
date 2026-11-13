import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { API_BASE_URL, Message, messageAPI } from '../services/api';
import secureStorageService from '../services/secureStorageService';

export type MessageHandler = (message: Message) => void;

interface ChatContextType {
  /** Total unread messages for the current user (0 for guests / logged-out users). */
  unreadCount: number;
  /** Re-fetch the unread count from the API. */
  refreshUnread: () => Promise<void>;
  /** Receive every incoming message once (ReceiveMessage + NewMessage, de-duplicated by id). */
  subscribe: (handler: MessageHandler) => () => void;
  /** Join the SignalR group of an offer (kept across reconnects until left). */
  joinConversation: (offerId: number) => void;
  leaveConversation: (offerId: number) => void;
  /** Messages for the active conversation do not bump the unread badge. */
  setActiveConversation: (offerId: number | null) => void;
  /** True when the hub is connected; REST keeps working when it is not. */
  isConnected: boolean;
}

const noop = () => {};

const ChatContext = createContext<ChatContextType>({
  unreadCount: 0,
  refreshUnread: async () => {},
  subscribe: () => noop,
  joinConversation: noop,
  leaveConversation: noop,
  setActiveConversation: noop,
  isConnected: false,
});

const HUB_URL = API_BASE_URL.replace(/\/api\/?$/, '') + '/chathub';
const MAX_SEEN_IDS = 500;
const RESTART_DELAY_MS = 15000;

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isGuest } = useAuth();
  const userId = user?.id;
  const enabled = isAuthenticated && !!userId && !isGuest;

  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const connectionRef = useRef<HubConnection | null>(null);
  const handlersRef = useRef(new Set<MessageHandler>());
  const seenIdsRef = useRef(new Set<number>());
  const joinedRef = useRef(new Set<number>());
  const activeOfferIdRef = useRef<number | null>(null);
  const userIdRef = useRef<string | undefined>(userId);
  const enabledRef = useRef(enabled);

  userIdRef.current = userId;
  enabledRef.current = enabled;

  const refreshUnread = useCallback(async () => {
    if (!enabledRef.current) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await messageAPI.getUnreadCount();
      if (enabledRef.current) setUnreadCount(count);
    } catch (error) {
      console.warn('Unread count could not be loaded:', error);
    }
  }, []);

  const dispatch = useCallback((message: Message) => {
    if (!message || typeof message.id !== 'number') return;

    const seen = seenIdsRef.current;
    if (seen.has(message.id)) return;
    seen.add(message.id);
    if (seen.size > MAX_SEEN_IDS) {
      const oldest = seen.values().next().value;
      if (oldest !== undefined) seen.delete(oldest);
    }

    const isMine = message.senderId === userIdRef.current;
    if (!isMine && message.offerId !== activeOfferIdRef.current) {
      setUnreadCount(c => c + 1);
    }

    handlersRef.current.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.warn('Chat message handler failed:', error);
      }
    });
  }, []);

  const invokeGroup = useCallback(
    (method: 'JoinOfferConversation' | 'LeaveOfferConversation', offerId: number) => {
      const connection = connectionRef.current;
      if (connection?.state !== HubConnectionState.Connected) return;
      connection.invoke(method, String(offerId)).catch(error => {
        console.warn(`${method} failed:`, error);
      });
    },
    []
  );

  const rejoinAll = useCallback(() => {
    joinedRef.current.forEach(offerId => invokeGroup('JoinOfferConversation', offerId));
  }, [invokeGroup]);

  // Build / tear down the hub connection with the signed-in (non-guest) user.
  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0);
      setIsConnected(false);
      return;
    }

    const seenIds = seenIdsRef.current;
    let disposed = false;
    let restartTimer: ReturnType<typeof setTimeout> | null = null;

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: async () => (await secureStorageService.getAuthTokens()).accessToken ?? '',
        // React Native: go straight to WebSockets (token goes as ?access_token).
        ...(Platform.OS !== 'web'
          ? { transport: HttpTransportType.WebSockets, skipNegotiation: true }
          : {}),
      })
      .withAutomaticReconnect()
      .configureLogging(__DEV__ ? LogLevel.Warning : LogLevel.None)
      .build();

    connectionRef.current = connection;

    connection.on('ReceiveMessage', dispatch);
    connection.on('NewMessage', dispatch);
    connection.on('ConversationRead', (payload: { readBy?: string } | undefined) => {
      // Read on another device of this user: sync the badge.
      if (payload?.readBy === userIdRef.current) refreshUnread();
    });
    connection.on('MessageRead', noop);

    connection.onreconnecting(() => setIsConnected(false));
    connection.onreconnected(() => {
      setIsConnected(true);
      rejoinAll();
      refreshUnread();
    });

    const start = async () => {
      if (disposed || connection.state !== HubConnectionState.Disconnected) return;
      try {
        await connection.start();
        if (disposed) return;
        setIsConnected(true);
        rejoinAll();
      } catch (error) {
        if (disposed) return;
        console.warn('Chat hub connection failed, using REST only:', error);
        scheduleRestart();
      }
    };

    const scheduleRestart = () => {
      if (disposed || restartTimer) return;
      restartTimer = setTimeout(() => {
        restartTimer = null;
        start();
      }, RESTART_DELAY_MS);
    };

    // Automatic reconnect gives up after a few attempts; keep trying in the background.
    connection.onclose(() => {
      setIsConnected(false);
      scheduleRestart();
    });

    start();
    refreshUnread();

    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return;
      // No push notifications: catch up when the app comes back to the foreground.
      refreshUnread();
      start();
    });

    return () => {
      disposed = true;
      if (restartTimer) clearTimeout(restartTimer);
      appStateSub.remove();
      connectionRef.current = null;
      seenIds.clear();
      setIsConnected(false);
      connection.stop().catch(noop);
    };
  }, [enabled, userId, dispatch, refreshUnread, rejoinAll]);

  const subscribe = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const joinConversation = useCallback(
    (offerId: number) => {
      joinedRef.current.add(offerId);
      invokeGroup('JoinOfferConversation', offerId);
    },
    [invokeGroup]
  );

  const leaveConversation = useCallback(
    (offerId: number) => {
      joinedRef.current.delete(offerId);
      invokeGroup('LeaveOfferConversation', offerId);
    },
    [invokeGroup]
  );

  const setActiveConversation = useCallback((offerId: number | null) => {
    activeOfferIdRef.current = offerId;
  }, []);

  const value = useMemo<ChatContextType>(
    () => ({
      unreadCount,
      refreshUnread,
      subscribe,
      joinConversation,
      leaveConversation,
      setActiveConversation,
      isConnected,
    }),
    [unreadCount, refreshUnread, subscribe, joinConversation, leaveConversation, setActiveConversation, isConnected]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => useContext(ChatContext);

export default ChatContext;
