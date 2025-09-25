import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthPrompt, AuthPromptContext } from '../hooks/useAuthPrompt';
import { useNavigation } from '@react-navigation/native';

interface WithAuthPromptOptions {
  context: AuthPromptContext;
  requireFullAuth?: boolean;
  redirectOnFail?: boolean;
}

export function withAuthPrompt<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithAuthPromptOptions
) {
  const WithAuthPromptComponent: React.FC<P> = (props) => {
    const { user, isAuthenticated } = useAuth();
    const { requireAuthForGuest } = useAuthPrompt();
    const navigation = useNavigation();

    const { context, requireFullAuth = true, redirectOnFail = true } = options;

    useEffect(() => {
      const checkAuth = () => {
        const isUserAuthenticated = isAuthenticated && user && (!requireFullAuth || !user.isGuest);
        
        if (!isUserAuthenticated) {
          const authSuccess = requireAuthForGuest(context, () => {
            // This callback will be executed after successful authentication
            // The component will re-render automatically due to auth state change
          });

          if (!authSuccess && redirectOnFail) {
            // Redirect to home if auth prompt was shown
            navigation.navigate('Home' as never);
          }
        }
      };

      checkAuth();
    }, [isAuthenticated, user, navigation, requireAuthForGuest, context, requireFullAuth, redirectOnFail]);

    // Only render the component if user is properly authenticated
    const isUserAuthenticated = isAuthenticated && user && (!requireFullAuth || !user.isGuest);
    
    if (!isUserAuthenticated) {
      return null; // Component will not render, auth prompt will be shown
    }

    return <WrappedComponent {...props} />;
  };

  WithAuthPromptComponent.displayName = `withAuthPrompt(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithAuthPromptComponent;
}

// Convenience HOCs for common use cases
export const withCreateNeedAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuthPrompt(Component, { context: 'create_need' });

export const withMakeOfferAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuthPrompt(Component, { context: 'make_offer' });

export const withMessageAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuthPrompt(Component, { context: 'send_message' });

export const withProfileAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuthPrompt(Component, { context: 'view_profile' });

export const withConversationsAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuthPrompt(Component, { context: 'view_conversations' });