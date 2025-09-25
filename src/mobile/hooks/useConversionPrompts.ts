import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ConversionState {
  lastPromptShown: Date | null;
  promptsDismissed: number;
  totalViewsSinceLastPrompt: number;
  bannerDismissedToday: boolean;
}

const STORAGE_KEY = 'conversion_state';
const PROMPT_COOLDOWN_HOURS = 24;
const MAX_PROMPTS_PER_DAY = 3;

export const useConversionPrompts = () => {
  const { user, isGuest, getGuestViewCount, shouldShowAuthPrompt } = useAuth();
  const navigation = useNavigation();
  const [conversionState, setConversionState] = useState<ConversionState>({
    lastPromptShown: null,
    promptsDismissed: 0,
    totalViewsSinceLastPrompt: 0,
    bannerDismissedToday: false,
  });
  const [showSoftPrompt, setShowSoftPrompt] = useState(false);
  const [showScrollPrompt, setShowScrollPrompt] = useState(false);

  // Load conversion state from storage
  useEffect(() => {
    loadConversionState();
  }, []);

  // Check if we should show prompts based on guest actions
  useEffect(() => {
    if (!isGuest) {
      setShowSoftPrompt(false);
      setShowScrollPrompt(false);
      return;
    }

    const viewCount = getGuestViewCount();
    const shouldShow = shouldShowAuthPrompt();
    
    // Show soft prompt after 3+ views if not shown recently
    if (shouldShow && !conversionState.bannerDismissedToday && canShowPrompt()) {
      setShowSoftPrompt(true);
    }

    // Show scroll prompt periodically during browsing
    if (viewCount > 5 && viewCount % 3 === 0 && !conversionState.bannerDismissedToday) {
      setShowScrollPrompt(true);
    }
  }, [isGuest, getGuestViewCount(), shouldShowAuthPrompt(), conversionState]);

  const loadConversionState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if it's a new day
        const lastPrompt = parsed.lastPromptShown ? new Date(parsed.lastPromptShown) : null;
        const isNewDay = !lastPrompt || !isSameDay(lastPrompt, new Date());
        
        setConversionState({
          ...parsed,
          lastPromptShown: lastPrompt,
          bannerDismissedToday: isNewDay ? false : parsed.bannerDismissedToday,
          promptsDismissed: isNewDay ? 0 : parsed.promptsDismissed,
        });
      }
    } catch (error) {
      console.error('Error loading conversion state:', error);
    }
  };

  const saveConversionState = async (newState: ConversionState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      setConversionState(newState);
    } catch (error) {
      console.error('Error saving conversion state:', error);
    }
  };

  const canShowPrompt = (): boolean => {
    const now = new Date();
    
    // Check cooldown period
    if (conversionState.lastPromptShown) {
      const hoursSinceLastPrompt = (now.getTime() - conversionState.lastPromptShown.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastPrompt < PROMPT_COOLDOWN_HOURS) {
        return false;
      }
    }

    // Check daily limit
    if (conversionState.promptsDismissed >= MAX_PROMPTS_PER_DAY) {
      return false;
    }

    return true;
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.toDateString() === date2.toDateString();
  };

  const handleAuthAction = () => {
    // Navigate to register screen (primary action)
    navigation.navigate('Register' as never);
    
    // Update state
    const newState = {
      ...conversionState,
      lastPromptShown: new Date(),
      totalViewsSinceLastPrompt: 0,
    };
    saveConversionState(newState);
    
    // Hide prompts
    setShowSoftPrompt(false);
    setShowScrollPrompt(false);
  };

  const handleDismissPrompt = (promptType: 'soft' | 'scroll') => {
    const newState = {
      ...conversionState,
      promptsDismissed: conversionState.promptsDismissed + 1,
      bannerDismissedToday: true,
      lastPromptShown: new Date(),
    };
    saveConversionState(newState);
    
    if (promptType === 'soft') {
      setShowSoftPrompt(false);
    } else {
      setShowScrollPrompt(false);
    }
  };

  const trackScrollAction = () => {
    if (!isGuest) return;
    
    const newState = {
      ...conversionState,
      totalViewsSinceLastPrompt: conversionState.totalViewsSinceLastPrompt + 1,
    };
    setConversionState(newState);
  };

  const resetConversionState = async () => {
    const initialState: ConversionState = {
      lastPromptShown: null,
      promptsDismissed: 0,
      totalViewsSinceLastPrompt: 0,
      bannerDismissedToday: false,
    };
    await saveConversionState(initialState);
  };

  return {
    showSoftPrompt,
    showScrollPrompt,
    viewCount: getGuestViewCount(),
    handleAuthAction,
    handleDismissPrompt,
    trackScrollAction,
    resetConversionState,
    canShowPrompt: canShowPrompt(),
    isGuest,
  };
};