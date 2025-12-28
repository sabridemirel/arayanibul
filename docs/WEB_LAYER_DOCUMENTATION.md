# Web Katmanı Dokümantasyonu

## Genel Bakış

Arayanibul web uygulaması, mobil uygulamanın web versiyonudur. Aynı backend API'lerini kullanarak React + TypeScript + Tailwind CSS ile geliştirilmiştir.

**Durum:** ✅ Temel Sayfalar Tamamlandı

## Teknoloji Stack

| Teknoloji | Versiyon | Açıklama |
|-----------|----------|----------|
| React | 18+ | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Styling |
| React Router | v6 | Navigation |
| Axios | 1.x | HTTP client |
| Heroicons | 2.x | İkonlar |

## Proje Yapısı

```
src/web/
├── src/
│   ├── components/     # Yeniden kullanılabilir UI bileşenleri
│   │   ├── NeedCard.tsx       # İhtiyaç kartı
│   │   ├── Header.tsx         # Üst navigasyon
│   │   └── Footer.tsx         # Alt bilgi
│   ├── contexts/       # React Context providers
│   │   └── AuthContext.tsx    # Kimlik doğrulama state
│   ├── pages/          # Sayfa bileşenleri
│   │   ├── HomePage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── CreateNeedPage.tsx
│   │   ├── NeedDetailPage.tsx
│   │   ├── MyNeedsPage.tsx
│   │   ├── MyOffersPage.tsx
│   │   └── CreateOfferPage.tsx
│   ├── services/       # API servisleri
│   │   └── api.ts
│   ├── theme/          # Tasarım tokenleri
│   └── App.tsx         # Ana uygulama + routing
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Tamamlanan Sayfalar

### 1. Arama Sayfası (`/search`)
- [x] İhtiyaç listesi grid görünümü
- [x] Kategori filtresi
- [x] Arama kutusu
- [x] Fiyat aralığı filtresi
- [x] Konum filtresi
- [x] Sıralama seçenekleri
- [x] Sayfalama
- [x] Loading/error durumları

### 2. İhtiyaç Detay Sayfası (`/needs/:id`)
- [x] Resim galerisi
- [x] İhtiyaç bilgileri (başlık, açıklama, fiyat, konum)
- [x] Aciliyet rozeti
- [x] Kullanıcı bilgileri ve puanı
- [x] Teklifler listesi
- [x] Teklif kabul/red butonları (ilan sahibi için)
- [x] "Teklif Ver" butonu
- [x] Loading/error durumları

### 3. İhtiyaç Oluştur Sayfası (`/needs/create`) - Protected
- [x] Form validasyonu
- [x] Başlık ve açıklama alanları
- [x] Kategori seçici
- [x] Fiyat aralığı girişi
- [x] Konum seçici
- [x] Aciliyet seçimi
- [x] Son tarih seçici
- [x] Resim yükleme (önizleme ile)
- [x] Loading/error/success durumları

### 4. İhtiyaçlarım Sayfası (`/my-needs`) - Protected
- [x] İhtiyaç listesi
- [x] Durum filtreleri (Tümü, Aktif, Beklemede, Tamamlandı)
- [x] Düzenle butonu
- [x] Sil butonu (onay modalı ile)
- [x] Boş durum mesajı
- [x] İstatistik kartları

### 5. Tekliflerim Sayfası (`/my-offers`) - Protected
- [x] Teklif listesi
- [x] Durum filtreleri (Tümü, Beklemede, Kabul Edildi, Reddedildi)
- [x] Teklif detayları (fiyat, teslimat, mesaj)
- [x] İlgili ihtiyaç bilgisi
- [x] Teklifi Geri Çek butonu
- [x] Boş durum mesajı

### 6. Teklif Oluştur Sayfası (`/offers/create/:needId`) - Protected
- [x] İhtiyaç özeti kartı
- [x] Fiyat teklifi girişi
- [x] Teslimat süresi girişi
- [x] Mesaj alanı
- [x] Form validasyonu
- [x] Loading/error/success durumları

### 7. Profil Sayfası (`/profile`) - Protected
- [x] Profil resmi ve bilgileri
- [x] Kullanıcı istatistikleri (ihtiyaçlar, teklifler, tamamlanan)
- [x] Bildirimler butonu
- [x] Profili Düzenle butonu
- [x] Tekliflerim butonu
- [x] Değerlendirmelerim butonu
- [x] Çıkış Yap butonu

### 8. Giriş Sayfası (`/login`)
- [x] Email/şifre formu
- [x] Form validasyonu
- [x] Error mesajları
- [x] Kayıt sayfası linki

### 9. Kayıt Sayfası (`/register`)
- [x] Ad, soyad, email, şifre alanları
- [x] Form validasyonu
- [x] Error mesajları
- [x] Giriş sayfası linki

### 10. Ana Sayfa (`/`)
- [x] Hero section
- [x] Öne çıkan ihtiyaçlar
- [x] Kategori listesi

## Bileşenler

### NeedCard
Yeniden kullanılabilir ihtiyaç kartı bileşeni.

**Özellikler:**
- Resim gösterimi
- Başlık ve açıklama
- Fiyat aralığı
- Konum
- Aciliyet rozeti
- Kullanıcı bilgisi ve puanı
- Hover efektleri

**Props:**
```typescript
interface NeedCardProps {
  id: number;
  title: string;
  description: string;
  minPrice: number;
  maxPrice: number;
  location: string;
  urgency: 'low' | 'medium' | 'high';
  imageUrl?: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    rating: number;
    profileImageUrl?: string;
  };
  onClick?: () => void;
}
```

## Tasarım Sistemi

### Renkler
```typescript
const colors = {
  // Primary - Logo mor
  primary: '#7B2CBF',
  primaryLight: 'rgba(123, 44, 191, 0.1)',
  primaryDark: '#5A189A',

  // Secondary - Logo turuncu
  secondaryOrange: '#F59E0B',
  secondaryOrangeDark: '#D97706',

  // Semantic
  background: '#f8f9fa',
  surface: '#ffffff',
  text: '#1a1a1a',
  textSecondary: '#666666',
  border: '#e9ecef',
  error: '#dc3545',
  success: '#1e7e34',
  warning: '#ffc107',
  info: '#17a2b8',
};
```

### Tailwind Özelleştirmeleri
```javascript
// tailwind.config.js
colors: {
  primary: '#7B2CBF',
  'primary-light': 'rgba(123, 44, 191, 0.1)',
  'primary-dark': '#5A189A',
  secondary: '#F59E0B',
  'secondary-dark': '#D97706',
}
```

### Responsive Breakpoints
| Breakpoint | Min Width | Kullanım |
|------------|-----------|----------|
| sm | 640px | Küçük tabletler |
| md | 768px | Tabletler |
| lg | 1024px | Laptoplar |
| xl | 1280px | Masaüstü |
| 2xl | 1536px | Büyük ekranlar |

## API Entegrasyonu

Web uygulaması mobil ile aynı backend API'lerini kullanır.

**Base URL:** Environment değişkeninden (`VITE_API_URL`)

**Kullanılan Endpoint'ler:**
- `POST /api/auth/login` - Giriş
- `POST /api/auth/register` - Kayıt
- `GET /api/needs` - İhtiyaçları listele
- `GET /api/needs/:id` - İhtiyaç detayı
- `POST /api/needs` - İhtiyaç oluştur
- `PUT /api/needs/:id` - İhtiyaç güncelle
- `DELETE /api/needs/:id` - İhtiyaç sil
- `GET /api/offers` - Teklifleri listele
- `POST /api/offers` - Teklif oluştur
- `DELETE /api/offers/:id` - Teklifi geri çek
- `POST /api/offers/:id/accept` - Teklifi kabul et
- `POST /api/offers/:id/reject` - Teklifi reddet
- `GET /api/users/stats` - Kullanıcı istatistikleri
- `GET /api/categories` - Kategoriler

## Geliştirme Komutları

```bash
# Bağımlılıkları yükle
cd src/web
npm install

# Geliştirme sunucusu
npm run dev

# Production build
npm run build

# Build önizleme
npm run preview

# Lint kontrolü
npm run lint
```

## Build Bilgileri

**Son Build:** 2024
```
✓ 768 modules transformed.
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-*.css          35.04 kB │ gzip:   6.95 kB
dist/assets/index-*.js          390.58 kB │ gzip: 113.80 kB
✓ built in ~1.3s
```

## Backlog - Yapılacaklar

### Yüksek Öncelik
- [ ] Profil düzenleme sayfası (`/profile/edit`)
- [ ] Bildirimler sayfası (`/notifications`)
- [ ] Mesajlaşma/sohbet sayfası (`/chat/:id`)
- [ ] Sohbet listesi sayfası (`/conversations`)

### Orta Öncelik
- [ ] İhtiyaç düzenleme sayfası (`/needs/:id/edit`)
- [ ] Değerlendirme geçmişi sayfası (`/reviews`)
- [ ] İşlem geçmişi sayfası (`/transactions`)
- [ ] Şifremi unuttum sayfası

### Düşük Öncelik
- [ ] Hakkında sayfası
- [ ] Yardım/SSS sayfası
- [ ] Kullanım koşulları sayfası
- [ ] Gizlilik politikası sayfası

### İyileştirmeler
- [ ] PWA desteği (offline mode)
- [ ] Dark mode
- [ ] Infinite scroll (sayfalama yerine)
- [ ] Real-time bildirimler (SignalR)
- [ ] SEO optimizasyonu
- [ ] Performance optimizasyonu (lazy loading, code splitting)
- [ ] E2E testleri
- [ ] Unit testler

## Notlar

1. **Kimlik Doğrulama:** JWT token'lar localStorage'da saklanır
2. **Protected Routes:** Giriş gerektiren sayfalar otomatik yönlendirme yapar
3. **Türkçe UI:** Tüm metinler Türkçe olarak hazırlandı
4. **Responsive:** Mobil-first yaklaşımla tüm ekran boyutlarına uyumlu
5. **Mobil Uyumluluk:** Web tasarımı mobil uygulamayla görsel tutarlılık sağlar
