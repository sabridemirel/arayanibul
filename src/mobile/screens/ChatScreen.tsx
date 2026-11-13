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
import { blockAPI, messageAPI, needAPI, offerAPI, ReportTargetType } from '../services/api';
import { Message, Offer } from '../types';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { withMessageAuth } from '../hoc/withAuthPrompt';
import ReportSheet from '../components/ReportSheet';

type RootStackParamList = {
  Chat: { offerId: number; otherUserId?: string };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

const CLOSED_OFFER_NOTE = 'Bu teklif kapandığı için yeni mesaj gönderilemez.';
const BLOCKED_NOTE = 'Bu kullanıcıyı engellediniz.';
const MESSAGING_LOCKED_FALLBACK = 'Bu kullanıcıyla mesajlaşamazsınız.';
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

// Union by id (incoming wins), ascending by date: keeps hub messages that arrived during a fetch
const mergeMessages = (current: Message[], incoming: Message[]) => {
  const byId = new Map<number, Message>();
  current.forEach(m => byId.set(m.id, m));
  incoming.forEach(m => byId.set(m.id, { ...byId.get(m.id), ...m }));
  return sortByDate([...byId.values()]);
};

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onLongPress?: (message: Message) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwnMessage, onLongPress }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    disabled={!onLongPress}
    onLongPress={onLongPress ? () => onLongPress(message) : undefined}
    accessibilityHint={onLongPress ? 'Mesajı şikayet etmek için basılı tutun' : undefined}
    style={[styles.messageBubble, isOwnMessage ? styles.ownMessage : styles.otherMessage]}
  >
    <Text style={[styles.messageText, { color: isOwnMessage ? colors.surface : colors.text }]}>
      {message.content}
    </Text>
    <Text style={[styles.messageTime, { color: isOwnMessage ? colors.surface : colors.textSecondary }]}>
      {new Date(message.createdAt).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      })}
    </Text>
  </TouchableOpacity>
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
    reconnectCount,
  } = useChat();
  const offerId = Number(route.params.offerId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [closed, setClosed] = useState(false);
  const [needOwnerId, setNeedOwnerId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  // Server refused messaging (403, e.g. the other party blocked you); holds its message
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: ReportTargetType; id: string } | null>(null);

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
      setMessages(prev => mergeMessages(prev, conversationMessages));
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

  // The offer only carries the provider; when you are the provider, the other party is the need owner.
  useEffect(() => {
    if (route.params.otherUserId || !offer || !user || offer.providerId !== user.id) return;
    let cancelled = false;
    needAPI
      .getNeedById(offer.needId)
      .then(need => {
        if (!cancelled && need?.userId) setNeedOwnerId(need.userId);
      })
      .catch(err => console.warn('Error loading need owner:', err));
    return () => {
      cancelled = true;
    };
  }, [offer, user, route.params.otherUserId]);

  // Hub reconnected / app returned to foreground: merge a fresh snapshot (messages may have been missed).
  const lastReconnectRef = useRef(reconnectCount);
  useEffect(() => {
    if (reconnectCount === lastReconnectRef.current) return;
    lastReconnectRef.current = reconnectCount;
    let cancelled = false;
    messageAPI
      .getConversation(offerId)
      .then(conversationMessages => {
        if (cancelled) return;
        setMessages(prev => mergeMessages(prev, conversationMessages));
        markRead();
      })
      .catch(err => console.warn('Conversation resync failed:', err));
    return () => {
      cancelled = true;
    };
  }, [reconnectCount, offerId, markRead]);

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

  const otherUserId: string | null =
    route.params.otherUserId
    ?? (offer && user && offer.providerId && offer.providerId !== user.id ? offer.providerId : null)
    ?? needOwnerId
    ?? messages.find(m => m.senderId !== user?.id)?.senderId
    ?? null;

  // Report/block need a full account and a known other party
  const canModerate = !!user && !user.isGuest && !!otherUserId && otherUserId !== user.id;

  // Initial block state for this conversation
  useEffect(() => {
    if (!canModerate || !otherUserId) return;
    let cancelled = false;
    blockAPI
      .getBlockedUsers()
      .then(list => {
        if (!cancelled) setBlocked(list.some(b => b.userId === otherUserId));
      })
      .catch(err => console.warn('Error loading blocked users:', err));
    return () => {
      cancelled = true;
    };
  }, [canModerate, otherUserId]);

  const serverMessage = (err: any, fallback: string) => {
    const message = err?.response?.data?.message;
    return typeof message === 'string' && message ? message : fallback;
  };

  const setBlockState = async (block: boolean) => {
    if (!otherUserId || blockBusy) return;
    try {
      setBlockBusy(true);
      const res = block
        ? await blockAPI.blockUser(otherUserId)
        : await blockAPI.unblockUser(otherUserId);
      setBlocked(block);
      if (!block) setLockedMessage(null);
      if (res?.message) Alert.alert(block ? 'Kullanıcı Engellendi' : 'Engel Kaldırıldı', res.message);
    } catch (err: any) {
      Alert.alert(
        'Hata',
        serverMessage(
          err,
          block
            ? 'Kullanıcı engellenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'
            : 'Engel kaldırılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
        )
      );
    } finally {
      setBlockBusy(false);
    }
  };

  const confirmBlock = () => {
    Alert.alert(
      'Kullanıcıyı Engelle',
      'Engellediğiniz kullanıcıyla mesajlaşamazsınız ve birbirinizin ilanlarına teklif veremezsiniz. Engeli daha sonra kaldırabilirsiniz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Engelle', style: 'destructive', onPress: () => setBlockState(true) },
      ]
    );
  };

  const confirmUnblock = () => {
    Alert.alert('Engeli Kaldır', 'Bu kullanıcının engelini kaldırmak istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Engeli Kaldır', onPress: () => setBlockState(false) },
    ]);
  };

  const openMenu = () => {
    if (!otherUserId) return;
    Alert.alert('Seçenekler', undefined, [
      { text: 'Şikayet Et', onPress: () => setReportTarget({ type: 'User', id: otherUserId }) },
      blocked
        ? { text: 'Engeli Kaldır', onPress: confirmUnblock }
        : { text: 'Kullanıcıyı Engelle', style: 'destructive', onPress: confirmBlock },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  const handleMessageLongPress = (message: Message) => {
    Alert.alert('Mesaj', undefined, [
      {
        text: 'Mesajı Şikayet Et',
        onPress: () => setReportTarget({ type: 'Message', id: String(message.id) }),
      },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  const handleSendText = async () => {
    const content = newMessage.trim();
    if (!content || !user || sending || closed || blocked || lockedMessage) return;

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
      } else if (err?.response?.status === 403) {
        const message = serverMessage(err, MESSAGING_LOCKED_FALLBACK);
        setLockedMessage(message);
        Alert.alert('Mesaj Gönderilemedi', message);
      } else {
        Alert.alert('Hata', 'Mesaj gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
      }
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.id;
    return (
      <MessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        onLongPress={canModerate && !isOwnMessage ? handleMessageLongPress : undefined}
      />
    );
  };

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
      {canModerate ? (
        <TouchableOpacity
          onPress={openMenu}
          style={styles.menuButton}
          accessibilityRole="button"
          accessibilityLabel="Seçenekler"
          accessibilityHint="Şikayet etme ve engelleme seçenekleri için dokunun"
        >
          <MaterialIcons name="more-vert" size={24} color={colors.text} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderInputArea = () => {
    if (blocked) {
      return (
        <View style={[styles.inputContainer, styles.blockedNote]}>
          <View style={styles.closedNote}>
            <MaterialIcons name="block" size={18} color={colors.textSecondary} />
            <Text style={styles.closedNoteText}>{BLOCKED_NOTE}</Text>
          </View>
          <TouchableOpacity
            onPress={confirmUnblock}
            disabled={blockBusy}
            style={styles.unblockButton}
            accessibilityRole="button"
            accessibilityLabel="Engeli Kaldır"
          >
            <Text style={styles.unblockButtonText}>Engeli Kaldır</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (lockedMessage) {
      return (
        <View style={[styles.inputContainer, styles.closedNote]}>
          <MaterialIcons name="lock-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.closedNoteText}>{lockedMessage}</Text>
        </View>
      );
    }

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

      {canModerate && (
        <ReportSheet
          visible={!!reportTarget}
          targetType={reportTarget?.type ?? 'User'}
          targetId={reportTarget?.id}
          onClose={() => setReportTarget(null)}
        />
      )}
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
  menuButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  blockedNote: {
    alignItems: 'center',
  },
  unblockButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  unblockButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: typography.body.fontSize,
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