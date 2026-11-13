import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';

type Provider = 'apple' | 'google' | 'facebook';

interface SocialLoginButtonsProps {
  mode: 'login' | 'register';
  disabled?: boolean;
  // Called after a successful sign-in (not on cancel)
  onSuccess: () => void;
  onError: (message: string) => void;
  onStart?: () => void;
}

// Providers without client IDs in this build are hidden instead of showing a broken button
const GOOGLE_ENABLED = !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const FACEBOOK_ENABLED = !!process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;

const BUTTON_HEIGHT = 48;
const BUTTON_RADIUS = 8;

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  mode,
  disabled = false,
  onSuccess,
  onError,
  onStart,
}) => {
  const { googleLogin, facebookLogin, appleLogin } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);

  useEffect(() => {
    let mounted = true;
    authService.isAppleSignInAvailable().then(available => {
      if (mounted) setAppleAvailable(available);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const isBusy = disabled || activeProvider !== null;

  const run = async (provider: Provider, signIn: () => Promise<boolean>) => {
    if (isBusy) return;
    onStart?.();
    setActiveProvider(provider);
    try {
      const signedIn = await signIn();
      if (!signedIn) return; // user cancelled: stay silent
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onSuccess();
    } catch (error: any) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      onError(error?.message || 'Giriş yapılamadı. Lütfen tekrar deneyin.');
    } finally {
      setActiveProvider(null);
    }
  };

  const isRegister = mode === 'register';

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' && appleAvailable && (
        <View pointerEvents={isBusy ? 'none' : 'auto'} style={isBusy && styles.dimmed}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              isRegister
                ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={BUTTON_RADIUS}
            style={styles.appleButton}
            onPress={() => run('apple', appleLogin)}
          />
        </View>
      )}

      {GOOGLE_ENABLED && (
        <TouchableOpacity
          style={[styles.button, styles.googleButton, isBusy && styles.dimmed]}
          onPress={() => run('google', googleLogin)}
          disabled={isBusy}
          accessibilityRole="button"
        >
          {activeProvider === 'google' ? (
            <ActivityIndicator color="#1f1f1f" />
          ) : (
            <>
              <FontAwesome name="google" size={18} color="#4285F4" style={styles.icon} />
              <Text style={[styles.text, styles.googleText]}>
                {isRegister ? 'Google ile Kayıt Ol' : 'Google ile Giriş Yap'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {FACEBOOK_ENABLED && (
        <TouchableOpacity
          style={[styles.button, styles.facebookButton, isBusy && styles.dimmed]}
          onPress={() => run('facebook', facebookLogin)}
          disabled={isBusy}
          accessibilityRole="button"
        >
          {activeProvider === 'facebook' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome name="facebook" size={18} color="#fff" style={styles.icon} />
              <Text style={[styles.text, styles.facebookText]}>
                {isRegister ? 'Facebook ile Kayıt Ol' : 'Facebook ile Giriş Yap'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 12,
  },
  appleButton: {
    width: '100%',
    height: BUTTON_HEIGHT,
  },
  button: {
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  icon: {
    marginRight: 10,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  googleText: {
    color: '#1f1f1f',
  },
  facebookText: {
    color: '#fff',
  },
  dimmed: {
    opacity: 0.6,
  },
});

export default SocialLoginButtons;
