# Arayanibul - MVP Backlog Önceliklendirme

**Oluşturulma Tarihi**: 2025-12-29
**Product Manager**: Arayanibul Team
**Durum**: Aktif
**MVP Hedef Tarihi**: 2-3 hafta

---

## Executive Summary

### Current Status
- **Backend API**: 90% Complete - Core functionality ready, payment & verification implemented
- **Mobile App**: 75% Complete - Auth works, Need creation works, UI/UX significantly improved
- **Critical Path**: Login → Register → Create Need → Receive Offers → Complete Transaction

### MVP Blocker Analysis
**Critical Finding**: Core user journey is FUNCTIONAL but needs refinement:
- ✅ User can login/register (email + guest mode working)
- ✅ User can create Need (CreateNeedScreen functional)
- ✅ Basic flow working end-to-end
- ⚠️ Missing: Device tracking for guest-to-registered conversion analytics
- ⚠️ Missing: Production deployment readiness (AWS partially configured)
- ⚠️ Missing: Comprehensive testing

---

## Roadmap Completion Status

Based on `/docs/FEATURES_ROADMAP.md`:

| Phase | Status | Completion | Critical for MVP? |
|-------|--------|------------|-------------------|
| MVP (Auth/UI) | ✅ Complete | 100% | YES |
| Phase 1 (İlan Sistemi) | ✅ Complete | 100% | YES |
| Phase 2 (Teklif Sistemi) | ✅ Complete | 100% | YES |
| Phase 3 (Profil & Güven) | 🟡 Partial | 60% (3/5) | PARTIAL |
| Phase 4 (Ödeme) | ✅ Complete | 100% | YES |
| Phase 5 (Analitik) | 🟢 Partial | 75% (3/4) | NO |
| Phase 6 (İşletme) | 🔴 Not Started | 0% | NO |
| Phase 7 (Platform) | 🟡 Partial | 25% (1/4) | NO |

### Phase 7 Progress (Platform Genişletme)
- ✅ Web uygulaması (React + Vite + Tailwind CSS) - 9 sayfa tamamlandı
- ⚠️ Admin paneli (backlog'da)
- ⚠️ Çok dilli destek (backlog'da)
- ⚠️ Uluslararası genişleme (backlog'da)

### Phase 3 Gaps (Profil ve Güven)
- ✅ Kullanıcı profilleri
- ✅ Değerlendirme sistemi
- ⚠️ Kimlik doğrulama (backend ready, mobile UI incomplete)
- ⚠️ Güvenlik rozeti sistemi (backend ready, mobile UI incomplete)
- ⚠️ Geçmiş işlemler (missing)

---

## 🎯 MVP Priority Categorization

### P0 - CRITICAL (MVP Blockers)
**Definition**: Must be completed for MVP launch. Core user journey breaks without these.

#### Current Status: 0 blockers
**All P0 items are COMPLETE!** 🎉
- ✅ Login/Register working
- ✅ Need creation working
- ✅ Offer system working
- ✅ Messaging working
- ✅ Payment system implemented

### P1 - HIGH (MVP Enhancement)
**Definition**: Significantly improves user experience. Should be done before launch if possible.

**Total: 4 tasks**

1. **ARAB-415: Device/Installation ID Tracking for Guest Journey Analytics**
2. **ARAB-416: Transaction History Screen Implementation**
3. **ARAB-417: Verification Badge UI Integration**
4. **ARAB-418: Production Deployment & Monitoring Setup**

### P2 - MEDIUM (Post-MVP Priority)
**Definition**: Important features that enhance platform but not critical for initial launch.

**Total: 6 tasks**

5. **ARAB-419: Advanced Filter UX Improvements**
6. **ARAB-420: Onboarding Screen Polish**
7. **ARAB-421: Push Notification Deep Linking**
8. **ARAB-422: User Statistics Dashboard**
9. **ARAB-423: A/B Testing Infrastructure**
10. **ARAB-424: Performance Optimization**

### P3 - LOW (Nice to Have)
**Definition**: Quality-of-life improvements, non-critical polish.

**Total: 3 tasks**

11. **ARAB-425: Accessibility Audit Implementation**
12. **ARAB-426: Multi-language Support Foundation**
13. **ARAB-427: Admin Panel Prototype**

---

## 📋 Detailed Task Breakdown

## P1 - HIGH PRIORITY TASKS

---

### Task: ARAB-415 - Device/Installation ID Tracking for Guest Journey Analytics

**Priority**: 🔴 P1-HIGH - Critical for understanding user acquisition and conversion funnel
**Assigned To**: full-stack-developer
**Estimated Effort**: Medium (2-3 days)
**Dependencies**: None

**Description**:
As a Product Manager, I need to track guest users' journey from anonymous browsing to registration so that I can measure conversion rates and optimize the onboarding funnel. Currently, we have `guestActions` tracking in AuthContext but no persistent device identifier that survives app reinstalls or account creation.

This task implements:
1. Unique device/installation ID generation (persists across sessions)
2. Backend tracking of device-to-user association
3. Analytics endpoints to measure guest → registered user conversion
4. Conversion funnel reporting

**Acceptance Criteria**:
1. Mobile app generates unique installation ID on first launch using `expo-application` (getInstallationIdAsync) and stores in AsyncStorage with fallback to UUID
2. Device ID is sent with all API requests via custom header `X-Device-ID` (both guest and authenticated)
3. Backend `DeviceInstallation` model created with fields: Id, DeviceId, UserId (nullable), FirstSeenAt, LastSeenAt, Platform, AppVersion, IsConverted
4. Backend `/api/analytics/device/{deviceId}` endpoint returns device journey: actions taken, conversion status, time to conversion
5. Backend `/api/analytics/conversion-funnel` endpoint returns aggregated metrics: total devices, guest actions per device avg, conversion rate, time to conversion median

**Technical Notes**:
- **Mobile**:
  - Install: `npx expo install expo-application`
  - Use `Application.getInstallationIdAsync()` for persistent ID
  - Add device ID to axios interceptor in `src/mobile/services/api.ts`
  - Track in AuthContext: on guestContinue(), register(), convertGuestToUser()

- **Backend**:
  - New model: `src/backend/API/Models/DeviceInstallation.cs`
  - New controller: `src/backend/API/Controllers/AnalyticsController.cs`
  - Middleware: `DeviceTrackingMiddleware.cs` to capture device ID from headers
  - Migration: `20251229_AddDeviceTracking.cs`
  - Index on DeviceId for fast lookups

**Files**:
- `src/mobile/services/api.ts` (add device ID to headers)
- `src/mobile/contexts/AuthContext.tsx` (track device on auth events)
- `src/backend/API/Models/DeviceInstallation.cs` (new)
- `src/backend/API/Controllers/AnalyticsController.cs` (new)
- `src/backend/API/Middleware/DeviceTrackingMiddleware.cs` (new)

**Success Metrics**:
- Device ID present in 100% of API requests
- Conversion funnel data available in analytics dashboard
- Can answer: "How many guest users convert to registered users?"
- Can answer: "What's the average time from first app open to registration?"

---

### Task: ARAB-416 - Transaction History Screen Implementation

**Priority**: 🔴 P1-HIGH - Users need to see their payment history
**Assigned To**: frontend-developer
**Estimated Effort**: Small (1 day)
**Dependencies**: ARAB-403 (User Stats API - ✅ Complete)

**Description**:
As a user, I want to see my complete transaction history (payments made, payments received) so that I can track my spending and earnings on the platform.

ProfileScreen currently shows "-" for statistics. ARAB-403 implemented the backend API. This task creates the mobile UI to display transaction history with pagination.

**Acceptance Criteria**:
1. ProfileScreen "İşlem Geçmişi" button navigates to new `TransactionHistoryScreen`
2. TransactionHistoryScreen fetches from `/api/user/transactions` with pagination (20 items per page)
3. Each transaction card shows: date, need title, amount, status (pending/completed/refunded), transaction type (sent/received)
4. Pull-to-refresh implemented to reload transactions
5. Empty state shown: "Henüz tamamlanmış işleminiz yok"

**Technical Notes**:
- FlatList with `onEndReached` for pagination
- Transaction status colors: pending (orange), completed (green), refunded (red)
- Use existing theme colors for consistency
- Add transaction icon based on type (sent: arrow-up, received: arrow-down)

**Files**:
- `src/mobile/screens/TransactionHistoryScreen.tsx` (new)
- `src/mobile/screens/ProfileScreen.tsx` (add navigation button)
- `src/mobile/services/userService.ts` (add getTransactions method)

---

### Task: ARAB-417 - Verification Badge UI Integration

**Priority**: 🔴 P1-HIGH - Trust is critical for marketplace success
**Assigned To**: frontend-developer
**Estimated Effort**: Medium (2 days)
**Dependencies**: ARAB-402 (Verification API - ✅ Complete)

**Description**:
As a user, I want to see verification badges on user profiles so that I can trust service providers and know who has been identity-verified.

Backend verification system (ARAB-402) is complete. This task integrates verification UI into mobile app: submission flow, badge display, verification status.

**Acceptance Criteria**:
1. ProfileScreen shows current user's verification badges (email verified, phone verified, ID verified)
2. New `VerificationScreen` allows users to submit verification documents (photo upload for ID)
3. Email/phone verification triggers OTP flow (use existing notification system)
4. Other users' profiles show verification badges (read-only)
5. Badge icons: email (✉️ checkmark), phone (📱 checkmark), ID (🆔 checkmark) with appropriate colors

**Technical Notes**:
- Use expo-image-picker for ID document upload
- Verification status colors: verified (green), pending (orange), not verified (gray)
- Add badge component: `src/mobile/components/VerificationBadge.tsx`
- Integrate with UserController `/api/user/verification/status`

**Files**:
- `src/mobile/screens/VerificationScreen.tsx` (new)
- `src/mobile/components/VerificationBadge.tsx` (new)
- `src/mobile/screens/ProfileScreen.tsx` (display badges)
- `src/mobile/services/verificationService.ts` (new)

---

### Task: ARAB-418 - Production Deployment & Monitoring Setup

**Priority**: 🔴 P1-HIGH - Must be production-ready before MVP launch
**Assigned To**: backend-developer + devops
**Estimated Effort**: Large (3-4 days)
**Dependencies**: None

**Description**:
As a Product Manager, I need the application deployed to production with proper monitoring, logging, and error tracking so that we can launch the MVP and respond to issues quickly.

Recent commits show AWS deployment in progress. This task completes production readiness:
1. Complete AWS deployment (EC2 backend already configured per git history)
2. Mobile app build for App Store/Play Store
3. Monitoring and alerting setup
4. Production database setup and migration

**Acceptance Criteria**:
1. Backend API deployed to AWS EC2 with PostgreSQL database (production URL: configured per recent commits)
2. SSL certificate configured and HTTPS enforced
3. Mobile app production build tested (Expo EAS build for iOS + Android)
4. Error tracking setup (Sentry or similar) for both backend and mobile
5. Monitoring dashboard configured: uptime, error rates, API response times

**Technical Notes**:
- Use existing AWS EC2 deployment (mobile app already points to production URL per recent commits)
- Database: PostgreSQL on AWS RDS (migrate from SQLite)
- SSL: Let's Encrypt or AWS Certificate Manager
- Monitoring: AWS CloudWatch + Sentry
- Mobile build: `eas build --platform all`
- Environment variables: production secrets in AWS Secrets Manager

**Files**:
- `/docs/AWS_DEPLOYMENT_CHECKLIST.md` (update with completion status)
- `src/backend/API/appsettings.Production.json` (production config)
- `src/mobile/app.json` (production build config)
- `eas.json` (EAS build configuration)

---

## P2 - MEDIUM PRIORITY TASKS

---

### Task: ARAB-419 - Advanced Filter UX Improvements

**Priority**: 🟡 P2-MEDIUM - Enhances search experience but core search works
**Assigned To**: frontend-developer
**Estimated Effort**: Medium (2-3 days)
**Dependencies**: None

**Description**:
As a user, I want advanced filtering options (category, budget range, location, urgency) presented in an intuitive bottom sheet UI so that I can find relevant needs quickly.

HomeScreen currently has basic search. ARAB-407 in PRIORITY_TASKS.md outlines filter modal. Recent commits show FilterModal redesign completed (ARAB-413). This task refines and completes the implementation.

**Acceptance Criteria**:
1. Filter button in HomeScreen opens FilterModal bottom sheet
2. Filter options: category multi-select, min/max budget sliders, location radius (km), urgency pills
3. "Uygula" button applies filters and closes modal
4. "Temizle" button resets all filters
5. Active filter count badge shown next to search bar ("3 filtre aktif")

**Technical Notes**:
- FilterModal component exists (per ARAB-413), verify completeness
- Persist filter state in AsyncStorage for session continuity
- Use react-native-slider for budget range
- Geolocation permission required for location-based filtering

**Files**:
- `src/mobile/components/FilterModal.tsx` (verify/complete)
- `src/mobile/screens/HomeScreen.tsx` (integrate filter state)

---

### Task: ARAB-420 - Onboarding Screen Polish

**Priority**: 🟡 P2-MEDIUM - First impression matters but core flows work
**Assigned To**: ui-ux-specialist
**Estimated Effort**: Medium (2 days)
**Dependencies**: None

**Description**:
As a new user, I want a delightful onboarding experience with clear illustrations and value propositions so that I understand how Arayanibul works before I start using it.

App.tsx shows OnboardingScreen implemented. ARAB-409 in PRIORITY_TASKS.md describes requirements. This task polishes the implementation with animations and illustrations.

**Acceptance Criteria**:
1. 3 onboarding slides with Lottie animations: "Aradığını Paylaş", "Teklifler Al", "Güvenli Öde"
2. Smooth swipe transitions between slides
3. Progress dots indicator at bottom
4. Final slide has "Hemen Başla" (register) and "Misafir Olarak Devam Et" (guest) buttons
5. AsyncStorage flag prevents showing onboarding on subsequent launches

**Technical Notes**:
- Lottie animations: use free animations from LottieFiles
- Swiper: FlatList with horizontal pagination
- Skip button on all slides except last
- Accessibility: VoiceOver support for slide content

**Files**:
- `src/mobile/src/screens/OnboardingScreen.tsx` (polish existing)
- `src/mobile/assets/lottie/` (add animation files)
- `src/mobile/App.tsx` (onboarding flow already integrated)

---

### Task: ARAB-421 - Push Notification Deep Linking

**Priority**: 🟡 P2-MEDIUM - Improves engagement but notifications work
**Assigned To**: frontend-developer
**Estimated Effort**: Medium (2 days)
**Dependencies**: ARAB-405 (Push Notifications - from PRIORITY_TASKS.md)

**Description**:
As a user, when I tap a push notification about a new offer or message, I want to be taken directly to the relevant screen (NeedDetail, Chat) so that I can respond quickly.

NotificationContext exists and push notifications work (per ARAB-405). This task adds deep linking from notifications to specific screens.

**Acceptance Criteria**:
1. Notification payload includes `targetScreen` and `targetId` (e.g., `{targetScreen: 'NeedDetail', targetId: 123}`)
2. Tapping notification navigates to correct screen with parameters
3. Works in all app states: foreground, background, killed
4. Handles authentication: if guest user taps, show auth prompt then navigate after login
5. Notification listener registered in NotificationContext

**Technical Notes**:
- Use expo-notifications `addNotificationResponseReceivedListener`
- Navigation reference: `navigationRef.current.navigate()`
- Handle edge cases: screen doesn't exist, invalid ID, network error
- Test with FCM test messages

**Files**:
- `src/mobile/contexts/NotificationContext.tsx` (add deep linking logic)
- `src/mobile/App.tsx` (pass navigation ref to context)

---

### Task: ARAB-422 - User Statistics Dashboard

**Priority**: 🟡 P2-MEDIUM - Nice analytics feature, not critical for MVP
**Assigned To**: frontend-developer
**Estimated Effort**: Small (1 day)
**Dependencies**: ARAB-403 (Stats API - ✅ Complete)

**Description**:
As a user, I want to see my activity statistics (needs posted, offers given, success rate) in a dashboard so that I can understand my platform engagement.

Backend ARAB-403 provides `/api/user/stats` endpoint. ProfileScreen shows placeholders. This task creates a dedicated stats dashboard screen.

**Acceptance Criteria**:
1. ProfileScreen "İstatistikler" button navigates to `StatsScreen`
2. StatsScreen displays: total needs, total offers given, completed transactions, success rate
3. Visual charts: pie chart for need categories, bar chart for monthly activity
4. Data refreshes on pull-to-refresh
5. Loading and error states handled

**Technical Notes**:
- Chart library: react-native-chart-kit or victory-native
- Calculate success rate: completed transactions / total offers
- Cache stats data for 5 minutes (reduce API calls)
- Empty state: "İlk ihtiyacınızı oluşturun!"

**Files**:
- `src/mobile/screens/StatsScreen.tsx` (new)
- `src/mobile/screens/ProfileScreen.tsx` (add navigation)
- `src/mobile/services/userService.ts` (getUserStats already exists)

---

### Task: ARAB-423 - A/B Testing Infrastructure

**Priority**: 🟡 P2-MEDIUM - Future optimization, not needed for initial MVP
**Assigned To**: backend-developer
**Estimated Effort**: Medium (2-3 days)
**Dependencies**: None

**Description**:
As a Product Manager, I want A/B testing infrastructure so that I can experiment with different UX flows and measure conversion improvements.

This sets up foundation for experimentation: feature flags, variant assignment, metric tracking.

**Acceptance Criteria**:
1. Feature flag system implemented: backend serves feature toggles via `/api/config/features`
2. Device/user-based variant assignment (50/50 split, deterministic by device ID)
3. Mobile app checks feature flags on app start and caches locally
4. Event tracking for A/B test metrics (button clicks, conversions)
5. Admin endpoint to configure experiments: `/api/admin/experiments`

**Technical Notes**:
- Use deterministic hash for variant assignment (deviceId → variant A or B)
- Feature flags stored in database: `Experiment` table
- Mobile: AsyncStorage caches feature flags
- Track events in analytics: "Variant A: CreateNeed button clicked"

**Files**:
- `src/backend/API/Models/Experiment.cs` (new)
- `src/backend/API/Controllers/ConfigController.cs` (new)
- `src/mobile/services/experimentService.ts` (new)
- `src/mobile/contexts/ExperimentContext.tsx` (new)

---

### Task: ARAB-424 - Performance Optimization

**Priority**: 🟡 P2-MEDIUM - App performs adequately, optimization improves UX
**Assigned To**: full-stack-developer
**Estimated Effort**: Medium (3 days)
**Dependencies**: None

**Description**:
As a user, I want the app to load quickly and respond smoothly so that I have a delightful experience.

Current app works but has room for optimization: image loading, API response times, database queries.

**Acceptance Criteria**:
1. Mobile app launch time < 3 seconds (measured on mid-range Android device)
2. Screen transitions < 500ms (measured with React Native performance monitor)
3. Backend API response time < 2 seconds for all endpoints (95th percentile)
4. Image loading optimized: lazy loading, caching, compression
5. Database queries optimized: add indexes, eliminate N+1 queries

**Technical Notes**:
- **Mobile**:
  - Use react-native-fast-image for image caching
  - Implement FlatList windowSize optimization
  - Memoize expensive components (React.memo)
  - Profile with React DevTools Profiler

- **Backend**:
  - Add database indexes on foreign keys
  - Use EF Core Include() to prevent N+1
  - Implement response caching for static data
  - Profile with MiniProfiler

**Files**:
- `src/mobile/components/NeedCard.tsx` (optimize rendering)
- `src/mobile/screens/HomeScreen.tsx` (FlatList optimization)
- `src/backend/API/Controllers/NeedController.cs` (add includes)
- Database migration for indexes

---

## P3 - LOW PRIORITY TASKS

---

### Task: ARAB-425 - Accessibility Audit Implementation

**Priority**: 🟢 P3-LOW - Important for inclusivity, not MVP blocker
**Assigned To**: ui-ux-specialist
**Estimated Effort**: Medium (2-3 days)
**Dependencies**: None

**Description**:
As a Product Manager, I want the app to be accessible to all users including those with disabilities so that we comply with WCAG 2.1 AA standards.

ARAB-410 in PRIORITY_TASKS.md outlines accessibility requirements. `/docs/ACCESSIBILITY_AUDIT.md` may exist.

**Acceptance Criteria**:
1. All touchable elements have `accessibilityLabel` and `accessibilityRole`
2. Text inputs have `accessibilityHint` for screen readers
3. Color contrast ratio ≥ 4.5:1 for all text (verify with WebAIM checker)
4. Touch targets ≥ 44x44 pt minimum
5. Dynamic font scaling supported (`allowFontScaling={true}`)

**Technical Notes**:
- Test with iOS VoiceOver and Android TalkBack
- Use eslint-plugin-jsx-a11y for automated checks
- Document accessibility features in README

**Files**:
- All components (add accessibility props)
- `src/mobile/theme/colors.ts` (verify contrast ratios)
- `/docs/ACCESSIBILITY_AUDIT.md` (update with results)

---

### Task: ARAB-426 - Multi-language Support Foundation

**Priority**: 🟢 P3-LOW - Future expansion feature
**Assigned To**: frontend-developer
**Estimated Effort**: Medium (2-3 days)
**Dependencies**: None

**Description**:
As a Product Manager, I want multi-language support infrastructure so that we can expand to international markets.

This sets up i18n foundation with Turkish as default, English as secondary.

**Acceptance Criteria**:
1. i18n library integrated (react-i18next or expo-localization)
2. All hardcoded strings extracted to language files: `tr.json`, `en.json`
3. Language switcher in ProfileScreen settings
4. User language preference persisted in AsyncStorage
5. RTL support prepared (layout doesn't break)

**Technical Notes**:
- Use expo-localization for device locale detection
- Namespace translations by screen: `home.title`, `profile.stats`
- Backend API can return localized content (future: category names in multiple languages)

**Files**:
- `src/mobile/i18n/` (new directory)
- `src/mobile/i18n/tr.json` (new)
- `src/mobile/i18n/en.json` (new)
- All screen files (replace hardcoded strings)

---

### Task: WEB-010 - Web Profil Düzenleme Sayfası

**Priority**: 🟡 P2-MEDIUM - Web kullanıcılarının profil düzenlemesi için gerekli
**Assigned To**: web-feature-developer
**Estimated Effort**: Small (1 day)
**Dependencies**: WEB-009 (Profile Page - ✅ Complete)

**Description**:
Web kullanıcılarının profil bilgilerini düzenleyebilmesi için `/profile/edit` sayfasının oluşturulması.

**Acceptance Criteria**:
1. Profil sayfasından "Profili Düzenle" butonu `/profile/edit` sayfasına yönlendirir
2. Form alanları: Ad, soyad, email, telefon, profil resmi
3. Form validasyonu (required alanlar, email format)
4. Kaydet butonu ile API çağrısı
5. Loading/error/success durumları

**Files**:
- `src/web/src/pages/EditProfilePage.tsx` (new)
- `src/web/src/App.tsx` (add route)

---

### Task: WEB-011 - Web Bildirimler Sayfası

**Priority**: 🟡 P2-MEDIUM - Kullanıcı engagement için önemli
**Assigned To**: web-feature-developer
**Estimated Effort**: Medium (2 days)
**Dependencies**: NotificationController (Backend - ✅ Complete)

**Description**:
Web kullanıcılarının bildirimlerini görebilmesi için `/notifications` sayfasının oluşturulması.

**Acceptance Criteria**:
1. Bildirim listesi (yeni teklifler, mesajlar, kabul/red bildirimleri)
2. Okundu/okunmadı durumu gösterimi
3. Tıklayınca ilgili sayfaya yönlendirme
4. "Tümünü Okundu İşaretle" butonu
5. Sayfalama ve pull-to-refresh

**Files**:
- `src/web/src/pages/NotificationsPage.tsx` (new)
- `src/web/src/services/api.ts` (add notification methods)
- `src/web/src/App.tsx` (add route)

---

### Task: WEB-012 - Web Mesajlaşma Sayfası

**Priority**: 🟡 P2-MEDIUM - Alıcı-satıcı iletişimi için kritik
**Assigned To**: web-feature-developer
**Estimated Effort**: Large (3-4 days)
**Dependencies**: MessageController + SignalR (Backend - ✅ Complete)

**Description**:
Web kullanıcılarının mesajlaşabilmesi için sohbet sistemi. SignalR ile real-time mesajlaşma.

**Acceptance Criteria**:
1. `/conversations` - Sohbet listesi sayfası
2. `/chat/:id` - Sohbet detay sayfası
3. Real-time mesaj alımı (SignalR)
4. Mesaj gönderme formu
5. Okundu durumu gösterimi
6. Sohbet geçmişi scrollable

**Files**:
- `src/web/src/pages/ConversationsPage.tsx` (new)
- `src/web/src/pages/ChatPage.tsx` (new)
- `src/web/src/services/signalr.ts` (new - SignalR client)
- `src/web/src/App.tsx` (add routes)

---

### Task: WEB-013 - Web İhtiyaç Düzenleme Sayfası

**Priority**: 🟡 P2-MEDIUM - İçerik yönetimi için gerekli
**Assigned To**: web-feature-developer
**Estimated Effort**: Small (1 day)
**Dependencies**: WEB-005 (Create Need - ✅ Complete)

**Description**:
Mevcut ihtiyaçların düzenlenmesi için `/needs/:id/edit` sayfası.

**Acceptance Criteria**:
1. CreateNeedPage ile aynı form yapısı
2. Mevcut verilerle doldurulmuş form
3. Sadece ihtiyaç sahibi erişebilir
4. Güncelle butonu ile API çağrısı
5. Başarılı güncelleme sonrası detay sayfasına yönlendirme

**Files**:
- `src/web/src/pages/EditNeedPage.tsx` (new)
- `src/web/src/App.tsx` (add route)

---

### Task: ARAB-427 - Admin Panel Prototype

**Priority**: 🟢 P3-LOW - Operational tool, not end-user facing
**Assigned To**: full-stack-developer
**Estimated Effort**: Large (5 days)
**Dependencies**: None

**Description**:
As an admin, I want a web-based admin panel so that I can manage users, verify identities, moderate content, and view analytics.

Roadmap Phase 7 includes admin panel. This task creates MVP admin interface.

**Acceptance Criteria**:
1. Admin web app built with React (or Next.js)
2. Admin authentication: separate admin login with role-based access
3. User management: view users, edit profiles, ban/suspend accounts
4. Verification approval: view submitted documents, approve/reject identity verification
5. Analytics dashboard: key metrics (DAU, MAU, conversion rate, transaction volume)

**Technical Notes**:
- Separate repository: `arayanibul-admin` or within `/src/admin/`
- Use existing backend API with admin-only endpoints
- Add admin role to ApplicationUser model
- UI framework: Material-UI or Ant Design

**Files**:
- `src/admin/` (new React app)
- `src/backend/API/Controllers/AdminController.cs` (new)
- Backend: add `[Authorize(Roles = "Admin")]` to admin endpoints

---

## 🚀 Recommended Sprint Plan

### Sprint 1 (Week 1) - HIGH PRIORITY
**Goal**: Complete P1 tasks to make MVP production-ready

**Backend Track** (backend-developer):
- ARAB-415: Device tracking (2 days)
- ARAB-418: AWS deployment completion (2 days)

**Frontend Track** (frontend-developer):
- ARAB-416: Transaction History (1 day)
- ARAB-417: Verification UI (2 days)

**Total Duration**: 5 working days with 2 developers in parallel

---

### Sprint 2 (Week 2) - MEDIUM PRIORITY
**Goal**: Polish user experience and add engagement features

**All Developers**:
- ARAB-419: Filter improvements (2 days)
- ARAB-420: Onboarding polish (2 days)
- ARAB-421: Notification deep linking (2 days)
- ARAB-422: Stats dashboard (1 day)

**Total Duration**: 7 days with parallelization

---

### Sprint 3+ (Post-MVP) - LOW PRIORITY
**Goal**: Continuous improvement and expansion

- ARAB-423: A/B testing (3 days)
- ARAB-424: Performance optimization (3 days)
- ARAB-425: Accessibility (3 days)
- ARAB-426: i18n foundation (3 days)
- ARAB-427: Admin panel (5 days)

---

## 📊 Summary Dashboard

| Priority | Total Tasks | Total Effort | MVP Required? |
|----------|-------------|--------------|---------------|
| P0 (Critical) | 0 | 0 days | ✅ ALL COMPLETE |
| P1 (High) | 4 | 8-10 days | YES |
| P2 (Medium) | 10 | 18-22 days | RECOMMENDED |
| P3 (Low) | 3 | 12-15 days | OPTIONAL |
| **TOTAL** | **17** | **38-47 days** | - |

**Web Platform Progress**:
| Kategori | Tamamlanan | Kalan |
|----------|------------|-------|
| Temel Sayfalar | 9 | 0 |
| İkincil Sayfalar | 0 | 4 |

**With 2 developers in parallel**: P1 tasks = 1 week, P1+P2 = 3-4 weeks

---

## ✅ MVP Launch Criteria

**GO Decision Requires**:
- [x] All P0 tasks complete (DONE!)
- [ ] All P1 tasks complete (4 tasks remaining)
- [ ] 50%+ of P2 tasks complete (recommended for quality MVP)
- [ ] Production deployment verified (ARAB-418)
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] UAT sign-off from stakeholders

**NO-GO Criteria**:
- [ ] Device tracking not working (user analytics blind)
- [ ] Production deployment issues
- [ ] Critical bugs in core flows
- [ ] Payment system failures

---

## 🎯 Next Steps (Immediate Actions)

1. **Review & Approve**: Product Owner reviews this prioritization
2. **Assign Tasks**: Assign ARAB-415 to ARAB-418 to team members
3. **Sprint Planning**: Schedule Sprint 1 kickoff meeting
4. **Track Progress**: Update this document as tasks complete
5. **Daily Standups**: Monitor progress on P1 items

---

## 📝 Notes

### Recent Progress (from git history)
- ✅ ARAB-413: FilterModal redesign completed
- ✅ ARAB-414: Expo SDK 54 upgrade + UX improvements
- ✅ AWS deployment partially completed (EC2 configured, mobile app points to production URL)
- ✅ User statistics API implemented (ARAB-403)
- ✅ **WEB-001: Web Platform Foundation** - React + Vite + Tailwind CSS setup
- ✅ **WEB-002: Auth Pages** - Login ve Register sayfaları
- ✅ **WEB-003: Search Page** - İhtiyaç arama ve filtreleme
- ✅ **WEB-004: Need Detail Page** - İhtiyaç detay ve teklifler görünümü
- ✅ **WEB-005: Create Need Page** - İhtiyaç oluşturma formu
- ✅ **WEB-006: My Needs Page** - Kullanıcının ihtiyaçları listesi
- ✅ **WEB-007: My Offers Page** - Kullanıcının teklifleri listesi
- ✅ **WEB-008: Create Offer Page** - Teklif oluşturma formu
- ✅ **WEB-009: Profile Page** - Kullanıcı profili ve istatistikler

### Risks & Mitigation
1. **Risk**: AWS deployment issues delay launch
   - **Mitigation**: ARAB-418 includes rollback plan, staging environment testing

2. **Risk**: Device tracking implementation complexity
   - **Mitigation**: ARAB-415 uses proven expo-application API, fallback to UUID

3. **Risk**: App Store/Play Store rejection
   - **Mitigation**: Follow platform guidelines, pre-submission review

### Definition of Done
Each task is considered "Done" when:
- [ ] Code implemented and peer-reviewed
- [ ] Unit tests written and passing
- [ ] Manual testing completed on iOS + Android
- [ ] Documentation updated
- [ ] Product Owner acceptance

---

**Document Owner**: Product Management
**Last Updated**: 2025-12-29
**Next Review**: After Sprint 1 completion
