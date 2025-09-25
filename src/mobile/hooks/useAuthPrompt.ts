import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export type AuthPromptContext = 
  | 'create_need' 
  | 'make_offer' 
  | 'send_message' 
  | 'view_profile'
  | 'save_favorite'
  | 'view_conversations'
  | 'edit_profile';

export const useAuthPrompt = () => {
  const { user, isAuthenticated, setIntendedAction } = useAuth();
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContext, setModalContext] = useState<AuthPromptContext>('create_need');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const showAuthPrompt = (context: AuthPromptContext, onSuccess?: () => void) => {
    setModalContext(context);
    setPendingAction(() => onSuccess);
    setIntendedAction(onSuccess || null);
    setModalVisible(true);
  };

  const handleLogin = () => {
    setModalVisible(false);
    navigation.navigate('Login' as never);
  };

  const handleRegister = () => {
    setModalVisible(false);
    navigation.navigate('Register' as never);
  };

  const handleDismiss = () => {
    setModalVisible(false);
    setPendingAction(null);
    setIntendedAction(null);
  };

  const requireAuth = (context: AuthPromptContext, onSuccess?: () => void): boolean => {
    // If user is authenticated (including guest), allow action
    if (isAuthenticated && user && !user.isGuest) {
      onSuccess?.();
      return true;
    }

    // Show auth prompt modal
    showAuthPrompt(context, onSuccess);
    return false;
  };

  const requireAuthForGuest = (context: AuthPromptContext, onSuccess?: () => void): boolean => {
    // If user is fully authenticated, allow action
    if (isAuthenticated && user && !user.isGuest) {
      onSuccess?.();
      return true;
    }

    // Show auth prompt modal (even for guest users)
    showAuthPrompt(context, onSuccess);
    return false;
  };

  return {
    requireAuth,
    requireAuthForGuest,
    isAuthenticated: isAuthenticated && user && !user.isGuest,
    isGuest: user?.isGuest || false,
    
    // Modal props
    modalVisible,
    modalContext,
    handleLogin,
    handleRegister,
    handleDismiss,
  };
};