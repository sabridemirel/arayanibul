import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Input, Button, Loading } from '../components/ui';
import { useForm } from '../hooks/useForm';
import { colors, spacing, borderRadius, typography } from '../theme';
import { userAPI } from '../services/api';
// import * as ImagePicker from 'expo-image-picker';

interface Props {
  navigation: any;
}

interface EditProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
}

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, isLoading } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(
    user?.profileImageUrl || null
  );

  const validateProfile = (values: EditProfileFormData) => {
    const errors: Partial<Record<keyof EditProfileFormData, string>> = {};

    if (!values.firstName?.trim()) {
      errors.firstName = 'Ad gereklidir';
    } else if (values.firstName.trim().length < 2) {
      errors.firstName = 'Ad en az 2 karakter olmalıdır';
    }

    if (!values.lastName?.trim()) {
      errors.lastName = 'Soyad gereklidir';
    } else if (values.lastName.trim().length < 2) {
      errors.lastName = 'Soyad en az 2 karakter olmalıdır';
    }

    if (!values.email?.trim()) {
      errors.email = 'E-posta adresi gereklidir';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      errors.email = 'Geçerli bir e-posta adresi girin';
    }

    if (values.phone && values.phone.trim()) {
      const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(values.phone.trim())) {
        errors.phone = 'Geçerli bir telefon numarası girin';
      }
    }

    return errors;
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldTouched,
    handleSubmit,
  } = useForm<EditProfileFormData>({
    initialValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: '',
      address: '',
    },
    validate: validateProfile,
    onSubmit: async (formValues) => {
      try {
        await userAPI.updateProfile({
          firstName: formValues.firstName.trim(),
          lastName: formValues.lastName.trim(),
          email: formValues.email.trim(),
          // TODO: Add phone and address when backend supports them
        });
        
        Alert.alert('Başarılı', 'Profil güncellendi', [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]);
      } catch (error: any) {
        Alert.alert('Hata', error.message);
      }
    },
  });

  const handleImagePicker = async () => {
    try {
      // Mock implementation - image picker not available
      Alert.alert('Bilgi', 'Profil fotoğrafı değiştirme özelliği geliştirme aşamasında.');
    } catch (error: any) {
      Alert.alert('Hata', 'Fotoğraf seçilirken hata oluştu');
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    try {
      setUploading(true);
      
      // Create FormData for image upload
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      const response = await userAPI.uploadProfileImage(formData);
      setProfileImage(response.imageUrl);
      
      Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Fotoğraf yüklenirken hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const renderProfileImage = () => {
    const imageSource = profileImage
      ? { uri: profileImage }
      : require('../assets/images/icon.png');

    return (
      <View style={styles.profileImageContainer}>
        <Image source={imageSource} style={styles.profileImage} />
        <TouchableOpacity 
          style={styles.editImageButton}
          onPress={handleImagePicker}
          disabled={uploading}
        >
          {uploading ? (
            <Loading size="small" />
          ) : (
            <MaterialIcons name="camera-alt" size={20} color={colors.surface} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return <Loading text="Profil yükleniyor..." />;
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Kullanıcı bilgileri bulunamadı</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {renderProfileImage()}
          <Text style={styles.title}>Profili Düzenle</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Ad"
            placeholder="Adınızı girin"
            value={values.firstName}
            onChangeText={(text) => setValue('firstName', text)}
            onBlur={() => setFieldTouched('firstName')}
            autoCapitalize="words"
            leftIcon="person"
            error={touched.firstName ? errors.firstName : undefined}
          />

          <Input
            label="Soyad"
            placeholder="Soyadınızı girin"
            value={values.lastName}
            onChangeText={(text) => setValue('lastName', text)}
            onBlur={() => setFieldTouched('lastName')}
            autoCapitalize="words"
            leftIcon="person"
            error={touched.lastName ? errors.lastName : undefined}
          />

          <Input
            label="E-posta"
            placeholder="E-posta adresinizi girin"
            value={values.email}
            onChangeText={(text) => setValue('email', text)}
            onBlur={() => setFieldTouched('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="email"
            error={touched.email ? errors.email : undefined}
          />

          <Input
            label="Telefon (Opsiyonel)"
            placeholder="Telefon numaranızı girin"
            value={values.phone}
            onChangeText={(text) => setValue('phone', text)}
            onBlur={() => setFieldTouched('phone')}
            keyboardType="phone-pad"
            leftIcon="phone"
            error={touched.phone ? errors.phone : undefined}
          />

          <Input
            label="Adres (Opsiyonel)"
            placeholder="Adresinizi girin"
            value={values.address}
            onChangeText={(text) => setValue('address', text)}
            onBlur={() => setFieldTouched('address')}
            leftIcon="location-on"
            error={touched.address ? errors.address : undefined}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.actions}>
          <Button
            title="Kaydet"
            onPress={handleSubmit}
            disabled={isSubmitting || uploading}
            loading={isSubmitting}
            fullWidth
            style={styles.saveButton}
          />
          
          <Button
            title="İptal"
            onPress={() => navigation.goBack()}
            variant="outline"
            fullWidth
            style={styles.cancelButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.border,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight as any,
    color: colors.text,
  },
  form: {
    marginBottom: spacing.xl,
  },
  actions: {
    marginBottom: spacing.lg,
  },
  saveButton: {
    marginBottom: spacing.md,
  },
  cancelButton: {
    borderColor: colors.textSecondary,
  },
  errorText: {
    fontSize: typography.body.fontSize,
    color: colors.error,
    textAlign: 'center',
    margin: spacing.lg,
  },
});

export default EditProfileScreen;