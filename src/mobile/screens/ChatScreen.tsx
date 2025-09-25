import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
// import * as ImagePicker from 'expo-image-picker';
// import * as Location from 'expo-location';

import { Input, Button, Loading, ErrorMessage, Card } from '../components/ui';
import { messageAPI, offerAPI } from '../services/api';
import { Message, SendMessageRequest, Offer } from '../types';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { withMessageAuth } from '../hoc/withAuthPrompt';

type RootStackParamList = {
  Chat: { offerId: number };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onImagePress?: (imageUrl: string) => void;
  onLocationPress?: (latitude: number, longitude: number) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  onImagePress,
  onLocationPress,
}) => {
  const renderMessageContent = () => {
    switch (message.type) {
      case 'Image':
        return (
          <TouchableOpacity
            onPress={() => message.attachmentUrl && onImagePress?.(message.attachmentUrl)}
            style={styles.imageContainer}
          >
            <Image
              source={{ uri: message.attachmentUrl }}
              style={styles.messageImage as any}
              resizeMode="cover"
            />
            {message.content && (
              <Text style={[styles.messageText, { color: isOwnMessage ? colors.surface : colors.text }]}>
                {message.content}
              </Text>
            )}
          </TouchableOpacity>
        );
      
      case 'Location':
        return (
          <TouchableOpacity
            onPress={() => {
              // Parse location from content (format: "lat,lng")
              const coords = message.content.split(',');
              if (coords.length === 2) {
                onLocationPress?.(parseFloat(coords[0]), parseFloat(coords[1]));
              }
            }}
            style={styles.locationContainer}
          >
            <MaterialIcons 
              name="location-on" 
              size={24} 
              color={isOwnMessage ? colors.surface : colors.primary} 
            />
            <Text style={[styles.messageText, { color: isOwnMessage ? colors.surface : colors.text }]}>
              Konum paylaşıldı
            </Text>
          </TouchableOpacity>
        );
      
      default: // Text
        return (
          <Text style={[styles.messageText, { color: isOwnMessage ? colors.surface : colors.text }]}>
            {message.content}
          </Text>
        );
    }
  };

  return (
    <View style={[styles.messageBubble, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
      {renderMessageContent()}
      <Text style={[styles.messageTime, { color: isOwnMessage ? colors.surface : colors.textSecondary }]}>
        {new Date(message.createdAt).toLocaleTimeString('tr-TR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  );
};

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { user } = useAuth();
  const { offerId } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadConversation();
    loadOffer();
  }, [offerId]);

  const loadOffer = async () => {
    try {
      // Note: We need to get offer details from the offers API
      // For now, we'll assume we have this information
      // In a real implementation, you might pass offer details through navigation params
    } catch (err) {
      console.error('Error loading offer:', err);
    }
  };

  const loadConversation = async () => {
    try {
      setLoading(true);
      setError(null);
      const conversationMessages = await messageAPI.getConversation(offerId);
      setMessages(conversationMessages);
      
      // Mark messages as read
      const unreadMessages = conversationMessages.filter(msg => !msg.isRead && msg.senderId !== user?.id);
      for (const msg of unreadMessages) {
        await messageAPI.markAsRead(msg.id);
      }
    } catch (err: any) {
      setError('Mesajlar yüklenirken hata oluştu');
      console.error('Error loading conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (messageData: Omit<SendMessageRequest, 'offerId'>) => {
    if (!user) return;

    try {
      setSending(true);
      const message = await messageAPI.sendMessage({
        ...messageData,
        offerId,
      });
      
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      Alert.alert('Hata', 'Mesaj gönderilirken hata oluştu');
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSendText = async () => {
    if (!newMessage.trim()) return;
    
    await sendMessage({
      content: newMessage.trim(),
      type: 'Text',
    });
  };

  const handleSendImage = async () => {
    try {
      // Mock implementation - image picker not available
      Alert.alert('Bilgi', 'Fotoğraf gönderme özelliği geliştirme aşamasında.');
    } catch (err) {
      Alert.alert('Hata', 'Fotoğraf seçilirken hata oluştu');
      console.error('Error picking image:', err);
    }
  };

  const handleSendLocation = async () => {
    try {
      // Mock implementation - location not available
      Alert.alert('Bilgi', 'Konum paylaşma özelliği geliştirme aşamasında.');
    } catch (err) {
      Alert.alert('Hata', 'Konum alınırken hata oluştu');
      console.error('Error getting location:', err);
    }
  };

  const handleImagePress = (imageUrl: string) => {
    // In a real implementation, you might open a full-screen image viewer
    Alert.alert('Fotoğraf', 'Fotoğraf görüntüleyici açılacak');
  };

  const handleLocationPress = (latitude: number, longitude: number) => {
    // In a real implementation, you might open a map view
    Alert.alert('Konum', `Konum: ${latitude}, ${longitude}\nHarita açılacak`);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.id;
    
    return (
      <MessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        onImagePress={handleImagePress}
        onLocationPress={handleLocationPress}
      />
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>Mesajlaşma</Text>
        <Text style={styles.headerSubtitle}>Teklif #{offerId}</Text>
      </View>
    </View>
  );

  const renderInputArea = () => (
    <View style={styles.inputContainer}>
      <View style={styles.inputRow}>
        <TouchableOpacity onPress={handleSendImage} style={styles.attachButton}>
          <MaterialIcons name="photo" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleSendLocation} style={styles.attachButton}>
          <MaterialIcons name="location-on" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <Input
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Mesajınızı yazın..."
          multiline
          numberOfLines={3}
          containerStyle={styles.messageInput}
          onSubmitEditing={handleSendText}
          returnKeyType="send"
        />
        
        <TouchableOpacity 
          onPress={handleSendText} 
          style={[styles.sendButton, { opacity: newMessage.trim() ? 1 : 0.5 }]}
          disabled={!newMessage.trim() || sending}
        >
          <MaterialIcons name="send" size={24} color={colors.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );

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
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
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
  imageContainer: {
    minWidth: 200,
  },
  messageImage: {
    width: '100%',
    height: 150,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  attachButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
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