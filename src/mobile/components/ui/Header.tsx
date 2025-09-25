import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../theme';
import { RootStackParamList } from '../../types';
import Button from './Button';

type HeaderNavigationProp = StackNavigationProp<RootStackParamList>;

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showSearch?: boolean;
  onSearchPress?: () => void;
  rightComponent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  title = 'Arayanibul',
  showBackButton = false,
  showSearch = false,
  onSearchPress,
  rightComponent,
}) => {
  const navigation = useNavigation<HeaderNavigationProp>();
  const { user, isAuthenticated, isGuest, logout } = useAuth();

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleLoginPress = () => {
    navigation.navigate('Login');
  };

  const handleRegisterPress = () => {
    navigation.navigate('Register');
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile' as never);
  };

  const handleLogoutPress = () => {
    logout();
  };

  const renderAuthButtons = () => {
    if (!isAuthenticated || isGuest) {
      // Guest mode - show login/register buttons
      return (
        <View style={styles.authButtons}>
          <Button
            title="Giriş"
            onPress={handleLoginPress}
            variant="outline"
            size="small"
            style={styles.loginButton}
          />
          <Button
            title="Kayıt Ol"
            onPress={handleRegisterPress}
            size="small"
            style={styles.registerButton}
          />
        </View>
      );
    } else {
      // Authenticated user - show profile/logout
      return (
        <View style={styles.userActions}>
          <TouchableOpacity
            onPress={handleProfilePress}
            style={styles.profileButton}
          >
            <MaterialIcons name="person" size={24} color={colors.primary} />
            <Text style={styles.userName} numberOfLines={1}>
              {user?.firstName}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleLogoutPress}
            style={styles.logoutButton}
          >
            <MaterialIcons name="logout" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.leftSection}>
          {showBackButton && (
            <TouchableOpacity
              onPress={handleBackPress}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.rightSection}>
          {showSearch && (
            <TouchableOpacity
              onPress={onSearchPress}
              style={styles.searchButton}
            >
              <MaterialIcons name="search" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
          
          {rightComponent || renderAuthButtons()}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
    marginLeft: -spacing.sm,
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight as any,
    color: colors.text,
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  authButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButton: {
    marginRight: spacing.sm,
    minWidth: 60,
  },
  registerButton: {
    minWidth: 70,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    marginRight: spacing.sm,
    maxWidth: 120,
  },
  userName: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  logoutButton: {
    padding: spacing.sm,
  },
});

export default Header;