# Gerçek Fiyat: ürün sayfası ve tek fiyat

Durum: onaylandı (25 Kasım 2026). Kural 3 ve 7 onay sırasında değiştirildi; aşağıda işaretli.
Hızlı ilan ve satıcı bildirimleriyle aynı pakette yayınlanacak.

## Neden

Ters pazar denemelerinin hemen hepsi aynı üç yerden kırıldı (`docs/COMPETITOR_ANALYSIS.md`):

1. Alıcı boşluğa yazıyor; cevap gelip gelmeyeceğini bilmiyor.
2. Bütün iş satıcıda: akışı tara, teklif yaz, belki kazan.
3. Pano boşken ürünün hiçbir değeri yok.

Hepsi ilan sitesini ters çevirip yine bir pano kurdu. Bizim farkımız şu olacak:

> İlan sitesi satıcının istediği fiyatı gösterir; Arayanibul birinin şu an ödemeye hazır olduğu fiyatı.

Enflasyon ortamında ilan fiyatları "belki satılır" mantığıyla şişiyor ve diğer satıcılar da bu
fiyatlara bakıp kendi ilanını giriyor. Alıcının ödemeye razı olduğu tutar hiçbir yerde görünmüyor.
O bilgi yalnızca bizde var. Slogan: **"Gerçek fiyat yerini bulur."**

## Ne yapıyoruz

Seçili ürünler için bir **fiyat sayfası**. Sayfanın ortasında tek bir rakam durur: o ürüne şu an
verilen en yüksek alım fiyatı. Alıcı da satıcı da aynı kutuya ürünün adını yazıp bu sayfaya gelir.

```
┌──────────────────────────────────────────┐
│  RTX 3080                            🔍  │
└──────────────────────────────────────────┘

  RTX 3080 · ikinci el
  ┌────────────────────────────────────┐
  │  Gerçek fiyat        15.000 TL     │
  │  şu an bu fiyata alıcısı var       │
  │  7 kişi arıyor · son anlaşma 14.500│
  └────────────────────────────────────┘

  [ Elimde var, bu fiyata satarım ]
  [ Ben de arıyorum ]              [ Paylaş ]
```

- **Satıcı** "bu fiyata satarım"a dokunur; en yüksek fiyatı veren alıcıya o fiyattan teklif gider.
  Fiyatı beğenmezse arayanların listesinden birine kendi fiyatıyla teklif verir (bugünkü akış).
- **Alıcı** "ben de arıyorum"a dokunur, hazır rakamlardan birini seçer ya da kendi rakamını yazar.
  Hemen sırasını görür: "3. sıradasın, 500 TL artırırsan ilk sıraya geçersin." Fiyat vermek
  istemezse "fiyatı satıcılar söylesin" der.
- **Paylaş** sayfanın bağlantısını ve kartını verir: "RTX 3080'e 15.000 TL veren var, elinde olan
  dokunsun." Forumlara ve WhatsApp gruplarına giden şey budur.

## Hedefler

- Alıcı ilanını verdiği an bir cevap alır (fiyat ve sıra), satıcı gelmese bile.
- Satıcı akış taramadan ve teklif yazmadan, tek dokunuşla teklif verir.
- Fiyat sayfası işlem niyeti olmayanı da çeker ("bu kaç eder") ve giriş yapmadan görülür.
- İlk sürüm tek bir alanda çalışır: **ikinci el ekran kartları**.

## Kapsam dışı

- Ödeme, emanet, bağlayıcı emir.
- Başka sitelerdeki ilanları toplamak ya da göstermek.
- Dil modeli ya da ücretli dış servis (POC kuralı: sıfır maliyet).
- Ürün durumuna göre ayrı fiyatlar (kutulu, garantili vb.).
- Diğer kategoriler. Onlar bugünkü ilan ve teklif akışıyla aynen çalışmaya devam eder.

## Olursa başarısız sayacağımız şeyler

- Arkasında gerçek bir alıcı olmayan fiyat göstermek; doğrulanamayan sayaçlar.
- Platformun "ölücü yuvası" gibi görünmesi: düşük teklifler öne çıkmamalı.
- "Anlaşılan fiyat"ı satış fiyatı gibi sunmak. Ödeme bizden geçmiyor; bu bir anlaşma kaydıdır.
- Yayındaki eski mobil sürümlerin bozulması (`docs/OPERATIONS.md` bölüm 6).

## Değerlendirilen yollar

Fiyatı kimin söyleyeceği için üç yol konuşuldu:

| Yol | Artısı | Eksisi |
|---|---|---|
| Alıcı fiyatını söyler, satıcı kabul eder | Satıcının işi tek dokunuş | Alıcı çoğu zaman fiyatı bilmiyor; düşük teklifi davet eder |
| Satıcılar yarışır, fiyat tekliflerden çıkar | Alıcı için zahmetsiz | Satıcı yine teklif yazmak zorunda; bugünkü modelle aynı |
| **Karma (seçilen)** | Alıcıya yol gösterilir, satıcı tek dokunuşla kabul eder | Ürünleri tanımak gerekir; dar bir alanda başlanır |

Tek rakamın ne olacağı için ortalama ya da tahmin yerine **en yüksek alım fiyatı** seçildi: ilk
alıcıyla birlikte var olur, düşük teklifler kendiliğinden görünmez kalır ve satıcı için doğrudan
eyleme dönüktür.

Ayrıca daha önce konuşulan iki fikir bu tasarımın içine alındı: paylaşılabilir ilan (burada fiyat
sayfasının kartı) ve "elimde var" (burada "bu fiyata satarım"). "Her ilana cevap garantisi" fikri
başka siteleri taramayı gerektirdiği için dışarıda bırakıldı; yerini anında gösterilen fiyat ve
sıra bilgisi aldı.

## Kurallar

Kullanıcının onayladıkları:

- Her ürünün tek bir fiyatı vardır ve bu fiyat alıcı tarafından gelir.
- İlk sürüm ekran kartlarıyla başlar; diğer kategoriler değişmez.
- Slogan "Gerçek fiyat yerini bulur".

Tasarımcının kararları (itiraz edilebilir):

1. **Gerçek fiyat** = o ürün için yayındaki, süresi dolmamış ilanlar arasındaki en yüksek fiyat.
   Fiyatsız ilanlar "arayan" sayısına girer, fiyata girmez.
2. Fiyat ülke geneli tektir; şehir her ilanın üstünde görünür. İkinci el parça kargoyla gidiyor.
3. Fiyat vermek ve teklif vermek için üye olmak yeterlidir. E-posta doğrulaması ilk sürümde hiçbir
   adımda istenmez; tamamı sonraki faza bırakıldı. Telefon doğrulaması da şart koşulmaz, çünkü SMS
   servisi bugün sahte (`MockSmsService`) ve gerçeği ücretli.
   *(Onayda iki kez değişti: ilk taslakta alıcıdan doğrulanmış e-posta isteniyordu; sonra yalnızca
   satıcı teklifinde ve anlaşmada istenmesi kararlaştırıldı; son karar hiç istenmemesi.)*
4. Bir kullanıcının aynı ürün için aynı anda tek ilanı olur. Fiyatını değiştirmek isterse o ilanı
   günceller.
5. Ürün ilanı 14 gün yayında kalır; alıcı tek dokunuşla yeniler. Böylece fiyat bayatlamaz.
6. Her ürünün bir tavan fiyatı vardır (yönetici girer, örneğin sıfır ürünün piyasa fiyatı). Tavanın
   üstündeki fiyat reddedilir. Sahte yüksek fiyata karşı ilk önlem budur.
7. Satıcı "bu fiyata satarım" dediğinde alıcıya bildirim gider. Alıcı 7 gün içinde kabul ya da
   ret etmezse ilanı kapanır (`Expired`), fiyat sıradaki alıcıya geçer ve satıcıya haber verilir.
   Süre ayarlanabilir bir değerdir ve kullanım görüldükçe kısaltılacaktır.
   *(Onayda değişti: ilk taslakta 48 saatti.)*
8. "Son anlaşma" = o üründe kabul edilen son teklifin fiyatı ve tarihi. Arayüzde "anlaşılan
   teklif" diye adlandırılır, "satış" denmez.
9. Hiç fiyat yoksa sayfa rakam göstermez: "Henüz fiyat oluşmadı. İlk fiyatı sen ver."
10. Alıcıya önerilen hazır rakamlar: en yüksek fiyat, son anlaşma ve en yüksek fiyatın bir adım
    üstü. Veri yoksa öneri gösterilmez, alıcı rakamı kendi yazar.
11. "Bu fiyata satarım" en yüksek fiyatlı ilana gider. O ilan satıcının kendisine aitse, taraflar
    birbirini engellemişse ya da satıcının o ilanda bekleyen teklifi varsa sıradaki ilana geçilir
    ve satıcıya gideceği fiyat dokunmadan önce gösterilir. Aynı ilana birden çok satıcı teklif
    verebilir; alıcı birini seçer.
12. Mevcut moderasyon (yasaklı kelime ve iletişim bilgisi taraması) ürün ilanlarına da uygulanır.

## Yapı

Mevcut koda yaslanır; yeni bir akış kurmaz.

**Veri**

- Yeni tablo `Product`: ad, adres parçası (slug), kategori, eş anlamlılar, tavan fiyat, yayında mı.
- `Need` tablosuna boş olabilen `ProductId`. Ürün ilanında fiyat `MaxBudget` alanında tutulur,
  `MinBudget` boş kalır. Yeni fiyat sütunu açılmaz; eski mobil sürümler bunu bütçe olarak gösterir.
- "Bu fiyata satarım" teklifi sıradan bir `Offer` kaydıdır; fiyatı ilanın fiyatına eşittir.
- İlk ürün listesi (birkaç düzine ekran kartı modeli) açılışta eksikse eklenir; kategori
  eklemedeki `EnsureFocusCategoriesAsync` düzenini izler.

**Ürünü tanıma**

- `NeedDraftService` bugün kategori, bütçe ve konumu kurallarla çıkarıyor. Aynı yerde ürün de
  tanınır: eş anlamlılar listesi, Türkçe karakterlerden arındırılmış metinde aranır.
- "3080 Ti" ile "3080" ayrı ürünlerdir; en uzun eşleşme kazanır.
- Tanınmayan metin bugünkü gibi ürünsüz ilan olur. Yönetici panelinden bir ilana elle ürün
  atanabilir.

**Uç noktalar** (hepsi yeni; mevcut olanların anlamı değişmez)

- Ürün arama (kutuya yazılan metinden ürün önerisi).
- Ürün sayfası verisi: gerçek fiyat, arayan sayısı, son anlaşmalar, arayanların listesi. Herkese açık.
- Giriş yapmış alıcı için sırası ve ilk sıraya geçmek için gereken tutar.
- "Bu fiyata satarım": en yüksek fiyatlı ilana o fiyattan teklif oluşturur. Kendi ilanına teklif,
  engelleme ve bekleyen teklif kuralları `OfferService.CreateOfferAsync` ile aynıdır.
- Hata metinleri `{ message }` biçiminde 400 döner.

**Arka plan işi**

- 7 gün (ayarlanabilir) cevapsız kalan "bu fiyata" tekliflerinde ilanı kapatan iş; `UrgentShowcaseExpiryService`
  ile aynı kalıpta.

**Web**

- Yeni sayfa: `/fiyat/{slug}`. Ana sayfadaki arama kutusu ürün tanırsa bu sayfayı önerir.
- Hızlı ilan (`QuickNeedComposer`) ürün tanırsa alıcıyı fiyat seçimine götürür.
- Arama motorları ve bağlantı önizlemeleri için hazır HTML: `SeoService` ve Caddy kuralı ilan
  sayfalarında olduğu gibi ürün sayfalarını da kapsar; site haritasına eklenir. Paylaşım kartı bu
  sayfanın Open Graph etiketlerinden çıkar.

**Mobil**

- İkinci aşama. İlk sürümde mobil kullanıcı ürün ilanlarını sıradan ilan olarak görür ve teklif
  verebilir; fiyat sayfası yalnızca web'dedir. Gerekçe: mağaza onayı beklemeden denemek.

## Nasıl ölçeceğiz

- Ürün ilanlarından 48 saat içinde teklif alanların oranı ve ilk teklife kadar geçen süre.
- "Bu fiyata satarım" tekliflerinden kabul edilenlerin oranı.
- Fiyat sayfası ziyaretlerinden fiyat veren ve "satarım"a dokunanların oranı.

## Bilinen riskler

- **Soğuk başlangıç sürüyor.** İlk fiyatları kurucu elle toplamak zorunda; ürün yalnızca bunu tek
  kategoriye indiriyor.
- **Bağlayıcı olmayan fiyat.** Tavan, tek ilan kuralı ve cevap süresi kuralı kötüye kullanımı azaltır,
  engellemez.
- **Doğrulanmamış hesabın fiyatı.** Hiçbir adımda e-posta doğrulaması istenmediği için sahte yüksek
  fiyata karşı elde yalnızca tavan fiyat ve tek ilan kuralı var; üstelik cevap süresi 7 gün olduğundan
  "bu fiyata satarım" denmiş ama cevaplanmamış bir ilan o süre boyunca sayfadaki rakam olarak
  kalabilir. Planda ele alınacak önlem: cevap bekleyen ilan fiyat hesabında kalır ama sayfada
  "teklif aldı, cevap bekleniyor" diye işaretlenir ve ikinci satıcıya sıradaki fiyat da gösterilir.
- **İki süre çakışabilir.** İlan 14 günde, cevapsız teklif 7 günde kapanır; aynı ilanı iki iş birden
  kapatmaya çalışmamalı (kapatma işi yalnızca hâlâ yayında olan ilanlara dokunur).
- **Durum farkı.** Tek fiyat, kutulu ürünle yıpranmış ürünü ayırmıyor. İlk sürümde fiyat "çalışır,
  temiz ürün" için tanımlanır ve sayfada böyle yazar; ayrıntı sohbette konuşulur.
- **İnce veri.** Tek alıcılı üründe fiyat bir kişinin sözüdür. Sayfa arayan sayısını her zaman
  fiyatın yanında gösterir.

## Geliştiriciye bırakılanlar

- Tablo ve alan adları, göç dosyası, uç nokta adresleri.
- İlk ürün listesinin tam içeriği ve eş anlamlıları (RTX 30/40/50 ve RX 6000/7000/9000 serilerinin
  yaygın modelleri; Ti, Super ve XT sürümleri ayrı ürün).
- "Bir adım üstü" tutarının hesabı (öneri: fiyatın %2-3'ü, 100 TL'ye yuvarlanmış).
- Sayfanın görsel tasarımı (`frontend-design`) ve metinleri (`turkish-ui-copy`).
- Testler: fiyat hesabı, sıra, tavan, tek ilan kuralı, cevap süresi işi, ürün tanıma.
