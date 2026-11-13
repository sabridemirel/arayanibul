#!/usr/bin/env python3
"""Load demo data (users, needs, offers, messages) into an Arayanibul API.

Goes through the public REST API, so it works against local Docker and any
deployed environment. Re-running is safe: users that already exist are logged
in instead of registered, and needs/offers are only created when the demo
buyer has no needs yet.

Usage:
    python3 scripts/seed_demo.py                       # http://localhost:5001/api
    python3 scripts/seed_demo.py https://api.example.com/api

New needs start in review (moderation). To publish the demo needs automatically,
set the credentials of an admin account (confirmed e-mail listed in Admin:Emails):
    SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... python3 scripts/seed_demo.py
Otherwise approve them in the web admin panel (/admin).

All demo accounts use the password below.
"""
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

API = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5001/api").rstrip("/")
PASSWORD = "Demo1234!"

# --- Accounts ---------------------------------------------------------------
BUYERS = [
    ("ayse.demir@demo.arayanibul.com", "Ayşe", "Demir"),
    ("murat.kaya@demo.arayanibul.com", "Murat", "Kaya"),
    ("elif.sahin@demo.arayanibul.com", "Elif", "Şahin"),
]
SELLERS = [
    ("hizli.nakliyat@demo.arayanibul.com", "Hızlı", "Nakliyat"),
    ("usta.yapi@demo.arayanibul.com", "Usta", "Yapı"),
    ("parlak.temizlik@demo.arayanibul.com", "Parlak", "Temizlik"),
    ("deniz.ogretmen@demo.arayanibul.com", "Deniz", "Arslan"),
]

# --- Content ----------------------------------------------------------------
# (buyer index, category name, title, description, min, max, urgency, address, lat, lng, days)
NEEDS = [
    (0, "Ulaşım", "Kadıköy'den Ataşehir'e ev taşıma",
     "2+1 evimi Kadıköy'den Ataşehir'e taşıyacağım. Asansör var, eşyaların paketlenmesi de dahil olsun. Hafta sonu tercihim.",
     6000, 12000, "Normal", "Kadıköy, İstanbul", 40.9906, 29.0290, 20),
    (0, "Temizlik Hizmetleri", "Taşınma sonrası detaylı ev temizliği",
     "Yeni taşındığım 3+1 dairenin boş haldeyken detaylı temizlenmesini istiyorum. Mutfak dolapları ve banyolar öncelikli.",
     2500, 4500, "Urgent", "Ataşehir, İstanbul", 40.9923, 29.1244, 7),
    (1, "Tamir & Bakım", "Banyo tadilatı için usta arıyorum",
     "Çankaya'daki dairemin banyosunu yeniletmek istiyorum. Fayans, armatür ve duşakabin değişecek. Keşif sonrası fiyat bekliyorum.",
     30000, 60000, "Normal", "Çankaya, Ankara", 39.9179, 32.8627, 30),
    (1, "Özel Ders", "Lise 11. sınıf matematik özel ders",
     "Oğlum için haftada iki gün matematik özel dersi arıyorum. YKS hazırlığına da destek olabilecek deneyimli bir öğretmen tercihimiz.",
     800, 1500, "Flexible", "Keçiören, Ankara", 39.9800, 32.8670, 30),
    (2, "Fotoğrafçılık", "Nişan töreni için fotoğrafçı",
     "Ekim ayındaki nişan törenimiz için 4 saatlik çekim yapacak fotoğrafçı arıyoruz. Düzenlenmiş dijital fotoğraflar teslim edilmeli.",
     5000, 9000, "Normal", "Karşıyaka, İzmir", 38.4600, 27.1100, 25),
    (2, "Ev Aletleri", "Çamaşır makinesi su almıyor",
     "Bosch marka 6 yıllık çamaşır makinem su almıyor, hata kodu E17 veriyor. Yerinde bakıp tamir edecek servis arıyorum.",
     500, 1500, "Urgent", "Bornova, İzmir", 38.4622, 27.2160, 5),
    (0, "Etkinlik Organizasyonu", "Çocuk doğum günü organizasyonu",
     "Kızımın 6. yaş günü için 20 çocuklu, evde yapılacak bir parti organizasyonu istiyorum. Süsleme, animatör ve pasta dahil olsun.",
     4000, 8000, "Normal", "Beşiktaş, İstanbul", 41.0430, 29.0070, 21),
    (1, "Bilgisayar & Laptop", "Grafik tasarım için ikinci el laptop",
     "Grafik tasarım işlerim için en az 16 GB RAM ve ayrı ekran kartı olan, temiz kullanılmış bir laptop arıyorum. Faturası olursa iyi olur.",
     18000, 28000, "Flexible", "Yenimahalle, Ankara", 39.9667, 32.8100, 30),
]

# (need index, seller index, price, delivery days, description)
OFFERS = [
    (0, 0, 9500, 1, "10 yıllık deneyimle sigortalı taşıma yapıyoruz. Paketleme malzemesi ve 3 kişilik ekip dahil, cumartesi sabah başlayabiliriz."),
    (0, 1, 8200, 2, "Kapalı kasa kamyonetle taşıma yaparız. Paketleme hizmeti dahil, mobilya sökme ve kurma işlerini de üstleniyoruz."),
    (1, 2, 3200, 1, "Profesyonel ekipmanla 3 kişilik ekip 5 saatte teslim eder. Temizlik malzemeleri bizden, sonrasında kontrol listesi veriyoruz."),
    (2, 1, 45000, 10, "Banyoyu malzeme dahil 10 günde anahtar teslim yaparım. Keşif ücretsizdir, referans işlerimin fotoğraflarını paylaşabilirim."),
    (3, 3, 1100, 1, "Matematik öğretmeniyim, 8 yıldır YKS hazırlık dersleri veriyorum. İlk ders ücretsiz tanışma dersi olarak yapılabilir."),
    (5, 1, 900, 1, "Beyaz eşya servisinde 12 yıl çalıştım. E17 genelde su giriş ventili arızasıdır, parça dahil aynı gün çözebilirim."),
    (6, 2, 6500, 3, "Animatör, balon süsleme ve doğum günü pastası dahil paket sunuyoruz. Çocuklar için yüz boyama ve oyunlar da var."),
]

# (offer index, sender: 'buyer'|'seller', content) — in order
MESSAGES = [
    (0, "seller", "Merhaba, eşya listesini paylaşabilir misiniz? Buna göre araç büyüklüğünü netleştirelim."),
    (0, "buyer", "Merhaba, 2+1 tam eşyalı. Bir de piyano var, ekstra ücret olur mu?"),
    (0, "seller", "Piyano için ek 1.000 TL olur, özel taşıma kayışlarıyla taşıyoruz."),
    (2, "buyer", "Cumartesi sabah 09:00'da başlayabilir misiniz?"),
    (2, "seller", "Evet, 09:00'da kapıda oluruz. Anahtar teslimi için bir saat önceden arayacağım."),
    (3, "buyer", "Keşif için perşembe akşam uygun musunuz?"),
    (4, "seller", "Merhaba, öğrencinin seviyesini görmek için kısa bir deneme sınavı yapmamızı öneririm."),
]

ACCEPT = [2]  # offer indexes the buyer accepts


# --- HTTP helpers -------------------------------------------------------------
def call(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    # The API rate limiter blocks generic script user agents (python, curl, ...).
    req.add_header("User-Agent", "ArayanibulDemoSeeder/1.0")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path} -> {e.code}: {e.read().decode()[:300]}") from None


def account(email, first, last):
    """Log in, registering the account first if it does not exist."""
    try:
        res = call("POST", "/auth/login", body={"email": email, "password": PASSWORD})
    except RuntimeError:
        call("POST", "/auth/register", body={"email": email, "password": PASSWORD,
                                               "firstName": first, "lastName": last})
        res = call("POST", "/auth/login", body={"email": email, "password": PASSWORD})
    return res["token"]


def main():
    print(f"API: {API}")
    buyers = [account(*b) for b in BUYERS]
    sellers = [account(*s) for s in SELLERS]
    print(f"Hesaplar hazır: {len(buyers)} alıcı, {len(sellers)} satıcı (şifre: {PASSWORD})")

    existing = call("GET", "/need/my-needs", buyers[0])
    existing = existing.get("items", existing) if isinstance(existing, dict) else existing
    if existing:
        print("Demo ilanları zaten yüklü, ilan/teklif/mesaj adımı atlandı.")
        return

    categories = {c["nameTr"]: c["id"] for c in call("GET", "/category")}
    now = datetime.now(timezone.utc)

    need_ids = []
    for b, cat, title, desc, lo, hi, urg, addr, lat, lng, days in NEEDS:
        need = call("POST", "/need", buyers[b], {
            "title": title, "description": desc, "categoryId": categories[cat],
            "minBudget": lo, "maxBudget": hi, "currency": "TRY", "urgency": urg,
            "address": addr, "latitude": lat, "longitude": lng,
            "expiresAt": (now + timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        })
        need_ids.append(need["id"])
    print(f"{len(need_ids)} ilan oluşturuldu")

    # Publish through moderation so offers can be made (offers need Active needs).
    admin_email, admin_password = os.environ.get("SEED_ADMIN_EMAIL"), os.environ.get("SEED_ADMIN_PASSWORD")
    if any(call("GET", f"/need/{nid}", buyers[NEEDS[i][0]]).get("status") == "PendingReview"
           for i, nid in enumerate(need_ids)):
        if not (admin_email and admin_password):
            print("İlanlar onay bekliyor. SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD verin ya da /admin panelinden "
                  "onaylayıp betiği tekrar çalıştırmadan önce demo hesaplarını temizleyin. Teklif adımı atlandı.")
            return
        admin = call("POST", "/auth/login", body={"email": admin_email, "password": admin_password})["token"]
        for nid in need_ids:
            call("POST", f"/admin/needs/{nid}/approve", admin, {})
        print(f"{len(need_ids)} ilan onaylandı")

    offers = []  # (offer id, buyer token, seller token)
    for n, s, price, delivery, desc in OFFERS:
        offer = call("POST", "/offer", sellers[s], {
            "needId": need_ids[n], "price": price, "currency": "TRY",
            "description": desc, "deliveryDays": delivery,
        })
        offers.append((offer["id"], buyers[NEEDS[n][0]], sellers[s]))
    print(f"{len(offers)} teklif oluşturuldu")

    for o, who, content in MESSAGES:
        offer_id, buyer, seller = offers[o]
        call("POST", "/message/send", buyer if who == "buyer" else seller,
             {"offerId": offer_id, "content": content})
    print(f"{len(MESSAGES)} mesaj gönderildi")

    for o in ACCEPT:
        offer_id, buyer, _ = offers[o]
        call("POST", f"/offer/{offer_id}/accept", buyer, {})
    print(f"{len(ACCEPT)} teklif kabul edildi")
    print("Bitti. Örnek giriş:", BUYERS[0][0], "/", PASSWORD)


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as err:
        sys.exit(f"Hata: {err}")
