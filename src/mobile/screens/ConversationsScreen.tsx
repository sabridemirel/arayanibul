import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';

import { Input, Loading, ErrorMessage, Card, Badge } from '../components/ui';
import { messageAPI } from '../services/api';
import { Conversation } from '../types';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { withConversationsAuth } from '../hoc/withAuthPrompt';

type RootStackParamList = {
  Chat: { offerId: number };
  NeedDetail: { needId: number };
};

type ConversationsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, onPress }) => {
  const { user } = useAuth();
  const otherUser = conversation.otherUser;
  const lastMessage = conversation.lastMessage;
  
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('tr-TR', { 
        weekday: 'short' 
      });
    } else {
      return date.toLocaleDateString('tr-TR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const getLastMessagePreview = () => {
    if (!lastMessage) return 'Henüz mesaj yok';
    
    const isOwnMessage = lastMessage.senderId === user?.id;
    const prefix = isOwnMessage ? 'Sen: ' : '';
    
    switch (lastMessage.type) {
      case 'Image':
        return `${prefix}📷 Fotoğraf`;
      case 'Location':
        return `${prefix}📍 Konum`;
      default:
        return `${prefix}${lastMessage.content}`;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.conversationItem}>
      <View style={styles.avatarContainer}>
        {otherUser?.profileImageUrl ? (
          <Image 
            source={{ uri: otherUser.profileImageUrl }} 
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <MaterialIcons name="person" size={24} color={colors.textSecondary} />
          </View>
        )}
        {conversation.unreadCount > 0 && (
          <Badge 
            count={conversation.unreadCount} 
            style={styles.unreadBadge}
          />
        )}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.userName}>
            {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Kullanıcı'}
          </Text>
          {lastMessage && (
            <Text style={styles.messageTime}>
              {formatMessageTime(lastMessage.createdAt)}
            </Text>
          )}
        </View>
        
        <View style={styles.conversationBody}>
          <Text 
            style={[
              styles.lastMessage,
              conversation.unreadCount > 0 && styles.unreadMessage
            ]}
            numberOfLines={1}
          >
            {getLastMessagePreview()}
          </Text>
          
          {conversation.offer && (
            <Text style={styles.offerInfo} numberOfLines={1}>
              {conversation.offer.need?.title || `Teklif #${conversation.offerId}`}
            </Text>
          )}
        </View>
      </View>
      
      <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

const ConversationsScreen: React.FC = () => {
  const navigation = useNavigation<ConversationsScreenNavigationProp>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  useEffect(() => {
    filterConversations();
  }, [conversations, searchQuery]);

  const loadConversations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const conversationsData = await messageAPI.getConversations();
      setConversations(conversationsData);
    } catch (err: any) {
      setError('Konuşmalar yüklenirken hata oluştu');
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterConversations = () => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const filtered = conversations.filter(conversation => {
      const otherUser = conversation.otherUser;
      const userName = otherUser ? `${otherUser.firstName} ${otherUser.lastName}`.toLowerCase() : '';
      const offerTitle = conversation.offer?.need?.title?.toLowerCase() || '';
      const lastMessageContent = conversation.lastMessage?.content?.toLowerCase() || '';
      
      const query = searchQuery.toLowerCase();
      
      return userName.includes(query) || 
             offerTitle.includes(query) || 
             lastMessageContent.includes(query);
    });
    
    setFilteredConversations(filtered);
  };

  const handleConversationPress = (conversation: Conversation) => {
    navigation.navigate('Chat', { offerId: conversation.offerId });
  };

  const handleOfferPress = (needId: number) => {
    navigation.navigate('NeedDetail', { needId });
  };

  const onRefresh = () => {
    loadConversations(true);
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <ConversationItem
      conversation={item}
      onPress={() => handleConversationPress(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="chat-bubble-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>Henüz mesajınız yok</Text>
      <Text style={styles.emptySubtitle}>
        İhtiyaçlara teklif verin veya tekliflerinizi kabul edin, mesajlaşmaya başlayın
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Mesajlar</Text>
      <View style={styles.searchContainer}>
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Konuşmalarda ara..."
          leftIcon="search"
          containerStyle={styles.searchInput}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <Loading text="Konuşmalar yükleniyor..." />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <ErrorMessage message={error} onRetry={() => loadConversations()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.offerId.toString()}
        style={styles.conversationsList}
        contentContainerStyle={[
          styles.conversationsContent,
          filteredConversations.length === 0 && styles.emptyContent
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight as any,
    color: colors.text,
    marginBottom: spacing.md,
  },
  searchContainer: {
    marginBottom: spacing.sm,
  },
  searchInput: {
    marginBottom: 0,
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
  conversationsList: {
    flex: 1,
  },
  conversationsContent: {
    paddingVertical: spacing.sm,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  userName: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  messageTime: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  conversationBody: {
    gap: spacing.xs,
  },
  lastMessage: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  unreadMessage: {
    fontWeight: '600',
    color: colors.text,
  },
  offerInfo: {
    fontSize: typography.caption.fontSize,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default withConversationsAuth(ConversationsScreen);