# İlan verme akışı: iki ilan türü, tek form

Durum: onaylandı ve geliştirildi (27 Kasım 2026). Yayın: sunucu + web ve mobil 1.0.6 birlikte.

## Neden

Hızlı ilan ve ayrıntılı ilan ayrı ekranlar, ayrı alanlar ve ayrı kurallarla büyümüştü (birinde fotoğraf
yoktu, birinde "hemen alırım" yoktu, doğrulama sınırları farklıydı). İstenen: iki akış aynı olsun,
hızlı ilanın tek farkı ayrıntıların girilmemesi olsun.

## Model

| | Bu fiyata hemen alırım | Tekliflere açığım |
|---|---|---|
| Fiyat | Tek fiyat, zorunlu (en fazla 100.000.000 TL) | Yok |
| Satıcı | "Bu fiyata satarım" ya da "fiyat artarsa haber ver" | Kendi fiyatıyla teklif |
| Aciliyet | Normal / Acil | Normal / Acil |

Tekliflere açık ilanda fiyat alınmaz: bu türü seçen kişi fiyatı bilmiyordur; bütçe tavanı teklifleri
tavana çeker ve iki türü birbirine karıştırır. Satıcının ihtiyaç duyduğu bilgi fiyat yerine ayrıntılarla
(durum, marka sorusu, açıklama, fotoğraf) ve mesajlaşmayla verilir.

## Form

Tek form, üç giriş:

- **Hızlı ilan:** önce tek cümle; sunucu başlık, kategori, fiyat (cümlede fiyat varsa "hemen alırım"
  seçili gelir) ve konum önerir, form bunlarla dolu ve "Ayrıntılar" kapalı açılır.
- **Ayrıntılı form:** aynı form, boş ve "Ayrıntılar" açık.
- **Düzenleme:** aynı form, ilanın değerleriyle.

Formda her zaman: başlık, kategori, ilan türü (+ fiyat), aciliyet, konum, fotoğraflar.
"Ayrıntılar": kategori soruları (durum vb.), açıklama, web'de bitiş tarihi. Açıklama boş bırakılırsa
cümleden ya da başlıktan üretilir.

Ürün adı tanınınca (ör. RTX 3080) artık fiyat sayfasına yönlendirilmez; fiyat alanının yanında o ürünün
güncel gerçek fiyatı gösterilir ve "hemen alırım" ilanı fiyat sayfasında kendiliğinden sıralanır.

## Eski sürümler ve veri

- 1.0.5 ve öncesi bütçe aralığı gönderebilir; tekliflere açık ilanda saklanmaz.
- Daha önce bütçeyle açılmış ilanların bütçesi kalır ve görünür; düzenlemede yeni bütçe alınmaz.
- "Esnek" aciliyet Normal'e çevrilir; listelerde "Normal" görünür.

## Platform farkları

- Bitiş tarihi: web'de tarih alanı, mobilde "Süresiz / 1 hafta / 2 hafta / 1 ay / 3 ay" seçenekleri
  (tarih seçici kütüphanesi eklemeden). Düzenlemede mevcut bitiş tarihi gösterilir; "Değiştirme" ya da
  yeni süre seçilir. Süresiz yapma (bitiş tarihini kaldırma) API'de yok.
- Fotoğraflar: iki platformda da düzenlerken mevcut fotoğraf kaldırılıp yenisi eklenebilir (en fazla 5).
- Web'de misafir fotoğraf seçebilir; fotoğraflar üye olunca formda bekler ve ilanla yüklenir. Sayfa
  tamamen yeniden yüklenirse (ör. sosyal girişte yönlendirme) fotoğraflar yeniden eklenir; yazılanlar kalır.
