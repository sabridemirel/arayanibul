import React, { useState, useRef, useEffect } from 'react';
import { Image, View, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { ThemedText } from '../themed-text';

interface LazyImageProps {
  source: { uri: string } | number;
  style?: any;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoad?: () => void;
  onError?: () => void;
  threshold?: number; // Distance from viewport to start loading
}

const { width: screenWidth } = Dimensions.get('window');

export const LazyImage: React.FC<LazyImageProps> = ({
  source,
  style,
  placeholder,
  fallback,
  resizeMode = 'cover',
  onLoad,
  onError,
  threshold = 100
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const viewRef = useRef<View>(null);

  useEffect(() => {
    // For now, we'll load immediately since we don't have intersection observer
    // In a real implementation, you'd use react-native-intersection-observer or similar
    setShouldLoad(true);
  }, []);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  const renderPlaceholder = () => {
    if (placeholder) {
      return placeholder;
    }
    
    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator size="small" color="#666" />
      </View>
    );
  };

  const renderFallback = () => {
    if (fallback) {
      return fallback;
    }
    
    return (
      <View style={[styles.fallback, style]}>
        <ThemedText style={styles.fallbackText}>
          Resim yüklenemedi
        </ThemedText>
      </View>
    );
  };

  if (!shouldLoad) {
    return renderPlaceholder();
  }

  if (hasError) {
    return renderFallback();
  }

  return (
    <View ref={viewRef} style={style}>
      {isLoading && renderPlaceholder()}
      <Image
        source={source}
        style={[style, isLoading && styles.hidden]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
  },
  fallback: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  fallbackText: {
    color: '#999',
    fontSize: 12,
  },
  hidden: {
    opacity: 0,
  },
});