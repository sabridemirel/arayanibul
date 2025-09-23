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

### Expo Go Sınırlamaları
Expo Go'da çalışmayan özellikler:
- Google Sign-In (native kod gerekli)
- Facebook SDK (native kod gerekli)
- Push notifications (konfigürasyon gerekli)

Bu özellikler için development build veya production build gereklidir.

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

# Production build (EAS Build gerekli)
eas build --platform ios
eas build --platform android

# Expo Go'da test et
npx expo start --go
```

## 📚 Kaynaklar

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
