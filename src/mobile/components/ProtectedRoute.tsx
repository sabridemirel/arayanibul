import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useAuthPrompt, AuthPromptContext } from '../hooks/useAuthPrompt';
import AuthPromptModal from './ui/AuthPromptModal';
import Loading from './ui/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  context: AuthPromptContext;
  fallbackComponent?: React.ComponentType;
  requireFullAuth?: boolean; // If true, guest users also need to authenticate
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  context,
  fallbackComponent: FallbackComponent,
  requireFullAuth = true,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigation = useNavigation();
  const {
    modalVisible,
    modalContext,
    handleLogin,
    handleRegister,
    handleDismiss,
  } = useAuthPrompt();

  const isUserAuthenticated = isAuthenticated && user && (!requireFullAuth || !user.isGuest);

  useEffect(() => {
    if (!isLoading && !isUserAuthenticated) {
      // Show auth prompt immediately when accessing protected route
      // This will be handled by the useAuthPrompt hook
    }
  }, [isLoading, isUserAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Loading text="Yükleniyor..." />
      </View>
    );
  }

  if (!isUserAuthenticated) {
    if (FallbackComponent) {
      return (
        <>
          <FallbackComponent />
          <AuthPromptModal
            visible={modalVisible}
            context={modalContext}
            onLogin={handleLogin}
            onRegister={handleRegister}
            onDismiss={handleDismiss}
          />
        </>
      );
    }

    // Redirect to home and show auth prompt
    navigation.navigate('Home' as never);
    return null;
  }

  return (
    <>
      {children}
      <AuthPromptModal
        visible={modalVisible}
        context={modalContext}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onDismiss={handleDismiss}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProtectedRoute;