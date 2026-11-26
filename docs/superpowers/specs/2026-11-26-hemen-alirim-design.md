# "Bu fiyata hemen alırım" ilanları

Durum: onaylandı ve geliştirildi (26 Kasım 2026). Yayın: sunucu + web bir sonraki canlıya almada, mobil 1.0.6 ile.

## Neden

Gerçek Fiyat yalnızca katalogdaki ürünlerde (ekran kartları) çalışıyordu ve ayrı bir kapıdan
(fiyat sayfası) giriliyordu. Acil ilanla farkı kullanıcıya anlaşılmıyordu. Kavram ürün
kataloğundan çıkarılıp ilanın kendisine taşındı: alıcı ilan verirken tek bir soruya cevap verir.

## Kurallar

1. İlan verirken iki seçenek vardır: **Pazarlığa açık** (eski davranış, bütçe isteğe bağlı) ve
   **Bu fiyata hemen alırım** (tek, kesin fiyat; `Need.IsFixedPrice`, fiyat `MaxBudget`).
2. Sabit fiyatlı ilana **başka fiyatla teklif verilemez** (yüksek de düşük de). Satıcının iki
   seçeneği vardır: "Bende Var, Bu Fiyata Satarım" (hazır teklif, `Offer.AtListedPrice`) ve
   "Fiyat Artarsa Haber Ver".
3. "Fiyat Artarsa Haber Ver" teklif değildir. Alıcı ilanında kaç satıcının beklediğini görür.
   Alıcı fiyatı artırınca ya da ilanı pazarlığa açınca bekleyenlere bir kez bildirim gider
   (`price_raised`) ve bekleme kaydı silinir. Teklif veren satıcının bekleme kaydı da silinir.
4. Alıcı her an fiyatı değiştirebilir ya da ilanı pazarlığa açabilir (ilan düzenleme).
5. Katalogdaki bir ürünün adını taşıyan sabit fiyatlı ilan kendiliğinden o ürünün fiyat
   sayfasına girer (tavan fiyat ve "ürün başına tek ilan" kuralı geçerlidir; ikinci ilan
   sıradan ilan olarak kalır). Pazarlığa açılırsa fiyat sayfasından çıkar.
6. Fiyata gelen teklife 7 gün yanıt verilmezse ilan kapanır (`ProductPricing:ResponseDays`,
   artık bütün sabit fiyatlı ilanlar için).
7. 3 gün hiç teklif almayan sabit fiyatlı ilanın sahibine bir kez hatırlatma gider
   (`price_nudge`, `FixedPrice:NudgeDays`).

## Değerlendirilen seçenekler

- **Sabit fiyata farklı fiyatla da teklif verilebilsin:** elendi. İki seçenek aynı şeye
  dönüşüyordu ("en fazla X" bütçeli pazarlık ilanı).
- **Katı kural, geri bildirimsiz:** elendi. Piyasanın altında fiyat yazan alıcı nedenini
  öğrenemeden sessiz kalıyordu. Madde 3 ve 7 bunun için eklendi.
- **Seçilen:** katı kural + "fiyat artarsa haber ver" + hatırlatma.

## Eski sürümlerle uyum

- 1.0.5 ve öncesi mobil sürümler sabit fiyatlı ilanı normal ilan gibi gösterir. İlandaki
  fiyatla aynı tutarı yazan teklif kabul edilir; farklı tutar açıklayıcı bir mesajla reddedilir.
- `POST /api/offer` doğrulama hatalarında artık "Validation failed" yerine ilk hatanın metni döner.

## Uç noktalar

- `POST /api/offer/at-price/{needId}`
- `POST` / `DELETE /api/need/{id}/price-watch`
- `NeedResponse`: `isFixedPrice`, `priceWatchCount`, `isWatchingPrice`, `productSlug`
- `OfferResponse`: `atListedPrice`

## Bilinen açıklar

- Hızlı ilanda ürün adı tanınınca alıcı hâlâ fiyat sayfasına yönlendiriliyor (orada yalnızca
  sabit fiyat verilebilir).
- Web'de bildirim listesi yok; `price_raised` ve `price_nudge` yalnızca mobilde görünür.
- Sabit fiyatlı ilanlar için ayrı bir e-posta gönderilmiyor.
