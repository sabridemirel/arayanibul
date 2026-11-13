import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';

import { Input, Loading, ErrorMessage } from '../components/ui';
import { messageAPI, offerAPI } from '../services/api';
import { Message, Offer } from '../types';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { withMessageAuth } from '../hoc/withAuthPrompt';

type RootStackParamList = {
  Chat: { offerId: number };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

const CLOSED_OFFER_NOTE = 'Bu teklif kapandığı için yeni mesaj gönderilemez.';
const MAX_MESSAGE_LENGTH = 1000;

const OFFER_STATUS_LABELS: Record<string, string> = {
  Pending: 'Beklemede',
  Accepted: 'Kabul Edildi',
  Rejected: 'Reddedildi',
  Withdrawn: 'Geri Çekildi',
};

const isClosedStatus = (status?: string) => status === 'Rejected' || status === 'Withdrawn';

const sortByDate = (list: Message[]) =>
  [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwnMessage }) => (
  <View style={[styles.messageBubble, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
    <Text style={[styles.messageText, { color: isOwnMessage ? colors.surface : colors.text }]}>
      {message.content}
    </Text>
    <Text style={[styles.messageTime, { color: isOwnMessage ? colors.surface : colors.textSecondary }]}>
      {new Date(message.createdAt).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      })}
    </Text>
  </View>
);

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { user } = useAuth();
  const {
    subscribe,
    joinConversation,
    leaveConversation,
    setActiveConversation,
    refreshUnread,
  } = useChat();
  const offerId = Number(route.params.offerId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [closed, setClosed] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const markRead = useCallback(async () => {
    try {
      await messageAPI.markConversationRead(offerId);
    } catch (err) {
      console.warn('Error marking conversation read:', err);
    } finally {
      refreshUnread();
    }
  }, [offerId, refreshUnread]);

  const loadOffer = useCallback(async () => {
    try {
      const data = await offerAPI.getOfferById(offerId);
      setOffer(data);
      setClosed(isClosedStatus(data?.status));
    } catch (err) {
      // Header falls back to a generic title; sending still works via the API's own checks.
      console.warn('Error loading offer:', err);
    }
  }, [offerId]);

  const loadConversation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const conversationMessages = await messageAPI.getConversation(offerId);
      setMessages(sortByDate(conversationMessages));
      markRead();
    } catch (err) {
      setError('Mesajlar yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
      console.error('Error loading conversation:', err);
    } finally {
      setLoading(false);
    }
  }, [offerId, markRead]);

  useEffect(() => {
    loadConversation();
    loadOffer();
  }, [loadConversation, loadOffer]);

  // Real-time: join the offer group and append incoming messages.
  useEffect(() => {
    setActiveConversation(offerId);
    joinConversation(offerId);

    const unsubscribe = subscribe(message => {
      if (Number(message.offerId) !== offerId) return;
      setMessages(prev => (prev.some(m => m.id === message.id) ? prev : [...prev, message]));
      if (message.senderId !== user?.id) {
        markRead();
      }
    });

    return () => {
      unsubscribe();
      leaveConversation(offerId);
      setActiveConversation(null);
      refreshUnread();
    };
  }, [
    offerId,
    user?.id,
    subscribe,
    joinConversation,
    leaveConversation,
    setActiveConversation,
    markRead,
    refreshUnread,
  ]);

  const handleSendText = async () => {
    const content = newMessage.trim();
    if (!content || !user || sending || closed) return;

    try {
      setSending(true);
      const message = await messageAPI.sendMessage({ offerId, content, type: 'Text' });
      setMessages(prev => (prev.some(m => m.id === message.id) ? prev : [...prev, message]));
      setNewMessage('');

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      const body = err?.response?.data;
      if (err?.response?.status === 400 && typeof body === 'string' && body.includes('kapandığı')) {
        setClosed(true);
        loadOffer();
      } else {
        Alert.alert('Hata', 'Mesaj gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
      }
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble message={item} isOwnMessage={item.senderId === user?.id} />
  );

  const otherPartyName = messages.find(m => m.senderId !== user?.id)?.senderName
    ?? (offer && offer.providerId !== user?.id && offer.provider
      ? `${offer.provider.firstName} ${offer.provider.lastName}`.trim()
      : undefined);
  const statusLabel = offer ? OFFER_STATUS_LABELS[offer.status] : undefined;
  const subtitle = [otherPartyName, statusLabel].filter(Boolean).join(' · ');

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Geri"
        accessibilityHint="Önceki sayfaya dönmek için dokunun"
      >
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle} numberOfLines={1} allowFontScaling={true}>
          {offer?.need?.title || 'Mesajlaşma'}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle} numberOfLines={1} allowFontScaling={true}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const renderInputArea = () => {
    if (closed) {
      return (
        <View style={[styles.inputContainer, styles.closedNote]}>
          <MaterialIcons name="lock-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.closedNoteText}>{CLOSED_OFFER_NOTE}</Text>
        </View>
      );
    }

    const canSend = !!newMessage.trim() && !sending;

    return (
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <Input
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Mesajınızı yazın..."
            multiline
            numberOfLines={3}
            maxLength={MAX_MESSAGE_LENGTH}
            containerStyle={styles.messageInput}
            onSubmitEditing={handleSendText}
            returnKeyType="send"
          />

          <TouchableOpacity
            onPress={handleSendText}
            style={[styles.sendButton, { opacity: canSend ? 1 : 0.5 }]}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Gönder"
            accessibilityHint="Mesajı göndermek için dokunun"
            accessibilityState={{ disabled: !canSend }}
          >
            <MaterialIcons name="send" size={24} color={colors.surface} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <Loading text="Mesajlar yükleniyor..." />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <ErrorMessage message={error} onRetry={loadConversation} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyContent,
          ]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="chat-bubble-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {closed
                  ? 'Bu teklif için mesaj yok.'
                  : 'Henüz mesaj yok. Teklifle ilgili sorularınızı buradan yazabilirsiniz.'}
              </Text>
            </View>
          }
        />

        {renderInputArea()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginVertical: spacing.xs,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: typography.body.fontSize,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  closedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedNoteText: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    textAlign: 'center',
  },
  messageInput: {
    flex: 1,
    marginBottom: 0,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginLeft: spacing.sm,
    marginBottom: spacing.md,
  },
});

export default withMessageAuth(ChatScreen);