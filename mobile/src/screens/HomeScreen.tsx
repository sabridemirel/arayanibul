import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import authService from '../services/authService';
import { User } from '../services/api';

interface Props {
  onLogout: () => void;
}

const HomeScreen: React.FC<Props> = ({ onLogout }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('User loading error:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            onLogout();
          },
        },
      ]
    );
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return 'google';
      case 'facebook':
        return 'facebook';
      case 'guest':
        return 'person-outline';
      default:
        return 'email';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return '#db4437';
      case 'facebook':
        return '#4267B2';
      case 'guest':
        return '#6c757d';
      default:
        return '#007bff';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ana Sayfa</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Icon name="logout" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          <Icon 
            name="account-circle" 
            size={80} 
            color="#007bff" 
            style={styles.profileIcon} 
          />
          
          {user && (
            <>
              <Text style={styles.welcomeText}>
                Hoş geldin, {user.firstName} {user.lastName}!
              </Text>
              
              <Text style={styles.emailText}>{user.email}</Text>
              
              <View style={styles.providerContainer}>
                <Icon 
                  name={getProviderIcon(user.provider)} 
                  size={20} 
                  color={getProviderColor(user.provider)} 
                />
                <Text style={[styles.providerText, { color: getProviderColor(user.provider) }]}>
                  {user.provider === 'Local' ? 'Email ile giriş' : 
                   user.provider === 'Guest' ? 'Misafir kullanıcı' :
                   `${user.provider} ile giriş`}
                </Text>
              </View>

              {user.isGuest && (
                <View style={styles.guestNotice}>
                  <Icon name="info" size={16} color="#ffc107" />
                  <Text style={styles.guestNoticeText}>
                    Misafir hesabı kullanıyorsunuz. Verileriniz kalıcı değildir.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="settings" size={24} color="#007bff" />
            <Text style={styles.actionButtonText}>Ayarlar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Icon name="help" size={24} color="#007bff" />
            <Text style={styles.actionButtonText}>Yardım</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Icon name="info" size={24} color="#007bff" />
            <Text style={styles.actionButtonText}>Hakkında</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileIcon: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  providerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  providerText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  guestNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  guestNoticeText: {
    fontSize: 12,
    color: '#856404',
    marginLeft: 6,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    fontWeight: '500',
  },
});

export default HomeScreen;