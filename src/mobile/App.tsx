import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Simple screens for now
const HomeScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>🎉 Arayanibul</Text>
      <Text style={styles.subtitle}>Ana Sayfa</Text>
      <Text style={styles.description}>
        Backend API çalışıyor!{'\n'}
        http://localhost:5000
      </Text>
    </View>
  </SafeAreaView>
);

const LoginScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>🔐 Giriş</Text>
      <Text style={styles.description}>
        Giriş ekranı geliştiriliyor...
      </Text>
    </View>
  </SafeAreaView>
);

const Stack = createStackNavigator();

function AppNavigator({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppContent() {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <AppNavigator isAuthenticated={isAuthenticated} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
    marginBottom: 30,
    lineHeight: 24,
  },
});