# AWS Deployment Checklist - Arayanibul Backend

> Bu dosya AWS deployment sürecini takip etmek için kullanılır.
> Her adım tamamlandığında `[ ]` → `[x]` olarak işaretleyin.

## Özet

| Durum | Açıklama |
|-------|----------|
| ⏳ | Devam ediyor |
| Başlangıç | 2024-12-26 |
| Hedef | Free Tier (12 ay ücretsiz) |

---

## Faz 1: Backend Hazırlığı

- [x] **AWS-01**: Backend dosyaları hazırlama
  - [x] Dockerfile oluşturma (`src/backend/API/Dockerfile`)
  - [x] .dockerignore oluşturma (`src/backend/API/.dockerignore`)
  - [x] appsettings.Production.json oluşturma
  - [x] PostgreSQL desteği ekleme (Npgsql package)
  - [x] Health check endpoint ekleme (`/health`)
  - [x] CORS production desteği ekleme
  - [x] deploy.sh script oluşturma

---

## Faz 2: AWS Altyapı Kurulumu

- [ ] **AWS-02**: RDS PostgreSQL oluşturma
  - [ ] AWS Console → RDS → Create database
  - [ ] Engine: PostgreSQL 15.x
  - [ ] Template: Free tier
  - [ ] Instance: db.t3.micro
  - [ ] Storage: 20 GB gp2
  - [ ] Database name: `arayanibul`
  - [ ] Master username: `arayanibul_admin`
  - [ ] Master password: [not al]
  - [ ] Endpoint'i kaydet: `____________.rds.amazonaws.com`

- [ ] **AWS-03**: Security Group ayarları
  - [ ] `arayanibul-db-sg` (RDS için)
    - [ ] Inbound: PostgreSQL (5432) from EC2 security group
  - [ ] `arayanibul-ec2-sg` (EC2 için)
    - [ ] Inbound: SSH (22) from My IP
    - [ ] Inbound: HTTP (5000) from Anywhere
    - [ ] Inbound: HTTPS (443) from Anywhere (opsiyonel)

- [ ] **AWS-04**: EC2 instance oluşturma
  - [ ] AWS Console → EC2 → Launch Instance
  - [ ] Name: `arayanibul-api`
  - [ ] AMI: Amazon Linux 2023
  - [ ] Instance type: t2.micro (Free tier)
  - [ ] Key pair: Yeni oluştur veya mevcut seç
  - [ ] Security group: `arayanibul-ec2-sg`
  - [ ] Storage: 8 GB gp3
  - [ ] Public IP: Enable
  - [ ] Public IP'yi kaydet: `____________`

---

## Faz 3: EC2 Konfigürasyonu

- [ ] **AWS-05**: EC2'ye Docker kurulumu
  ```bash
  # SSH ile bağlan
  ssh -i "your-key.pem" ec2-user@<EC2-PUBLIC-IP>

  # Docker kur
  sudo yum update -y
  sudo yum install docker -y
  sudo systemctl start docker
  sudo systemctl enable docker
  sudo usermod -aG docker ec2-user

  # Çıkış yap ve tekrar bağlan (group değişikliği için)
  exit
  ```

- [ ] **AWS-06**: Environment variables (.env) oluşturma
  ```bash
  # EC2'da .env dosyası oluştur
  nano ~/.env
  ```

  İçerik:
  ```env
  ASPNETCORE_ENVIRONMENT=Production
  ConnectionStrings__DefaultConnection=Host=<RDS-ENDPOINT>;Port=5432;Database=arayanibul;Username=arayanibul_admin;Password=<PASSWORD>
  JwtSettings__Secret=<MIN-32-KARAKTER-GUVENLI-KEY>
  JwtSettings__Issuer=ArayanibulAPI
  JwtSettings__Audience=ArayanibulMobileApp
  PaymentGateway__CallbackUrl=http://<EC2-PUBLIC-IP>:5000
  ```

---

## Faz 4: Deployment

- [ ] **AWS-07**: Docker image build & transfer
  ```bash
  # Local'de (Mac/Windows)
  cd src/backend/API
  docker build -t arayanibul-api:latest .
  docker save arayanibul-api:latest | gzip > arayanibul-api.tar.gz

  # EC2'ya transfer
  scp -i "your-key.pem" arayanibul-api.tar.gz ec2-user@<EC2-IP>:/home/ec2-user/

  # EC2'da
  docker load < arayanibul-api.tar.gz
  ```

- [ ] **AWS-08**: Database migration
  ```bash
  # İlk kez: Container'ı migration modunda çalıştır
  docker run --rm \
    --env-file ~/.env \
    arayanibul-api:latest \
    dotnet ef database update
  ```

- [ ] **AWS-09**: Container çalıştırma ve test
  ```bash
  # Uploads klasörü oluştur
  mkdir -p ~/uploads

  # Container'ı başlat
  docker run -d \
    --name arayanibul-api \
    --restart unless-stopped \
    -p 5000:5000 \
    --env-file ~/.env \
    -v ~/uploads:/app/wwwroot/uploads \
    arayanibul-api:latest

  # Test
  curl http://localhost:5000/health
  curl http://localhost:5000/swagger
  ```

---

## Faz 5: Mobile App Güncelleme

- [ ] **AWS-10**: Mobile app API URL güncelleme
  - [ ] `src/mobile/services/api.ts` dosyasında BASE_URL güncelle
  - [ ] Production için environment config ekle
  - [ ] Test et

---

## Notlar

### Önemli Bilgiler (Deployment sırasında doldur)

| Bilgi | Değer |
|-------|-------|
| RDS Endpoint | |
| RDS Password | |
| EC2 Public IP | |
| SSH Key Path | |
| JWT Secret | |

### Faydalı Komutlar

```bash
# Container durumu
docker ps

# Logları izle
docker logs -f arayanibul-api

# Container'ı yeniden başlat
docker restart arayanibul-api

# Container'ı durdur ve sil
docker stop arayanibul-api && docker rm arayanibul-api
```

### Troubleshooting

1. **Container başlamıyor**: `docker logs arayanibul-api`
2. **DB bağlantı hatası**: Security group ve connection string kontrol et
3. **Health check başarısız**: Port 5000 açık mı kontrol et

---

## Maliyet Takibi

| Ay | EC2 | RDS | S3 | Toplam |
|----|-----|-----|-----|--------|
| 1  | $0  | $0  | $0  | $0     |
| ... | ... | ... | ... | ...    |

> ⚠️ Free tier 12 ay sonra sona erer. Billing Dashboard'u takip et!
