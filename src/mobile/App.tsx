import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Import real screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import NeedDetailScreen from './screens/NeedDetailScreen';
import SearchScreen from './screens/SearchScreen';
import CreateNeedScreen from './screens/CreateNeedScreen';
import CreateOfferScreen from './screens/CreateOfferScreen';
import MyNeedsScreen from './screens/MyNeedsScreen';
import MyOffersScreen from './screens/MyOffersScreen';
import ConversationsScreen from './screens/ConversationsScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import PaymentScreen from './screens/PaymentScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          // Default stack presentation
          presentation: 'card'
        }}
      >
        {/* Main app screens - always accessible */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="NeedDetail" component={NeedDetailScreen} />
        
        {/* Auth screens - presented as modals */}
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Group>
        
        {/* Protected screens - require authentication */}
        <Stack.Screen name="CreateNeed" component={CreateNeedScreen} />
        <Stack.Screen name="CreateOffer" component={CreateOfferScreen} />
        <Stack.Screen name="MyNeeds" component={MyNeedsScreen} />
        <Stack.Screen name="MyOffers" component={MyOffersScreen} />
        <Stack.Screen name="Conversations" component={ConversationsScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{ title: 'Ödeme' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppContent() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <AppNavigator />
    </>
  );
}

// Loading component
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingText}>🎉 Arayanibul</Text>
      <Text style={styles.loadingSubtext}>Yükleniyor...</Text>
    </View>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await Font.loadAsync({
          // Load any custom fonts here if needed
          // For now, we just ensure the system is ready for vector icons
        });

        // Check if user has seen onboarding
        const onboardingCompleted = await AsyncStorage.getItem('@arayanibul_onboarding_completed');
        setHasSeenOnboarding(onboardingCompleted === 'true');
      } catch (e) {
        console.warn(e);
        setHasSeenOnboarding(true); // Default to true if error occurs
      } finally {
        // Tell the application to render
        setAppIsReady(true);
        SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('@arayanibul_onboarding_completed', 'true');
      setHasSeenOnboarding(true);
    } catch (error) {
      console.error('Error saving onboarding state:', error);
      setHasSeenOnboarding(true);
    }
  };

  if (!appIsReady || hasSeenOnboarding === null) {
    return <LoadingScreen />;
  }

  // Show onboarding if user hasn't seen it yet
  if (!hasSeenOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 10,
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#666',
  },
});

