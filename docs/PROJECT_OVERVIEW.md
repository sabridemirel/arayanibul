# 🎯 Arayanibul - Proje Genel Bakış

## Proje Tanımı
**Arayanibul**, geleneksel ilan sitelerinin tersine çalışan bir platform. Satıcılar ürün ilanı vermez, **alıcılar ihtiyaç ilanı verir**.

## İş Modeli
1. **Kullanıcı** → "X ürün/hizmet arıyorum" ilanı verir
2. **Sağlayıcılar** → Bu ilanlara teklif verir
3. **Eşleşme** → En uygun teklif seçilir

## Hedef Kitle

### Birincil Kullanıcılar (İlan Verenler)
- Belirli bir ürün/hizmet arayan kişiler
- Fiyat karşılaştırması yapmak isteyenler
- Özel/nadir ürün arayanlar

### İkincil Kullanıcılar (Teklif Verenler)
- Hizmet sağlayıcıları (temizlik, özel ders, tamirci vb.)
- 2. el ürün satıcıları
- Freelancer'lar
- Küçük işletmeler

## Örnek Kullanım Senaryoları

### Ürün Arama
- "iPhone 13 Pro arıyorum, bütçem 25.000 TL"
- "Bebek arabası arıyorum, 2. el olabilir"
- "Gaming laptop arıyorum, RTX 4060 olmalı"

### Hizmet Arama
- "Ev temizlik hizmeti arıyorum, haftada 1 kez"
- "İngilizce özel ders arıyorum, online olabilir"
- "Düğün fotoğrafçısı arıyorum, 15 Haziran için"
- "Klima tamiri arıyorum, acil"

## Rekabet Avantajı
1. **Ters ilan sistemi** - Piyasada benzeri az
2. **Hedefli eşleşme** - Gerçek ihtiyaç sahipleri
3. **Zaman tasarrufu** - Arama yapmak yerine beklemek
4. **Fiyat rekabeti** - Sağlayıcılar yarışır

## Gelir Modeli (Gelecek)
- Premium üyelik (daha fazla ilan hakkı)
- Teklif başına komisyon
- Öne çıkarma hizmetleri
- Reklam gelirleri

## Teknik Özellikler
- **Platform**: React Native (iOS/Android)
- **Backend**: .NET Core API
- **Database**: SQLite → PostgreSQL
- **Auth**: JWT + Social Login
- **Mimari**: Monolith → Mikroservis