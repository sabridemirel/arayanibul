# Arayanibul — Canlı Ortam Kurulumu (Hetzner + Cloudflare)

Mimari:

```
Kullanıcı ──► Cloudflare (DNS, HTTPS, CDN)
               ├── arayanibul.com      → Cloudflare Pages (web, statik)
               └── api.arayanibul.com  → Hetzner sunucu
                                          └── Caddy (HTTPS) → API (.NET) → PostgreSQL
```

Mobil uygulamalar API'ye **alan adıyla** (`https://api.<alan-adı>/api`) bağlanır; sunucu değişse bile
(ör. ileride AWS'ye geçiş) sadece DNS kaydı değişir, mağazaya yeni sürüm gerekmez.

Aylık maliyet: Hetzner sunucu (~5,5–6 €). Cloudflare, Cloudflare Pages, Let's Encrypt: ücretsiz.

---

## 1. Sunucu (Hetzner Cloud)

1. Hetzner Cloud Console → yeni proje → **Add Server**
   - Konum: Nuremberg / Falkenstein / Helsinki
   - İmaj: **Ubuntu 24.04**
   - Tip: **CX23** (2 vCPU, 4 GB) veya **CAX11** (ARM, 2 vCPU, 4 GB) — hangisi açıksa
   - SSH anahtarınızı ekleyin (şifreyle giriş kullanmayın)
   - Firewall oluşturun: gelen **22, 80, 443 (TCP)** ve **443 (UDP)**; gerisi kapalı
2. Sunucuya bağlanıp Docker'ı kurun:

```bash
ssh root@<SUNUCU_IP>
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y git rclone unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades   # otomatik güvenlik güncellemeleri
```

3. Kodu çekin (özel repo ise GitHub'da **Deploy key** — salt okunur — tanımlayın):

```bash
mkdir -p /opt && cd /opt
git clone git@github.com:<hesap>/arayanibul.git
cd arayanibul/deploy
cp .env.example .env
nano .env
```

`.env` içinde **mutlaka** doldurun: `API_DOMAIN`, `WEB_DOMAIN`, `ACME_EMAIL`, `POSTGRES_PASSWORD`,
`JWT_SECRET`, `ADMIN_EMAILS`. Şifreleri üretmek için:

```bash
openssl rand -base64 32 | tr -d '/+='   # POSTGRES_PASSWORD
openssl rand -base64 48                 # JWT_SECRET
```

Sosyal giriş ve e-posta (SMTP) değerleri hesaplar açıldıkça doldurulur; boş kalırsa ilgili
özellik devre dışı kalır, API yine çalışır.

## 2. DNS (Cloudflare)

1. Alan adını Cloudflare'e ekleyin, kayıt firmanızda nameserver'ları Cloudflare'inkilerle değiştirin.
2. DNS kayıtları:
   - `A  api  <SUNUCU_IP>` — **Proxied (turuncu bulut)**
   - Web kaydını Cloudflare Pages kendisi ekler (adım 4).
3. SSL/TLS → mod: **Full (strict)**.

## 3. API'yi başlatın

```bash
cd /opt/arayanibul/deploy
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f api      # ilk açılışta migration'lar uygulanır
curl https://api.<alan-adı>/health                          # "Healthy"
```

Caddy sertifikayı ilk istekte otomatik alır. Veritabanı şeması açılışta kendiliğinden güncellenir.

**Demo verisi canlıya yüklenmez.** (Mağaza ekran görüntüleri için ayrı bir test ortamında
`python3 scripts/seed_demo.py https://api.<test-alanı>/api` kullanılabilir.)

### Yönetici hesabı
`ADMIN_EMAILS` içindeki e-postayla web'den kayıt olun (veya zaten kayıtlıysa giriş yapın);
hesap otomatik olarak yönetici olur ve üst menüde **Yönetim** görünür (`/admin`).

## 4. Web (Cloudflare Pages)

Cloudflare → Workers & Pages → **Create → Pages → Connect to Git** → repoyu seçin:

| Ayar | Değer |
|---|---|
| Production branch | `main` |
| Root directory | `src/web` |
| Build command | `npm ci && npm run build` |
| Build output | `dist` |
| Environment variables | `VITE_API_URL=https://api.<alan-adı>/api`, `NODE_VERSION=22` |

Sonra **Custom domains** → `<alan-adı>` ve `www.<alan-adı>` ekleyin. `main`'e her push'ta web
otomatik yayınlanır. (SPA yönlendirmesi ve güvenlik başlıkları `src/web/public/_redirects` ve
`_headers` dosyalarında.)

> Not: `.github/workflows/deploy-web.yml` eski S3/CloudFront dağıtımıdır; Pages'e geçince
> silinebilir veya devre dışı bırakılabilir.

## 5. Yedekleme

```bash
cd /opt/arayanibul/deploy
./backup.sh                      # elle deneme → backups/ altında db-*.dump ve uploads-*.tar.gz
crontab -e                       # şu satırı ekleyin:
30 3 * * * /opt/arayanibul/deploy/backup.sh >> /opt/arayanibul/deploy/backups/backup.log 2>&1
```

Sunucu dışı kopya (önerilir): Cloudflare R2 (10 GB ücretsiz) veya Hetzner Storage Box.
`rclone config` ile bir remote tanımlayıp `.env` içine `RCLONE_REMOTE=r2:arayanibul-backups` yazın.
Ayrıca Hetzner'in sunucu **Backups** özelliği (sunucu fiyatının %20'si) tüm diskin günlük
kopyasını alır.

### Geri yükleme

```bash
cd /opt/arayanibul/deploy
docker compose -f docker-compose.prod.yml stop api
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U arayanibul -d arayanibul --clean --if-exists < backups/db-YYYYMMDD-HHMM.dump
docker run --rm -v arayanibul_uploads:/data -v "$PWD/backups:/in" alpine \
  sh -c "rm -rf /data/* && tar xzf /in/uploads-YYYYMMDD-HHMM.tar.gz -C /data"
docker compose -f docker-compose.prod.yml start api
```

## 6. Güncelleme

```bash
cd /opt/arayanibul && git pull
cd deploy && docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f
```

## 7. Mobil derleme (EAS)

`src/mobile/eas.json` production profilinde `EXPO_PUBLIC_API_URL` ve `EXPO_PUBLIC_WEB_URL`'yi
kendi alan adınızla güncelleyin; Google/Facebook değerlerini EAS ortam değişkeni olarak girin
(`eas env:create`). Ayrıntılı liste: `src/mobile/app.config.ts`.

```bash
cd src/mobile
eas build --platform all --profile production
eas submit --platform ios      # App Store Connect
eas submit --platform android  # Google Play
```

## 8. İleride AWS'ye geçiş

Aynı `docker-compose.prod.yml` bir EC2/Lightsail sunucusunda çalışır (veritabanı RDS'ye
taşınacaksa `ConnectionStrings__DefaultConnection` değiştirilir). Adımlar: yeni sunucuyu kur →
kısa bakım penceresinde `backup.sh` ile alınan dump + görselleri geri yükle → Cloudflare'de
`api` kaydını yeni IP'ye çevir. Mobil uygulamalar etkilenmez.
