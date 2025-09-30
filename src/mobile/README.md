# 📱 Mobile App - Arayanibul

React Native/Expo ile geliştirilmiş modern mobil uygulama.

## 🏗️ Proje Yapısı

```
📁 mobile/
├── 📁 src/
│   ├── 📁 components/         # Yeniden kullanılabilir bileşenler
│   ├── 📁 screens/            # Uygulama ekranları
│   ├── 📁 services/           # API servisleri ve HTTP client
│   ├── 📁 navigation/         # Navigation yapısı
│   ├── 📁 hooks/              # Custom React hooks
│   ├── 📁 utils/              # Yardımcı fonksiyonlar
│   └── 📁 types/              # TypeScript tip tanımları
├── 📁 assets/                 # Resimler, fontlar, iconlar
├── 📄 App.tsx                 # Ana uygulama bileşeni
└── 📄 package.json            # Proje bağımlılıkları
```

## 🚀 Kurulum

### Gereksinimler
- Node.js (16 veya üzeri)
- Expo CLI
- iOS Simulator (macOS) veya Android Emulator

### Kurulum Adımları

1. **Proje dizinine gidin:**
   ```bash
   cd src/mobile
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

3. **Uygulamayı başlatın:**
   ```bash
   npx expo start
   ```

4. **Platform seçenekleri:**
   - **iOS**: `i` tuşuna basın (macOS gerekli)
   - **Android**: `a` tuşuna basın
   - **Web**: `w` tuşuna basın
   - **Expo Go**: QR kodu tarayın

## ✨ Özellikler

### 🔐 Kimlik Doğrulama
- ✅ Email/şifre ile kayıt ve giriş
- ✅ Misafir kullanıcı girişi
- ⚠️ Google/Facebook girişi (native build gerekli)
- ✅ Otomatik token yönetimi
- ✅ Güvenli oturum saklama

### 🎨 UI/UX
- Modern ve responsive tasarım
- Material Design iconları
- Smooth animasyonlar
- Dark/Light mode desteği (gelecek)

### 📱 Ekranlar
- **LoginScreen**: Giriş ekranı
- **RegisterScreen**: Kayıt ekranı  
- **HomeScreen**: Ana sayfa

## ⚙️ Konfigürasyon

### API Bağlantısı
`src/services/api.ts` dosyasında backend URL'ini güncelleyin:

```typescript
const API_BASE_URL = 'http://localhost:5000/api'; // Backend URL
```

### Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your configuration:
   - API base URL
   - OAuth credentials (if using social login)
   - EAS project ID

**Note**: `.env` is gitignored and should never be committed.

### OAuth Configuration (Google & Facebook)

Social login requires native builds and proper OAuth configuration:

```bash
# Detailed setup guide
cat OAUTH_SETUP.md
```

Required files (not in repository):
- `google-services.json` (Android)
- `GoogleService-Info.plist` (iOS)

Update `app.json` with your OAuth credentials:
- Google: Replace `YOUR_REVERSED_CLIENT_ID`
- Facebook: Replace `YOUR_FACEBOOK_APP_ID`

### Firebase Push Notifications

Push bildirimler için Firebase yapılandırması gereklidir:

```bash
# Detaylı kurulum rehberi
cat FIREBASE_SETUP.md
```

Firebase config dosyaları:
- `config/google-services.json` (Android)
- `config/GoogleService-Info.plist` (iOS)
- Template dosyaları: `config/*.example`

**Not**: Firebase config dosyaları gitignore'dadır ve repository'ye commit edilmemelidir.

### Expo Go Sınırlamaları

Expo Go'da çalışmayan özellikler:
- Google Sign-In (native kod gerekli)
- Facebook SDK (native kod gerekli)
- Push notifications (Firebase konfigürasyonu gerekli)

Bu özellikler için development build veya production build gereklidir:
```bash
# Development build oluştur
eas build --profile development --platform ios
eas build --profile development --platform android
```

## 🛠️ Teknolojiler

- **Framework**: React Native + Expo
- **Language**: TypeScript
- **Navigation**: React Navigation
- **State Management**: React Hooks + Context
- **HTTP Client**: Axios
- **Storage**: AsyncStorage
- **Icons**: Expo Vector Icons (Material Icons)

## 📝 Geliştirme Notları

### Yeni Ekran Ekleme
1. `src/screens/` klasörüne yeni ekran bileşeni ekleyin
2. `App.tsx` dosyasında navigation'a ekleyin
3. Gerekirse `src/types/` klasöründe tip tanımları yapın

### API Servisi Ekleme
1. `src/services/api.ts` dosyasına yeni endpoint ekleyin
2. Gerekli DTO'ları `src/types/` klasöründe tanımlayın

### Custom Hook Ekleme
1. `src/hooks/` klasörüne yeni hook ekleyin
2. İlgili bileşenlerde kullanın

## 🔧 Yararlı Komutlar

```bash
# Geliştirme sunucusunu başlat
npx expo start

# Cache temizle
npx expo start --clear

# iOS simulator'da çalıştır
npx expo run:ios

# Android emulator'da çalıştır
npx expo run:android

# Production build (EAS Build gerekli)
eas build --platform ios
eas build --platform android

# Expo Go'da test et
npx expo start --go
```

## 📦 Building & Deployment

### iOS Build

For detailed iOS build instructions including TestFlight and App Store submission:

```bash
# See comprehensive iOS build guide
cat IOS_BUILD_GUIDE.md
```

Key commands:
```bash
# Development build for testing
eas build --profile development --platform ios

# Run on iOS simulator
npx expo run:ios

# Submit to TestFlight/App Store
eas submit --platform ios
```

### Android Build

```bash
# Development build
eas build --profile development --platform android

# Production build
eas build --platform android

# Run on Android emulator
npx expo run:android
```

## 📚 Kaynaklar

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
