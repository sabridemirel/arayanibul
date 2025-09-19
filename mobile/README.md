# Mobile App - React Native

## Kurulum

### Gereksinimler
- Node.js (16 veya üzeri)
- React Native CLI
- Android Studio (Android için)
- Xcode (iOS için)

### Kurulum Adımları

1. Proje dizinine gidin:
   ```bash
   cd mobile
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. iOS için (sadece macOS):
   ```bash
   cd ios && pod install && cd ..
   ```

4. Android için:
   ```bash
   npx react-native run-android
   ```

5. iOS için:
   ```bash
   npx react-native run-ios
   ```

## Konfigürasyon

### Google Sign-In Kurulumu

1. [Google Cloud Console](https://console.cloud.google.com/) üzerinden yeni bir proje oluşturun
2. OAuth 2.0 Client ID oluşturun (Android ve iOS için ayrı ayrı)
3. `src/services/authService.ts` dosyasında `webClientId`'yi güncelleyin

### Facebook Sign-In Kurulumu

1. [Facebook Developers](https://developers.facebook.com/) üzerinden yeni bir uygulama oluşturun
2. Android ve iOS platformlarını ekleyin
3. Gerekli konfigürasyonları yapın

### API Konfigürasyonu

`src/services/api.ts` dosyasında `API_BASE_URL`'yi backend URL'iniz ile güncelleyin.

## Özellikler

- Email/şifre ile kayıt ve giriş
- Google ile sosyal giriş
- Facebook ile sosyal giriş
- Misafir kullanıcı girişi
- JWT token yönetimi
- Otomatik giriş kontrolü
- Modern UI tasarımı

## Ekranlar

- **LoginScreen**: Giriş sayfası
- **RegisterScreen**: Kayıt sayfası
- **HomeScreen**: Ana sayfa (giriş sonrası)

## Kullanılan Teknolojiler

- React Native
- TypeScript
- React Navigation
- AsyncStorage
- Google Sign-In
- Facebook SDK
- Axios
- Vector Icons