import { createContext, useContext } from 'react';
import type { Message } from '../services/api';

export type MessageHandler = (message: Message) => void;

export interface ChatContextType {
  /** Total unread message count for the current user (0 for guests / signed-out users). */
  unreadCount: number;
  /** Re-fetch the unread count from the API. */
  refreshUnread: () => Promise<void>;
  /** Listen to incoming messages (ReceiveMessage + NewMessage, de-duplicated by id). Returns an unsubscribe function. */
  subscribe: (handler: MessageHandler) => () => void;
  /** Join the SignalR group of an offer conversation (re-joined automatically after reconnect). */
  joinConversation: (offerId: number) => void;
  leaveConversation: (offerId: number) => void;
  /** The conversation currently on screen; NewMessage events for it do not increase the unread badge. */
  setActiveConversation: (offerId: number | null) => void;
  /** True while the real-time connection is up. When false the app works via REST only. */
  isConnected: boolean;
  /** Increments after every reconnect / recovered start; open views should refetch when it changes (messages may have been missed). */
  reconnectCount: number;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
