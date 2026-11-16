import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { prepareImageForUpload, PickedImage } from '../utils/prepareImage';

interface ImagePickerFieldProps {
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
  max?: number;
}

/** Photo grid for forms: add from camera or library (downscaled before upload), remove with ×. */
const ImagePickerField: React.FC<ImagePickerFieldProps> = ({ images, onChange, max = 5 }) => {
  const [preparing, setPreparing] = useState(false);
  const remaining = max - images.length;

  const addAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setPreparing(true);
    const prepared: PickedImage[] = [];
    let failed = 0;
    for (const asset of assets.slice(0, remaining)) {
      try {
        prepared.push(await prepareImageForUpload(asset));
      } catch (err) {
        console.warn('Image preparation failed', err);
        failed += 1;
      }
    }
    setPreparing(false);
    if (prepared.length > 0) onChange([...images, ...prepared]);
    if (failed > 0) {
      Alert.alert('Fotoğraf Eklenemedi', 'Seçtiğiniz fotoğraflardan bazıları açılamadı. Başka bir fotoğraf deneyin.');
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin Gerekli', 'Fotoğraf eklemek için Ayarlar\'dan fotoğraflarınıza erişim izni verin.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (!result.canceled) await addAssets(result.assets);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin Gerekli', 'Fotoğraf çekmek için Ayarlar\'dan kamera izni verin.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) await addAssets(result.assets);
  };

  const openPicker = () => {
    Alert.alert('Fotoğraf Ekle', undefined, [
      { text: 'Fotoğraf Çek', onPress: takePhoto },
      { text: 'Galeriden Seç', onPress: pickFromLibrary },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  const remove = (index: number) => onChange(images.filter((_, i) => i !== index));

  return (
    <View style={styles.grid}>
      {images.map((image, index) => (
        <View key={image.uri} style={styles.tile}>
          <Image source={{ uri: image.uri }} style={styles.thumb} accessibilityLabel={`Eklenen ${index + 1}. fotoğraf`} />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => remove(index)}
            accessibilityRole="button"
            accessibilityLabel={`${index + 1}. fotoğrafı kaldır`}
            hitSlop={8}
          >
            <MaterialIcons name="close" size={16} color={colors.surface} />
          </TouchableOpacity>
        </View>
      ))}

      {remaining > 0 && (
        <TouchableOpacity
          style={[styles.tile, styles.addTile]}
          onPress={openPicker}
          disabled={preparing}
          accessibilityRole="button"
          accessibilityLabel="Fotoğraf ekle"
        >
          {preparing ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <MaterialIcons name="add-a-photo" size={26} color={colors.primary} />
              <Text style={styles.addText}>{images.length === 0 ? 'Fotoğraf Ekle' : `${images.length}/${max}`}</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const TILE = 96;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addText: {
    fontSize: typography.caption.fontSize,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default ImagePickerField;
