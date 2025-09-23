import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MainScreen from './screens/MainScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import authService from './services/authService';

const Stack = createStackNavigator();

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
    initializeServices();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await authService.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeServices = async () => {
    try {
      await authService.initializeGoogleSignIn();
    } catch (error) {
      console.error('Service initialization error:', error);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleLoginPress = () => {
    // Ana sayfadan login'e yönlendir
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Home">
              {(props) => <HomeScreen {...props} onLogout={handleLogout} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Main">
                {(props) => (
                  <MainScreen {...props} onLoginPress={() => props.navigation.navigate('Login')} />
                )}
              </Stack.Screen>
              <Stack.Screen name="Login">
                {(props) => (
                  <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />
                )}
              </Stack.Screen>
              <Stack.Screen name="Register">
                {(props) => (
                  <RegisterScreen {...props} onRegisterSuccess={handleLoginSuccess} />
                )}
              </Stack.Screen>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});

export default App;