# Arayanibul - Öncelikli Görev Listesi

**Oluşturulma Tarihi**: 2025-09-30
**Son Güncelleme**: 2025-09-30 (Sprint 1 - UX & Visual Identity eklendi)
**Durum**: Aktif Sprint 1
**Tahmini Tamamlanma**: 1 hafta (Sprint 1), sonrası 2-3 hafta (Sprint 2+)

---

## 🚀 SPRINT 1 - UX & VISUAL IDENTITY (AKTIF)

**Sprint Hedefi**: Kullanıcı deneyimini kritik düzeyde iyileştirmek ve brand identity'yi güçlendirmek
**Sprint Süresi**: 7 gün
**Sprint Başlangıç**: 30 Eylül 2025
**Sprint Bitiş**: 7 Ekim 2025

### ✅ Tamamlanan Taskler

#### ARAB-301 - Ana Ekrana Login/Register Butonu Ekleme
**Öncelik**: 🔴 CRITICAL
**Süre**: Small (1 saat)
**Atanan**: mobile-feature-developer
**Durum**: ✅ Tamamlandı

**Açıklama**: Guest kullanıcılar ana ekranda giriş yapamıyordu, sadece + butonu üzerinden yönlendiriliyordu. Artık header'da belirgin "Giriş Yap" butonu var.

**Tamamlanan İşler**:
- HomeScreen header'ına auth button eklendi
- Guest: Login icon + AuthPromptModal
- Authenticated: Profile icon + navigate to Profile
- Accessibility labels eklendi

---

#### ARAB-302 - Logo Tabanlı Renk Paleti Oluşturma
**Öncelik**: 🔴 HIGH
**Süre**: Small (1 gün)
**Atanan**: mobile-ux-designer
**Durum**: ✅ Tamamlandı

**Açıklama**: Uygulama logosu güçlü renklere sahipti (purple/orange) ama tema monotondu. Logo renklerinden WCAG compliant renk paleti oluşturuldu.

**Tamamlanan İşler**:
- Primary Purple: #7B2CBF
- Secondary Orange: #F59E0B
- Light/dark variants
- Gradients (primary, secondary, purple-orange)
- Category colors (9 kategori)
- WCAG 2.1 AA compliance (4.5:1+ contrast)

---

#### ARAB-303 - HomeScreen'e Yeni Renk Şeması Uygulama
**Öncelik**: 🔴 HIGH
**Süre**: Medium (2 gün)
**Atanan**: mobile-feature-developer
**Durum**: ✅ Tamamlandı

**Açıklama**: HomeScreen'e yeni purple/orange renk paleti uygulandı. Header, search, FAB, empty state tüm componentler güncellendi.

**Tamamlanan İşler**:
- Header icons: Purple dark
- Search icon: Orange
- Search button: Orange background
- FAB: Purple gradient
- Empty state: Purple-orange gradient
- Filter badge: Orange
- RefreshControl: Purple

---

#### ARAB-305 - Button Component Renkli Variant'lar Ekleme
**Öncelik**: 🔴 HIGH
**Süre**: Small (1 gün)
**Atanan**: mobile-feature-developer
**Durum**: ✅ Tamamlandı

**Açıklama**: Button component'e yeni renk paletine uygun variant'lar eklendi. Tüm uygulamada tutarlı button tasarımı için.

**Tamamlanan İşler**:
- Primary variant: Purple background, white text
- Secondary variant: Orange background, white text
- Outline variant: Purple border/text
- Ghost variant: Transparent, purple text
- Gradient support
- Size variants (small, medium, large)
- Smooth press animations (Pressable + Animated)

---

### 🔄 Devam Eden Taskler

#### ARAB-304 - NeedCard Component Renklendirme ve Görsel İyileştirme
**Öncelik**: 🔴 HIGH
**Süre**: Medium (2 gün)
**Atanan**: mobile-ux-designer
**Durum**: 🔄 Devam Ediyor

**Açıklama**: NeedCard'ları daha eye-catching ve vibrant hale getir. Urgency badge, category, budget, offer count renklendiriliyor.

**Kabul Kriterleri**:
- [ ] Urgency badge: Urgent (orange), Normal (purple), Flexible (green)
- [ ] Category icon/label renkli
- [ ] Budget info: Orange vurgu
- [ ] Offer count badge: Orange background
- [ ] Card shadow: Purple tint
- [ ] Hover/press animasyonları

---

#### ARAB-306 - Kategori Renk Kodlama Sistemi
**Öncelik**: 🟡 MEDIUM
**Süre**: Medium (2 gün)
**Atanan**: mobile-ux-designer
**Durum**: 🔄 Devam Ediyor

**Açıklama**: Her kategori için unique renk ataması. Kullanıcılar kategorileri renkten tanıyacak.

**Kabul Kriterleri**:
- [ ] Her major category için unique color
- [ ] Renkler purple-orange palette'ine uyumlu
- [ ] Category badge/chip'lerde kullanım
- [ ] Filter modal'da görsel renklendirme
- [ ] WCAG compliant contrast ratios

---

### 📋 Sprint 1 Özet

| Task | Öncelik | Durum | Süre |
|------|---------|-------|------|
| ARAB-301 | CRITICAL | ✅ Tamamlandı | 1 saat |
| ARAB-302 | HIGH | ✅ Tamamlandı | 1 gün |
| ARAB-303 | HIGH | ✅ Tamamlandı | 2 gün |
| ARAB-305 | HIGH | ✅ Tamamlandı | 1 gün |
| ARAB-304 | HIGH | 🔄 Devam Ediyor | 2 gün |
| ARAB-306 | MEDIUM | 🔄 Devam Ediyor | 2 gün |

**Sprint İlerleme**: 4/6 tamamlandı (67%)
**Tahmini Kalan Süre**: 4 gün

---

## 📊 Mevcut Durum

- **Faz 1 (İlan Sistemi)**: ✅ 100% Tamamlandı
- **Faz 2 (Teklif Sistemi)**: ✅ 100% Tamamlandı
- **Faz 3 (Profil ve Güven)**: 🟡 60% Tamamlandı (3/5 özellik)
- **Faz 4 (Ödeme ve İşlem)**: 🔴 0% Tamamlandı (0/4 özellik)
- **Faz 5 (Analitik)**: 🟢 75% Tamamlandı (3/4 özellik)
- **Faz 6 (İşletme)**: 🔴 0% Tamamlandı (0/4 özellik)

**MVP Readiness**: Backend %85, Mobile %60, Testing %30, Deployment %0

---

## 🔧 BACKEND TASKLARI (3 Görev)

### ARAB-401 - Ödeme Gateway Entegrasyonu ve Transaction Sistemi
**Öncelik**: 🔴 HIGH
**Süre**: Large (4-5 gün)
**Atanan**: dotnet-backend-developer
**Bağımlılık**: Yok

**Açıklama**:
Türkiye pazarı için Iyzico/PayTR entegrasyonu ile güvenli ödeme altyapısı. Escrow (emanet) mantığı ile teklif kabul edilince ödeme alınacak, hizmet tamamlandığında sağlayıcıya aktarılacak.

**Kabul Kriterleri**:
- [ ] `/api/payment/initialize` endpoint'i oluşturulmalı (Iyzico/PayTR 3D Secure desteği)
- [ ] `/api/payment/callback` endpoint'i callback'leri işleyip Transaction tablosuna kaydetmeli
- [ ] `Transaction` modeli oluşturulmalı (Id, OfferId, BuyerId, ProviderId, Amount, Status, PaymentGateway, vb.)
- [ ] `/api/payment/release/{transactionId}` endpoint'i escrow'dan parayı transfer etmeli
- [ ] `/api/payment/refund/{transactionId}` endpoint'i ödeme iadesi yapabilmeli

**Dosyalar**:
- `src/backend/API/Services/PaymentService.cs` (yeni)
- `src/backend/API/Models/Transaction.cs` (yeni)
- `src/backend/API/Controllers/PaymentController.cs` (yeni)

**Teknik Notlar**:
- Iyzico.Payment NuGet paketi: `dotnet add package Iyzico`
- appsettings.json'a PaymentGateway config section ekle
- HTTPS zorunlu, webhook signature validation
- Transaction log tutulmalı (audit trail)

---

### ARAB-402 - Kimlik Doğrulama ve Güvenlik Rozeti Sistemi
**Öncelik**: 🔴 HIGH
**Süre**: Medium (2-3 gün)
**Atanan**: dotnet-backend-developer
**Bağımlılık**: Yok

**Açıklama**:
Kullanıcılar TC kimlik, telefon, email doğrulama yaparak güvenlik rozetleri kazanacak. Admin panelinden manuel onay sistemi.

**Kabul Kriterleri**:
- [ ] `UserVerification` tablosu oluşturulmalı (VerificationType, Status, DocumentUrls, vb.)
- [ ] `/api/verification/submit` endpoint'i doğrulama başvurusu almalı
- [ ] `/api/verification/verify-email` ve `/api/verification/verify-phone` endpoint'leri doğrulama yapmalı
- [ ] `/api/verification/status` endpoint'i kullanıcının tüm doğrulama durumlarını getirmeli
- [ ] `ApplicationUser` modeline `VerificationBadges` property'si eklenmeli

**Dosyalar**:
- `src/backend/API/Models/UserVerification.cs` (yeni)
- `src/backend/API/Services/VerificationService.cs` (yeni)
- `src/backend/API/Controllers/VerificationController.cs` (yeni)

**Teknik Notlar**:
- Email için mevcut SMTP, SMS için Twilio/Netgsm (mock başlangıçta)
- Kimlik belgeleri `wwwroot/uploads/verifications/` altında
- Rate limiting: 5 dakikada max 3 deneme
- Migration: `20250930_AddVerificationSystem.cs`

---

### ARAB-403 - Kullanıcı İstatistikleri ve Aktivite Metrikleri API
**Öncelik**: 🟡 MEDIUM
**Süre**: Small (1 gün)
**Atanan**: dotnet-backend-developer
**Bağımlılık**: Yok

**Açıklama**:
ProfileScreen'de "İstatistikler" şu anda boş gösteriyor. Backend verilerden istatistik hesaplayan endpoint.

**Kabul Kriterleri**:
- [ ] `/api/user/stats` endpoint'i mevcut kullanıcının istatistiklerini dönmeli
- [ ] Response: needsCount, offersGivenCount, completedTransactionsCount, totalSpent, totalEarned
- [ ] `/api/user/stats/{userId}` başka kullanıcıların PUBLIC istatistiklerini dönmeli
- [ ] UserService'e `GetUserStatistics` ve `GetPublicUserStatistics` methodları eklenmeli
- [ ] İstatistikler cache'lenmeli (5 dakika cache, user action'da invalidate)

**Dosyalar**:
- `src/backend/API/Models/UserDTOs.cs` (`UserStatisticsResponse` ekle)
- `src/backend/API/Services/UserService.cs` (güncelle)

**Teknik Notlar**:
- LINQ aggregate sorguları kullan
- Mevcut MemoryCacheService kullan
- ARAB-401 tamamlandıktan sonra Transaction data include et

---

## 📱 FRONTEND TASKLARI (4 Görev)

### ARAB-404 - Ödeme Ekranı ve Ödeme Akışı Implementasyonu
**Öncelik**: 🔴 HIGH
**Süre**: Medium (2-3 gün)
**Atanan**: mobile-feature-developer
**Bağımlılık**: ARAB-401

**Açıklama**:
Teklif kabul edildiğinde ödeme ekranı, WebView ile 3D Secure, callback handling.

**Kabul Kriterleri**:
- [ ] `PaymentScreen.tsx` oluşturulmalı ve offerId route parametresi almalı
- [ ] Ödeme formu: Kart numarası, son kullanma, CVV, kart sahibi adı
- [ ] "Ödemeyi Tamamla" butonu payment API'ye istek atmalı, 3D Secure URL'de WebView açmalı
- [ ] WebView callback URL yakalanmalı ve success/failure mesajı gösterilmeli
- [ ] Ödeme başarılıysa MyNeeds'e redirect ve toast mesajı

**Dosyalar**:
- `src/mobile/screens/PaymentScreen.tsx` (yeni)
- `src/mobile/services/paymentService.ts` (yeni)

**Teknik Notlar**:
- react-native-webview: `npm install react-native-webview`
- react-native-credit-card-input kullanılabilir
- Callback URL: `arayanibul://payment-callback?status=success`
- Linking API ile callback handle
- Network timeout: 30 saniye

---

### ARAB-405 - Bildirim Altyapısı ve Push Notification Entegrasyonu
**Öncelik**: 🔴 HIGH
**Süre**: Medium (2-3 gün)
**Atanan**: mobile-feature-developer
**Bağımlılık**: Yok

**Açıklama**:
Expo Notifications ile FCM/APNs entegrasyonu. Backend FCM token kaydetme zaten var.

**Kabul Kriterleri**:
- [ ] expo-notifications paketi kurulmalı ve permission handling yapılmalı
- [ ] AuthContext'te login sonrası FCM token alınıp backend'e gönderilmeli
- [ ] NotificationContext push notification listener eklenmeli (foreground, background, killed)
- [ ] Bildirime tıklandığında ilgili ekrana navigation yapılmalı
- [ ] NotificationsScreen'de server + local notifications merge edilip gösterilmeli

**Dosyalar**:
- `src/mobile/contexts/NotificationContext.tsx` (güncelle)
- `src/mobile/services/notificationService.ts` (güncelle)

**Teknik Notlar**:
- `npm install expo-notifications`
- app.json'a notification config: `{ "notification": { "icon": "..." } }`
- Token: `Notifications.getExpoPushTokenAsync()`
- Navigation: `Notifications.addNotificationResponseReceivedListener()`

---

### ARAB-406 - Profil İstatistikleri ve Aktivite Geçmişi Ekranı
**Öncelik**: 🟡 MEDIUM
**Süre**: Small (1 gün)
**Atanan**: mobile-feature-developer
**Bağımlılık**: ARAB-403

**Açıklama**:
ProfileScreen'de "-" gösterilen istatistikler gerçek verilerle doldurulacak. Yeni TransactionHistory ekranı.

**Kabul Kriterleri**:
- [ ] ProfileScreen'de `renderStats` güncellenmeli, `/api/user/stats` endpoint'inden veri çekilmeli
- [ ] İstatistik kartları: "X İhtiyaç Paylaştım", "Y Teklif Verdim", "Z İşlem Tamamladım"
- [ ] Yeni `TransactionHistoryScreen.tsx` oluşturulmalı, ProfileScreen'den navigate edilmeli
- [ ] TransactionHistory'de işlemler listelenmeli: tarih, başlık, tutar, durum
- [ ] Her transaction item'a tıklandığında invoice/receipt görüntülenebilmeli

**Dosyalar**:
- `src/mobile/screens/ProfileScreen.tsx` (güncelle)
- `src/mobile/screens/TransactionHistoryScreen.tsx` (yeni)
- `src/mobile/services/userService.ts` (getUserStats ekle)

**Teknik Notlar**:
- FlatList pagination: 20 item per page
- Pull-to-refresh implementasyonu
- Empty state: "Henüz tamamlanmış işleminiz yok"

---

### ARAB-407 - Arama ve Filtreleme UX İyileştirmesi
**Öncelik**: 🟡 MEDIUM
**Süre**: Medium (2-3 gün)
**Atanan**: mobile-feature-developer
**Bağımlılık**: Yok

**Açıklama**:
HomeScreen'de `showFilters` state var ama UI render edilmiyor. Bottom sheet ile gelişmiş filtre paneli.

**Kabul Kriterleri**:
- [ ] HomeScreen filter button'a basıldığında FilterModal/BottomSheet açılmalı
- [ ] Filtre seçenekleri: Kategori, min/max bütçe, konum (km), aciliyet pills
- [ ] "Filtreleri Uygula" butonu filtreleri state'e kaydetmeli ve loadNeeds tetiklemeli
- [ ] "Temizle" butonu tüm filtreleri reset etmeli
- [ ] Aktif filtre varsa search bar yanında badge gösterilmeli ("3 filtre aktif")

**Dosyalar**:
- `src/mobile/components/FilterModal.tsx` (yeni)
- `src/mobile/screens/HomeScreen.tsx` (güncelle)

**Teknik Notlar**:
- react-native-bottom-sheet veya modal
- Filter state AsyncStorage'da persist et
- Geolocation permission (konum filtresi için)

---

## 🎨 UI/UX İYİLEŞTİRME TASKLARI (3 Görev)

### ARAB-408 - HomeScreen ve NeedCard Redesign (Modern UI)
**Öncelik**: 🟡 MEDIUM
**Süre**: Medium (2-3 gün)
**Atanan**: mobile-ux-designer
**Bağımlılık**: Yok

**Açıklama**:
HomeScreen card'larını daha eye-catching ve bilgi hiyerarşisi net olacak şekilde redesign. Micro-interactions.

**Kabul Kriterleri**:
- [ ] NeedCard component ayrı dosyaya extract edilmeli (`NeedCard.tsx`)
- [ ] Card design: Shadow/elevation artırılmalı, image thumbnail eklenebilmeli, urgency badge prominent
- [ ] Hover/press animation: Pressable + scale animation (0.98 scale on press)
- [ ] Typography hierarchy: Title bold 18px, description 2 satır, meta info 12px secondary
- [ ] Empty state illustration eklenmeli (SVG veya Lottie)

**Dosyalar**:
- `src/mobile/components/NeedCard.tsx` (yeni)
- `src/mobile/screens/HomeScreen.tsx` (güncelle)

**Teknik Notlar**:
- Animated API: `useAnimatedStyle` ve `withSpring`
- LazyImage component kullan
- Accessibility: accessibilityLabel, accessibilityRole

---

### ARAB-409 - Onboarding ve İlk Kullanıcı Deneyimi
**Öncelik**: 🔴 HIGH
**Süre**: Medium (2-3 gün)
**Atanan**: mobile-ux-designer
**Bağımlılık**: Yok

**Açıklama**:
3 ekranlı swiper onboarding + guest mode açıklaması + conversion prompts optimization.

**Kabul Kriterleri**:
- [ ] `OnboardingScreen.tsx` oluşturulmalı: 3 slide ("Aradığını Paylaş", "Teklifler Al", "Güvenli Öde")
- [ ] Her slide illustration (SVG/Lottie), başlık, açıklama, progress dots
- [ ] Son slide: "Hemen Başla" (register) ve "Misafir Olarak Devam Et" butonları
- [ ] AsyncStorage'da `hasSeenOnboarding` flag, ikinci açılışta gösterilmemeli
- [ ] Guest mode'da her 5 action'da conversion prompt (mevcut ConversionBanner optimize)

**Dosyalar**:
- `src/mobile/screens/OnboardingScreen.tsx` (yeni)
- `src/mobile/App.tsx` (güncelle)

**Teknik Notlar**:
- react-native-swiper veya FlatList horizontal
- Lottie: `npm install lottie-react-native`
- AsyncStorage check App.tsx'te

---

### ARAB-410 - Accessibility ve Responsive Design İyileştirmeleri
**Öncelik**: 🟢 LOW
**Süre**: Medium (2-3 gün)
**Atanan**: mobile-ux-designer
**Bağımlılık**: Yok

**Açıklama**:
WCAG 2.1 AA uyumu. Screen reader desteği, color contrast, touch target size minimum 44x44.

**Kabul Kriterleri**:
- [ ] Tüm TouchableOpacity/Pressable'a `accessibilityLabel` ve `accessibilityRole` eklenmeli
- [ ] Text input'lara `accessibilityLabel` ve `accessibilityHint` eklenmeli
- [ ] Color contrast ratio minimum 4.5:1 (theme/colors.ts kontrolü)
- [ ] Touch target minimum 44x44 pt (Button.tsx check)
- [ ] Dynamic type support: `allowFontScaling={true}`

**Dosyalar**:
- Tüm component dosyaları (accessibility props ekle)
- `src/mobile/theme/colors.ts` (contrast check)

**Teknik Notlar**:
- WebAIM Contrast Checker tool kullan
- iOS VoiceOver ve Android TalkBack ile test
- Focus management: autoFocus on modals

---

## 📅 Sprint Planı

### Sprint 1 (Hafta 1)
**Backend Track**:
- ✅ ARAB-401 (Ödeme Gateway) - 4-5 gün
- ✅ ARAB-402 (Kimlik Doğrulama) - 2-3 gün başlangıç

**Frontend Track**:
- ✅ ARAB-405 (Push Notifications) - 2-3 gün
- ✅ ARAB-407 (Filtreleme) - 2-3 gün başlangıç

**UI/UX Track**:
- ✅ ARAB-409 (Onboarding) - 2-3 gün

### Sprint 2 (Hafta 2)
**Backend Track**:
- ✅ ARAB-402 (devam) - bitir
- ✅ ARAB-403 (İstatistikler) - 1 gün

**Frontend Track**:
- ✅ ARAB-404 (Ödeme Ekranı) - 2-3 gün
- ✅ ARAB-406 (Profil Stats) - 1 gün
- ✅ ARAB-407 (devam) - bitir

**UI/UX Track**:
- ✅ ARAB-408 (HomeScreen Redesign) - 2-3 gün
- ✅ ARAB-410 (Accessibility) - 2-3 gün

---

## 🎯 Kritik Path ve Bağımlılıklar

```
ARAB-401 (Backend Payment) → ARAB-404 (Frontend Payment)
ARAB-403 (Backend Stats) → ARAB-406 (Frontend Profile Stats)
```

**Paralel Çalışma**:
- ARAB-402, ARAB-405, ARAB-407, ARAB-408, ARAB-409, ARAB-410 bağımsız

---

## 📊 Özet

| Kategori | Task Sayısı | Toplam Süre |
|----------|-------------|-------------|
| Backend | 3 | 7-9 gün |
| Frontend | 4 | 7-9 gün |
| UI/UX | 3 | 7-9 gün |
| **TOPLAM** | **10** | **21-27 gün** |

**3 developer ile paralel çalışma**: 2-3 hafta

---

## ⚠️ Risk ve Notlar

1. **Ödeme Gateway**: Iyzico/PayTR test hesabı ve API key'leri gerekli
2. **Push Notifications**: Native build gerekebilir (Expo Go'da sınırlı)
3. **Kimlik Doğrulama**: SMS gateway (Twilio/Netgsm) ücretli, başlangıçta mock kullanılabilir
4. **Testing**: Her task için unit test yazılmalı
5. **Documentation**: API endpoint'leri Swagger'a eklenip dokümante edilmeli