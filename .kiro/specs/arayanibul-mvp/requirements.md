# Arayanibul MVP - Gereksinimler Dökümanı

## Giriş

Arayanibul, geleneksel marketplace modelini tersine çeviren bir mobil platformdur. Satıcıların ürünlerini listelemesi yerine, alıcılar ihtiyaçlarını paylaşır ve sağlayıcılar bu ihtiyaçlara teklif verir. Bu MVP, temel ters marketplace işlevselliğini sağlayacak core özellikleri içerir.

## Gereksinimler

### Gereksinim 1: Kullanıcı Kimlik Doğrulama ve Profil Yönetimi

**User Story:** Bir kullanıcı olarak, platforma güvenli bir şekilde giriş yapabilmek ve profilimi yönetebilmek istiyorum, böylece kişiselleştirilmiş bir deneyim yaşayabilirim.

#### Kabul Kriterleri

1. WHEN kullanıcı kayıt ol butonuna tıkladığında THEN sistem email, şifre ve temel profil bilgilerini isteyecek
2. WHEN kullanıcı geçerli email ve şifre girdiğinde THEN sistem JWT token ile giriş yapmasına izin verecek
3. WHEN kullanıcı Google ile giriş yapmak istediğinde THEN sistem OAuth ile Google hesabı ile giriş yapmasına izin verecek
4. WHEN kullanıcı Facebook ile giriş yapmak istediğinde THEN sistem OAuth ile Facebook hesabı ile giriş yapmasına izin verecek
5. WHEN kullanıcı misafir olarak devam etmek istediğinde THEN sistem sınırlı erişim ile platforma girmesine izin verecek
6. WHEN kullanıcı profil bilgilerini güncellemek istediğinde THEN sistem ad, soyad, telefon ve konum bilgilerini düzenlemesine izin verecek

### Gereksinim 2: İhtiyaç Listesi Oluşturma (Alıcı Perspektifi)

**User Story:** Bir alıcı olarak, aradığım ürün veya hizmeti detaylı bir şekilde listeleyebilmek istiyorum, böylece sağlayıcılar bana uygun teklifler sunabilsin.

#### Kabul Kriterleri

1. WHEN alıcı "İhtiyaç Oluştur" butonuna tıkladığında THEN sistem kategori seçimi yapmasını isteyecek
2. WHEN alıcı kategori seçtikten sonra THEN sistem başlık, açıklama, bütçe ve konum bilgilerini girmesini isteyecek
3. WHEN alıcı fotoğraf eklemek istediğinde THEN sistem en fazla 5 fotoğraf yüklemesine izin verecek
4. WHEN alıcı aciliyet seviyesi belirtmek istediğinde THEN sistem "Acil", "Normal", "Esnek" seçeneklerini sunacak
5. WHEN alıcı ihtiyacını yayınladığında THEN sistem ihtiyacı aktif olarak listeleyecek ve sağlayıcılara görünür hale getirecek
6. WHEN alıcı kendi ihtiyaçlarını görüntülemek istediğinde THEN sistem "Aktif", "Teklif Bekleyen", "Tamamlanan" durumlarına göre filtreleyecek

### Gereksinim 3: İhtiyaç Keşfi ve Arama (Sağlayıcı Perspektifi)

**User Story:** Bir sağlayıcı olarak, uzmanlık alanıma uygun ihtiyaçları keşfedebilmek ve arayabilmek istiyorum, böylece potansiyel müşterilere hizmet verebilirim.

#### Kabul Kriterleri

1. WHEN sağlayıcı ana sayfaya girdiğinde THEN sistem yakındaki aktif ihtiyaçları listeleyecek
2. WHEN sağlayıcı kategori filtresi uyguladığında THEN sistem sadece seçilen kategorilerdeki ihtiyaçları gösterecek
3. WHEN sağlayıcı konum filtresi uyguladığında THEN sistem belirtilen mesafedeki ihtiyaçları gösterecek
4. WHEN sağlayıcı bütçe filtresi uyguladığında THEN sistem belirtilen bütçe aralığındaki ihtiyaçları gösterecek
5. WHEN sağlayıcı arama çubuğuna kelime girdiğinde THEN sistem başlık ve açıklamada o kelimeyi içeren ihtiyaçları gösterecek
6. WHEN sağlayıcı bir ihtiyaca tıkladığında THEN sistem ihtiyacın detay sayfasını gösterecek

### Gereksinim 4: Teklif Verme Sistemi

**User Story:** Bir sağlayıcı olarak, uygun gördüğüm ihtiyaçlara detaylı teklif verebilmek istiyorum, böylece müşteri ile iletişim kurabilirim.

#### Kabul Kriterleri

1. WHEN sağlayıcı bir ihtiyaç detayında "Teklif Ver" butonuna tıkladığında THEN sistem teklif formu açacak
2. WHEN sağlayıcı teklif fiyatı girdiğinde THEN sistem geçerli bir tutar girmesini zorunlu kılacak
3. WHEN sağlayıcı teklif açıklaması yazdığında THEN sistem en az 50 karakter girmesini isteyecek
4. WHEN sağlayıcı teslimat süresi belirttiğinde THEN sistem gün cinsinden süre girmesini isteyecek
5. WHEN sağlayıcı referans fotoğrafları eklemek istediğinde THEN sistem en fazla 3 fotoğraf yüklemesine izin verecek
6. WHEN sağlayıcı teklifi gönderdiğinde THEN sistem alıcıya bildirim gönderecek ve teklifi kayıt edecek

### Gereksinim 5: Teklif Yönetimi ve Karşılaştırma (Alıcı Perspektifi)

**User Story:** Bir alıcı olarak, gelen teklifleri görüntüleyebilmek ve karşılaştırabilmek istiyorum, böylece en uygun teklifi seçebilirim.

#### Kabul Kriterleri

1. WHEN alıcı "Tekliflerim" sayfasına girdiğinde THEN sistem ihtiyaçlarına göre gruplanmış teklifleri gösterecek
2. WHEN alıcı bir ihtiyacın tekliflerini görüntülediğinde THEN sistem fiyat, açıklama, teslimat süresi ve sağlayıcı bilgilerini gösterecek
3. WHEN alıcı teklifleri fiyata göre sıralamak istediğinde THEN sistem artan/azalan fiyat sıralaması yapacak
4. WHEN alıcı bir teklifi beğendiğinde THEN sistem teklifi favorilere ekleme seçeneği sunacak
5. WHEN alıcı bir sağlayıcı ile iletişim kurmak istediğinde THEN sistem mesajlaşma özelliğini açacak
6. WHEN alıcı bir teklifi kabul ettiğinde THEN sistem diğer teklifleri "reddedildi" olarak işaretleyecek

### Gereksinim 6: Mesajlaşma Sistemi

**User Story:** Bir kullanıcı olarak, alıcı ve sağlayıcı arasında güvenli mesajlaşma yapabilmek istiyorum, böylece detayları konuşup anlaşabilirim.

#### Kabul Kriterleri

1. WHEN kullanıcı bir teklif üzerinden mesaj gönderdiğinde THEN sistem mesajı karşı tarafa iletecek
2. WHEN kullanıcı mesaj aldığında THEN sistem push notification gönderecek
3. WHEN kullanıcı mesajlaşma geçmişini görüntülediğinde THEN sistem kronolojik sırada mesajları gösterecek
4. WHEN kullanıcı fotoğraf göndermek istediğinde THEN sistem fotoğraf paylaşımına izin verecek
5. WHEN kullanıcı konum paylaşmak istediğinde THEN sistem mevcut konumu paylaşma seçeneği sunacak
6. WHEN kullanıcı uygunsuz mesaj bildirmek istediğinde THEN sistem şikayet mekanizması sunacak

### Gereksinim 7: Kategori ve Filtreleme Sistemi

**User Story:** Bir kullanıcı olarak, ihtiyaçları kategorilere göre organize edebilmek ve filtreleyebilmek istiyorum, böylece aradığımı kolayca bulabilirim.

#### Kabul Kriterleri

1. WHEN kullanıcı kategori listesini görüntülediğinde THEN sistem ana kategorileri (Elektronik, Ev & Yaşam, Hizmetler, vb.) gösterecek
2. WHEN kullanıcı bir ana kategori seçtiğinde THEN sistem alt kategorileri gösterecek
3. WHEN kullanıcı konum filtresi uyguladığında THEN sistem 5km, 10km, 25km, 50km seçeneklerini sunacak
4. WHEN kullanıcı fiyat filtresi uyguladığında THEN sistem min-max fiyat aralığı belirleme imkanı verecek
5. WHEN kullanıcı tarih filtresi uyguladığında THEN sistem "Son 24 saat", "Son hafta", "Son ay" seçeneklerini sunacak
6. WHEN kullanıcı filtreleri temizlemek istediğinde THEN sistem tüm filtreleri sıfırlayacak

### Gereksinim 8: Bildirim Sistemi

**User Story:** Bir kullanıcı olarak, önemli gelişmeler hakkında bildirim alabilmek istiyorum, böylece platformdaki aktiviteleri kaçırmam.

#### Kabul Kriterleri

1. WHEN alıcıya yeni teklif geldiğinde THEN sistem push notification gönderecek
2. WHEN sağlayıcının teklifi kabul edildiğinde THEN sistem push notification gönderecek
3. WHEN kullanıcıya yeni mesaj geldiğinde THEN sistem push notification gönderecek
4. WHEN kullanıcının ihtiyacının süresi dolmak üzereyken THEN sistem hatırlatma bildirimi gönderecek
5. WHEN kullanıcı bildirim ayarlarını değiştirmek istediğinde THEN sistem bildirim türlerini açma/kapama seçeneği sunacak
6. WHEN kullanıcı bildirim geçmişini görüntülemek istediğinde THEN sistem son 30 günün bildirimlerini gösterecek

### Gereksinim 9: Profil ve Değerlendirme Sistemi

**User Story:** Bir kullanıcı olarak, diğer kullanıcıların profillerini görüntüleyebilmek ve değerlendirme yapabilmek istiyorum, böylece güvenilir kişilerle çalışabilirim.

#### Kabul Kriterleri

1. WHEN kullanıcı bir sağlayıcının profilini görüntülediğinde THEN sistem geçmiş işleri, puanları ve yorumları gösterecek
2. WHEN kullanıcı bir işlem tamamlandıktan sonra THEN sistem karşı tarafı değerlendirme seçeneği sunacak
3. WHEN kullanıcı değerlendirme yaparken THEN sistem 1-5 yıldız puanlama ve yorum yazma imkanı verecek
4. WHEN kullanıcı kendi profilini düzenlerken THEN sistem uzmanlık alanları ve referans çalışmaları ekleme imkanı verecek
5. WHEN kullanıcı profil fotoğrafı yüklemek istediğinde THEN sistem fotoğraf yükleme ve kırpma özelliği sunacak
6. WHEN kullanıcı şüpheli profil bildirmek istediğinde THEN sistem şikayet mekanizması sunacak

### Gereksinim 10: Arama ve Keşif Özellikleri

**User Story:** Bir kullanıcı olarak, platformda etkili arama yapabilmek ve ilgimi çekebilecek içerikleri keşfedebilmek istiyorum, böylece ihtiyacıma uygun sonuçlar bulabilirim.

#### Kabul Kriterleri

1. WHEN kullanıcı arama çubuğuna kelime girdiğinde THEN sistem başlık, açıklama ve etiketlerde arama yapacak
2. WHEN kullanıcı arama sonuçlarını görüntülediğinde THEN sistem relevansa göre sıralanmış sonuçları gösterecek
3. WHEN kullanıcı "Benim için öneriler" bölümünü görüntülediğinde THEN sistem geçmiş aktivitelerine göre öneriler sunacak
4. WHEN kullanıcı popüler ihtiyaçları görmek istediğinde THEN sistem en çok teklif alan ihtiyaçları gösterecek
5. WHEN kullanıcı yakındaki ihtiyaçları görmek istediğinde THEN sistem konum bazlı sonuçları gösterecek
6. WHEN kullanıcı arama geçmişini görüntülemek istediğinde THEN sistem son aramaları gösterecek ve tekrar arama imkanı verecek