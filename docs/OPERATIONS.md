# Canlı Ortam İşletim Notları

Canlı ortamın **bugünkü gerçek durumu** ve tekrar eden işler için başvuru belgesi.
İlk kurulum adımları için: [`deploy/README.md`](../deploy/README.md).

Son güncelleme: 25 Kasım 2026

## 1. Adresler ve sunucu

| Ne | Nerede |
|---|---|
| Web | `https://arayanibul.com` (`www` buraya yönlenir) |
| API | `https://api.arayanibul.com` |
| Sunucu | Hetzner, `2.31.146.115`, kod `/opt/arayanibul` altında |
| Servisler | `postgres`, `api`, `web`, `caddy` (`deploy/docker-compose.prod.yml`) |
| HTTPS | Caddy, sertifikaları kendisi alır ve yeniler |

## 2. Alan adları ve DNS

Bütün alan adları **Natro**'da kayıtlı ve DNS'leri de Natro'da (`ns1/ns2.natrohost.com`).
Cloudflare kullanılmıyor (`deploy/README.md` içindeki Cloudflare adımları ilk plana aittir).

Panel yolu: natro.com → Hesabım → Alan Adı Yönetimi → Aktif Alan Adlarınız → ilgili alan adı → **Yönet**.

| Alan adı | Ne yapıyor | Nasıl |
|---|---|---|
| `arayanibul.com` | Asıl site | DNS kayıtları "Profesyonel DNS Servisi → Yönet" altında düzenlenir |
| `bularayani.com` | `arayanibul.com`'a yönlenir (`http` ve `https`) | A kayıtları (`@`, `www`) sunucuya bakar; yönlendirmeyi Caddy yapar |
| `arayanbul.com` | `arayanibul.com`'a yönlenir (yalnızca `http`) | Natro'nun "Yönlendirme ya da Özel Park Sayfası" özelliği |
| `arayanibul.online` | aynı | aynı |
| `arayanbul.online` | aynı | aynı |
| `bularayani.xyz` | Kullanılmıyor | — |

Notlar:

- `arayanbul.com` ve iki `.online` alan adında DNS kaydı düzenlemek Natro'da ücretli bir ektir
  (alan adı başına aylık 0,10 $). Satın alınmadı; bu yüzden Natro'nun ücretsiz yönlendirmesi
  kullanılıyor ve bu alan adları `https://` ile açılmıyor. Ek satın alınırsa `bularayani.com` ile
  aynı kurulum yapılabilir: A kayıtları sunucuya, alan adı `deploy/Caddyfile` içindeki yönlendirme
  bloğuna.
- `arayanibul.com` üzerindeki TXT kayıtlarına dokunmayın: SPF ve `brevo-code` e-posta gönderimi
  için, `google-site-verification` Search Console doğrulaması için gerekli.

## 3. Arama motorları (SEO)

- **Google Search Console:** `arayanibul.com` alan adı mülkü olarak doğrulandı (DNS TXT kaydıyla).
  Site haritası gönderildi: `https://arayanibul.com/sitemap.xml`.
- **Site haritası:** API üretir (`SeoController`, `SeoService.BuildSitemapAsync`). Ana sayfa, ilan
  listesi, ana kategoriler, yayındaki ilanlar ve sabit sayfalar yer alır. Yeni ilanlar kendiliğinden
  eklenir; onay bekleyen, reddedilen ve kapanan ilanlar girmez.
- **Arama motorlarına özel ilan sayfası:** Web uygulaması içeriği JavaScript ile doldurduğu için,
  Caddy arama ve bağlantı önizleme tarayıcılarını (Googlebot, Bingbot, WhatsApp, Facebook, X,
  Telegram...) `/needs/{id}` isteklerinde API'deki `/seo/needs/{id}` adresine yönlendirir. Bu sayfa
  ilan başlığı, açıklama, bütçe, konum, fotoğraflar ve Open Graph etiketlerini hazır HTML olarak
  verir. Yayında olmayan ilan için 404 döner. Ziyaretçiler her zaman normal uygulamayı görür.
- **Dikkat:** Web'deki ilan detay sayfasına herkese açık yeni bir bilgi eklenirse
  `SeoService.BuildNeedPageAsync` de güncellenmeli. İki sürümün içeriği aynı kalmalı; aksi hâlde
  arama motorları bunu yanıltıcı içerik sayabilir.
- **Sayfa başlıkları:** Web'de `usePageMeta` hook'u sekme başlığını, açıklamayı ve standart adresi
  sayfaya göre ayarlar. Varsayılan değerler `src/web/index.html` içindedir.
- `robots.txt`: `src/web/public/robots.txt`.

## 4. Fotoğraf işleme ve ImageSharp lisansı

- Yüklenen her fotoğraf yeniden WebP olarak kaydedilir; EXIF/GPS bilgisi silinir, en uzun kenar
  2048 piksele indirilir (`LocalFileStorageService`).
- Yalnızca **JPEG, PNG ve WebP** çözülür. İstemcinin beyan ettiği dosya türüne güvenilmez; başka
  biçimde bir dosya JPEG diye gönderilse de reddedilir.
- **ImageSharp 3.2.x, yayın (Release) derlemesinde Six Labors lisansı ister.** Lisans dosyası
  `sixlabors.lic`, `src/backend/API/` klasöründe durmalıdır: hem geliştirme bilgisayarında hem
  sunucuda (`/opt/arayanibul/src/backend/API/sixlabors.lic`). Dosya `.gitignore` içindedir, depoya
  girmez.
- Lisans türü Community (ücretsiz), **23 Şubat 2028'e kadar geçerli**. Süre dolunca yeni
  derlemeler başarısız olur (çalışan site etkilenmez). Yenileme: https://licensing.sixlabors.com
- Dosya kaybolursa: Six Labors'tan gelen e-postanın ekinden yeniden alınır.

## 5. Güncelleme (canlıya alma)

Sunucuda:

```bash
cd /opt/arayanibul && git pull --ff-only
cd deploy && ./backup.sh
docker compose -f docker-compose.prod.yml up -d --build api web
```

- Yalnızca API değiştiyse `api`, yalnızca web değiştiyse `web` yazmak yeterlidir.
- **`deploy/Caddyfile` değiştiyse** ayrıca: `docker compose -f docker-compose.prod.yml restart caddy`
  (site birkaç saniye erişilemez olur).
- Veritabanı göçleri API açılırken kendiliğinden uygulanır.
- Her güncellemeden önce `./backup.sh` çalıştırın; veritabanı dökümü ve yüklenen dosyalar yedeklenir.

Güncelleme sonrası hızlı kontrol:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://api.arayanibul.com/health
curl -s -o /dev/null -w "%{http_code}\n" https://arayanibul.com/
curl -s -o /dev/null -w "%{http_code}\n" https://arayanibul.com/sitemap.xml
# Arama motorunun gördüğü ilan sayfası:
curl -s -A "Googlebot" https://arayanibul.com/needs/<ilan-id> | grep "<title>"
```

## 6. Yayındaki mobil sürümlerle uyumluluk

Mağazalardaki eski uygulama sürümleri aynı API'yi kullanır. API'de değişiklik yaparken:

- Mevcut alanları kaldırmayın, anlamlarını değiştirmeyin; yeni alan eklemek güvenlidir.
- Kullanıcıya gösterilecek hata metinlerini `{ message }` biçiminde 400 olarak döndürün
  (`BusinessException`); eski sürümler bu metni olduğu gibi gösterir.

## 7. Değişiklik günlüğü

### 25 Kasım 2026

- Satıcıya yeni ilan bildirimi: kullanıcılar kategori takip eder (`CategoryFollow`,
  `GET/PUT /api/category/follows`). `NewNeedAlertService` dakikada bir yeni yayına giren ilanları
  takipçilerine duyurur (uygulama içi bildirim + e-posta). E-posta günlük sınırı:
  `NewNeedAlerts__MaxEmailsPerDay` (varsayılan 5). Web'de bildirim listesi yoktur; web kullanıcısı
  e-postayla haberdar olur.
- Mobil: Bildirimler ekranını açınca oluşan çökme düzeltildi (1.0.5 ile yayınlanacak; önceki
  sürümlerde hata duruyor).
- Hızlı ilan (web): tek cümleden başlık, kategori, bütçe ve konum çıkarılır (`NeedDraftService`,
  kural tabanlı, dış servis yok; `POST /api/need/draft`). Misafir önce yazar, yayınlarken üye olur.
- Temiz ilanlar onay beklemeden yayına girer; yalnızca yasaklı kelime ya da iletişim bilgisi
  taramasına takılanlar ve daha önce reddedilmiş ilanların düzenlemeleri incelemeye düşer.
  Kapatmak için: `Moderation__AutoApproveClean=false`. Fotoğraflar taranmaz.
- Yeni kategoriler: Elektronik > Bilgisayar Parçaları, Bebek & Çocuk > Anne Ürünleri ve yeni ana
  kategori Kamp & Karavan (beş alt kategori). Açılışta eksikse eklenir (`EnsureFocusCategoriesAsync`).
- Google Search Console doğrulandı, site haritası gönderildi.
- Dinamik site haritası, arama motorlarına özel ilan sayfaları, sayfaya özel başlık ve açıklamalar
  eklendi (`0afb596`).
- Fotoğraf yüklemede yalnızca JPEG/PNG/WebP çözülüyor (`9959026`); ImageSharp 3.2.1'e
  yükseltildi, bilinen güvenlik açıkları kapandı (`94cf254`).
- Yedek alan adları `arayanibul.com`'a yönlendirildi (`264775b` ve Natro panel ayarları).

### 24 Kasım 2026

- Acil ilan vitrini: acil ilanlar 7 gün boyunca listenin üstünde, kullanıcı başına aynı anda bir
  acil ilan (`52ba1db`).
- Web ana sayfası ilan öncelikli hâle getirildi; ilan kartı web'de yeniden tasarlandı.
- Mobil 1.0.4: ilan formundan çıkarken kaydedilmemiş içerik uyarısı (`cd11bfe`). Android paketi
  Play'e yüklendi, iOS sürümü App Store incelemesine gönderildi.

## 8. Açık konular

- Bir sonraki mobil pakette `android.hardware.screen.portrait` özelliğini isteğe bağlı işaretlemek
  (Play Console uyarısı).
- Aynı anda gelen iki istekle "tek acil ilan" kuralının aşılabilmesi; ücretli modele geçmeden önce
  veritabanı düzeyinde kapatılmalı.
- `API.Tests` içindeki eski entegrasyon testleri derlenmiyor; ayrıca 7 birim testi (Message, User,
  Payment servisleri) başarısız. İkisi de bu değişikliklerden önce de böyleydi.
- App Store "Uygulama Gizliliği" formunun güncellenmesi (arama geçmişi, kullanıcıya bağlı konum).
