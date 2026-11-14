import { useCallback } from 'react';
import { Platform, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme';

/**
 * Light status bar on screens with the purple brand band, restored to dark when the screen
 * loses focus. A <StatusBar> element would stay applied while the screen sits underneath
 * others in the stack, leaving white icons on white headers.
 */
export const useBrandStatusBar = () => {
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      if (Platform.OS === 'android') StatusBar.setBackgroundColor(colors.primaryGradient[0]);
      return () => {
        StatusBar.setBarStyle('dark-content');
        if (Platform.OS === 'android') StatusBar.setBackgroundColor('#ffffff');
      };
    }, [])
  );
};
