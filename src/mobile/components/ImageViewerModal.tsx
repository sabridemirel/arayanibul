import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

interface ImageViewerModalProps {
  images: string[];
  /** Index to open at; null keeps the viewer closed */
  startIndex: number | null;
  onClose: () => void;
  label?: string;
}

/**
 * Full-screen photo viewer: swipe between photos, pinch to zoom (iOS; uses the native ScrollView
 * zoom), close with × or the system back gesture.
 */
const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ images, startIndex, onClose, label = 'Görsel' }) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex ?? 0);
  const listRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    if (startIndex !== null) setIndex(startIndex);
  }, [startIndex]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <Modal
      visible={startIndex !== null}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['portrait']}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop}>
        <FlatList
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex ?? 0}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={onMomentumEnd}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          renderItem={({ item, index: i }) => (
            <ScrollView
              style={{ width, height }}
              contentContainerStyle={styles.page}
              maximumZoomScale={3}
              minimumZoomScale={1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              bouncesZoom
            >
              <Image
                source={{ uri: item }}
                style={{ width, height }}
                resizeMode="contain"
                accessibilityLabel={`${label} ${i + 1} / ${images.length}`}
              />
            </ScrollView>
          )}
        />

        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 8 }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
          hitSlop={12}
        >
          <MaterialIcons name="close" size={26} color="#fff" />
        </TouchableOpacity>

        {images.length > 1 && (
          <View style={[styles.counter, { bottom: insets.bottom + 20 }]} pointerEvents="none">
            <Text style={styles.counterText}>
              {index + 1} / {images.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  page: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
  },
});

export default ImageViewerModal;
