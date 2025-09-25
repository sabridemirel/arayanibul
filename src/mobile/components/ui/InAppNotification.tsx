import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface InAppNotificationProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onPress?: () => void;
  onDismiss?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const InAppNotification: React.FC<InAppNotificationProps> = ({
  visible,
  title,
  message,
  type = 'info',
  duration = 4000,
  onPress,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Auto dismiss after duration
      if (duration > 0) {
        timeoutRef.current = setTimeout(() => {
          handleDismiss();
        }, duration);
      }
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, duration, slideAnim]);

  const handleDismiss = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss?.();
    });
  };

  const handlePress = () => {
    handleDismiss();
    onPress?.();
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: theme.colors.success,
          icon: 'check-circle',
          iconColor: 'white',
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning,
          icon: 'warning',
          iconColor: 'white',
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error,
          icon: 'error',
          iconColor: 'white',
        };
      default:
        return {
          backgroundColor: theme.colors.primary,
          icon: 'info',
          iconColor: 'white',
        };
    }
  };

  const typeConfig = getTypeConfig();

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: typeConfig.backgroundColor,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={onPress ? handlePress : undefined}
        activeOpacity={onPress ? 0.8 : 1}
      >
        <MaterialIcons
          name={typeConfig.icon as any}
          size={24}
          color={typeConfig.iconColor}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
          <MaterialIcons name="close" size={20} color="white" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 25,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
});

export default InAppNotification;