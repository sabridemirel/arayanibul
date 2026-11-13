---
name: turkish-ui-copy
description: Arayanibul arayüz metinleri için Türkçe yazım ve terim kuralları — doğru Türkçe karakterler (ç ğ ı İ ö ş ü), ortak terim sözlüğü (ilan, teklif, arayan, satıcı, güvenli ödeme), durum etiketleri ve buton/boş durum/hata metni tonu. Web (src/web) veya mobil (src/mobile) tarafında kullanıcıya görünen herhangi bir metni yazarken, değiştirirken ya da gözden geçirirken kullan: yeni ekran/sayfa/bileşen, buton, etiket, placeholder, toast, Alert, boş durum, hata mesajı, durum rozeti. Kullanıcı metinden açıkça bahsetmese bile bir .tsx dosyasına JSX metni ekleniyorsa bu skill geçerlidir. "Türkçe karakter", "metinleri düzelt", "copy", "yazım" gibi istekler de tetikler.
---

# Arayanibul arayüz metinleri

Arayüz Türkçe ve kullanıcılar Türk. Türkçe karakterleri eksik bir metin ("Giris Yap", "Sonuc bulunamadi") kullanıcıya bozuk ya da özensiz görünür; ödeme alan bir pazaryerinde bu doğrudan güven kaybıdır. Ayrıca aynı kavram için farklı kelimeler (bir yerde "İlan Ver", başka yerde "İlan Oluştur") kullanıcının ürünü öğrenmesini zorlaştırır. Bu skill bu iki sorunu önlemek için var.

Mobil uygulama (`src/mobile`) genelde doğru yazılmıştır ve referans alınabilir. Web (`src/web`) tarafında ASCII'ye çevrilmiş çok sayıda metin vardır — web'de bir dosyaya dokunduğunda o dosyadaki bozuk metinleri de düzelt.

## 1. Türkçe karakterler

Kullanıcıya görünen her metinde tam Türkçe alfabe kullan: **ç ğ ı İ ö ş ü** (ve büyükleri Ç Ğ I İ Ö Ş Ü).

En sık yapılan hatalar:

| Yanlış | Doğru |
|---|---|
| Giris Yap / Kayit Ol | Giriş Yap / Kayıt Ol |
| Ilan, Ilanlar | İlan, İlanlar |
| Nasil Calisir? | Nasıl Çalışır? |
| Tumunu Gor | Tümünü Gör |
| Sonuc bulunamadi | Sonuç bulunamadı |
| Ilan Olustur | İlan Oluştur |
| Secin, Sirala | Seçin, Sırala |
| Ucretsiz, Sifre | Ücretsiz, Şifre |
| Henuz, ornegin, degistirin | Henüz, örneğin, değiştirin |
| Basarili, olustu | Başarılı, oluştu |

Dikkat edilecek noktalar:
- **Noktalı büyük İ:** "ilan" kelimesinin büyük harfle başlayan hali "İlan"dır, "Ilan" değil. "ı"nın büyüğü "I", "i"nin büyüğü "İ".
- **Programatik büyük/küçük harf:** `toUpperCase()` / `toLowerCase()` Türkçe'de yanlış sonuç verir ("ilan".toUpperCase() → "ILAN"). `toLocaleUpperCase('tr-TR')` / `toLocaleLowerCase('tr-TR')` kullan. Arama/filtre karşılaştırmalarında da aynı kural geçerli.
- **CSS `uppercase`:** Web'de `<html lang="tr">` var, bu yüzden `text-transform: uppercase` doğru çalışır; `lang` özniteliğini kaldırma.
- **Kapsam dışı:** Kod tanımlayıcıları, URL/route yolları, enum değerleri, API alanları, test ID'leri ve geliştiriciye yönelik `console.log` mesajları ASCII kalabilir. Kural kullanıcının gördüğü metin için.

## 2. Terim sözlüğü

Aynı kavram her yerde aynı kelimeyle anılsın. Backend modelleriyle eşleşme:

| Kavram (kod) | Arayüzde | Not |
|---|---|---|
| Need | **ilan** / **ihtiyaç ilanı** | Ana CTA: "İlan Ver" (ilk kez görenler için "Ücretsiz İhtiyaç İlanı Ver" kabul). "İlan Oluştur" kullanma. |
| Offer | **teklif** | CTA: "Teklif Ver". Gönderim butonu da "Teklif Ver"; sonrasında toast "Teklifiniz gönderildi". |
| İlanı veren kullanıcı | **arayan** / alıcı | Marka dili "Arayanı Bul" ile uyumlu. |
| Teklif veren kullanıcı | **satıcı** | "Hizmet veren", "sağlayıcı" gibi alternatifleri yeni metinde kullanma. |
| Transaction / escrow | **güvenli ödeme** | Açıklamada "ödemeniz emanette tutulur" denebilir; "escrow" kelimesini arayüzde kullanma. |
| Category | kategori | |
| Review | değerlendirme | |

Durum etiketleri (rozet/badge — mevcut kodla aynı, Büyük Harfle Başlayan Kelimeler):

| Need | Etiket | Offer | Etiket | Transaction | Etiket |
|---|---|---|---|---|---|
| Active | Aktif | Pending | Beklemede | Pending | Beklemede |
| InProgress | Devam Ediyor | Accepted | Kabul Edildi | Processing | İşleniyor |
| Completed | Tamamlandı | Rejected | Reddedildi | Completed | Ödeme Emanette |
| Cancelled | İptal Edildi | Withdrawn | Geri Çekildi | Released | Satıcıya Aktarıldı |
| Expired | Süresi Doldu | | | Refunded | İade Edildi |
| | | | | Failed | Başarısız |

Transaction `Completed` para hâlâ emanetteyken oluşur; "Tamamlandı" yazmak kullanıcıya satıcının parayı aldığını düşündürür, bu yüzden "Ödeme Emanette" kullan.

## 3. Biçim ve ton

- **Butonlar ve durum rozetleri:** Kısa, Her Kelimesi Büyük Harfle ("Teklif Ver", "Kabul Et", "Filtreleri Temizle"). Projede yerleşik kural bu.
- **Başlık, açıklama, cümle:** Normal cümle düzeni ("Arama kriterlerinize uygun ilan bulunamadı.").
- **Fiil, ne olacağını söylesin:** "Gönder" yerine "Teklif Ver"; "Tamam" yerine yapılan işi adlandır ("Ödemeyi Onayla"). Aynı eylem akış boyunca aynı adı taşır: "Teklifi Geri Çek" butonu → "Teklif geri çekildi" bildirimi.
- **Hitap:** Kullanıcıya "siz" ile hitap et ("İlanınız yayında"). Aynı ekranda "sen"/"siz" karıştırma.
- **Hata mesajları:** Ne olduğunu ve ne yapılacağını söyle; özür dileme, belirsiz kalma. "Bir hata oluştu" yerine "İlan kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin." Teknik detay (status kodu, exception mesajı) kullanıcıya gösterilmez.
- **Boş durumlar:** Bir çıkış yolu sun. "Henüz teklifiniz yok. İlanlara göz atıp ilk teklifinizi verin." + ilgili buton.
- **Ünlem ve emoji:** Ölçülü. Başarı bildiriminde tek ünlem olabilir; hata ve uyarıda olmaz.

## 4. Çalışma şekli

1. Bir `.tsx` dosyasına metin eklerken/değiştirirken yukarıdaki kuralları uygula.
2. Web'de bir dosyayı düzenliyorsan, aynı dosyadaki ASCII'leştirilmiş metinleri de düzelt (değişikliği kapsam dışına taşırmadan, sadece o dosya).
3. Bir özellik hem web'de hem mobilde varsa iki taraftaki metinler aynı olsun; farklıysa mobildeki doğru yazımı esas al (sözlükle çelişmiyorsa).
4. Toplu tarama istenirse şu desen iyi bir başlangıçtır (yanlış pozitifleri — değişken adları vb. — ele):
   ```bash
   grep -rnE "\b(Giris|Kayit|Ilan|Calis|Tumu|Gor|Sonuc|bulunamadi|Olustur|Secin|Sirala|Ucretsiz|Sifre|Henuz|ornegin|Basarili|degis|olustu)" --include='*.tsx' src/web/src src/mobile
   ```
