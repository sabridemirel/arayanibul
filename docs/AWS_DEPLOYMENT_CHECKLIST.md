# AWS Deployment Checklist - Arayanibul Backend

> Bu dosya AWS deployment sürecini takip etmek için kullanılır.
> Son güncelleme: 2025-12-27

## Özet

| Durum | Açıklama |
|-------|----------|
| ✅ | **TAMAMLANDI** |
| Başlangıç | 2025-12-27 |
| Bitiş | 2025-12-27 |
| Region | eu-north-1 (Stockholm) |

---

## Deployment Bilgileri

### Erişim Bilgileri

| Bilgi | Değer |
|-------|-------|
| **EC2 Public IP** | `13.62.223.188` |
| **API Base URL** | `http://13.62.223.188:5000` |
| **Health Check** | `http://13.62.223.188:5000/health` |
| **Swagger UI** | `http://13.62.223.188:5000/swagger` |
| **RDS Endpoint** | `arayanibul-db.cr8qc0aksrku.eu-north-1.rds.amazonaws.com` |
| **RDS Database** | `arayanibul` |
| **RDS Username** | `postgres` |
| **RDS Password** | `Arayanibul2024` |
| **RDS Port** | `5432` |
| **SSH Key** | `arayanibul-key.pem` |
| **JWT Secret** | `ArayanibulSuperSecretKey2024ProductionKeyMustBeLong123456` |

### Security Groups

| Security Group | Açıklama |
|----------------|----------|
| `arayanibul-ec2-sg` | EC2 için - Port 22 (SSH), Port 5000 (API) |
| `arayanibul-db-sg` | RDS için - Port 5432 (PostgreSQL) from EC2 SG |

---

## Faz 1: Backend Hazırlığı

- [x] **AWS-01**: Backend dosyaları hazırlama
  - [x] Dockerfile oluşturma (`src/backend/API/Dockerfile`)
  - [x] .dockerignore oluşturma (`src/backend/API/.dockerignore`)
  - [x] appsettings.Production.json oluşturma
  - [x] PostgreSQL desteği ekleme (Npgsql package)
  - [x] Health check endpoint ekleme (`/health`)
  - [x] OAuth'u opsiyonel hale getirme (production için)
  - [x] PostgreSQL migration oluşturma

---

## Faz 2: AWS Altyapı Kurulumu

- [x] **AWS-02**: RDS PostgreSQL oluşturma
  - [x] AWS Console → RDS → Create database
  - [x] Engine: PostgreSQL 17.x
  - [x] Template: Dev/Test (Single-AZ)
  - [x] Instance: db.t3.micro (Free tier eligible)
  - [x] Storage: 20 GB gp2
  - [x] Database name: `arayanibul`
  - [x] Master username: `postgres`
  - [x] Public access: Yes (geçici)
  - [x] Performance Insights: Disabled

- [x] **AWS-03**: Security Group ayarları
  - [x] `arayanibul-db-sg` (RDS için)
    - [x] Inbound: PostgreSQL (5432) from `arayanibul-ec2-sg`
    - [x] Inbound: PostgreSQL (5432) from My IP (migration için)
  - [x] `arayanibul-ec2-sg` (EC2 için)
    - [x] Inbound: SSH (22) from My IP
    - [x] Inbound: Custom TCP (5000) from Anywhere

- [x] **AWS-04**: EC2 instance oluşturma
  - [x] AWS Console → EC2 → Launch Instance
  - [x] Name: `arayanibul-api`
  - [x] AMI: Amazon Linux 2023
  - [x] Instance type: t3.micro (Free tier eligible)
  - [x] Key pair: `arayanibul-key`
  - [x] Security group: `arayanibul-ec2-sg`
  - [x] Storage: 8 GB gp3

---

## Faz 3: EC2 Konfigürasyonu

- [x] **AWS-05**: EC2'ye Docker kurulumu
  ```bash
  # SSH ile bağlan
  ssh -i "arayanibul-key.pem" ec2-user@13.62.223.188

  # Docker kur
  sudo yum update -y
  sudo yum install -y docker git
  sudo service docker start
  sudo usermod -a -G docker ec2-user

  # Çıkış yap ve tekrar bağlan
  exit
  ssh -i "arayanibul-key.pem" ec2-user@13.62.223.188
  ```

- [x] **AWS-06**: Environment variables (.env) oluşturma
  ```bash
  cd ~/arayanibul/src/backend/API
  nano .env
  ```

  İçerik:
  ```env
  ASPNETCORE_ENVIRONMENT=Production
  ConnectionStrings__DefaultConnection=Host=arayanibul-db.cr8qc0aksrku.eu-north-1.rds.amazonaws.com;Database=arayanibul;Username=postgres;Password=Arayanibul2024
  JwtSettings__Secret=ArayanibulSuperSecretKey2024ProductionKeyMustBeLong123456
  ```

---

## Faz 4: Deployment

- [x] **AWS-07**: Docker image build
  ```bash
  # EC2'da - repo clone
  cd ~
  git clone https://github.com/sabridemirel/arayanibul.git
  cd arayanibul/src/backend/API

  # Docker build
  docker build -t arayanibul-api .
  ```

- [x] **AWS-08**: Database migration
  ```bash
  # Local Mac'te (PostgreSQL bağlantısı ile)
  cd /Users/sabridemirel/GIT/arayanibul/src/backend/API

  export ASPNETCORE_ENVIRONMENT=Production
  export ConnectionStrings__DefaultConnection="Host=arayanibul-db.cr8qc0aksrku.eu-north-1.rds.amazonaws.com;Database=arayanibul;Username=postgres;Password=Arayanibul2024"

  dotnet ef database update
  ```

- [x] **AWS-09**: Container çalıştırma ve test
  ```bash
  # Container'ı başlat
  docker run -d \
    --name arayanibul-api \
    -p 5000:5000 \
    --env-file .env \
    arayanibul-api

  # Test
  curl http://localhost:5000/health
  # Beklenen: {"status":"healthy","timestamp":"..."}
  ```

---

## Faz 5: Mobile App Güncelleme

- [x] **AWS-10**: Mobile app API URL güncelleme
  - [x] `src/mobile/services/api.ts` dosyasında production URL güncellendi
  - [x] Production URL: `http://13.62.223.188:5000/api`

---

## Faydalı Komutlar

### SSH Bağlantısı
```bash
ssh -i ~/Downloads/arayanibul-key.pem ec2-user@13.62.223.188
```

### Docker Komutları (EC2'da)
```bash
# Container durumu
docker ps

# Logları izle
docker logs -f arayanibul-api

# Container'ı yeniden başlat
docker restart arayanibul-api

# Container'ı durdur ve sil
docker stop arayanibul-api && docker rm arayanibul-api

# Yeniden deploy (git pull sonrası)
docker stop arayanibul-api && docker rm arayanibul-api
cd ~/arayanibul && git pull origin main
cd src/backend/API
docker build -t arayanibul-api .
docker run -d --name arayanibul-api -p 5000:5000 --env-file .env arayanibul-api
```

### Database Bağlantısı (Local'den)
```bash
psql "host=arayanibul-db.cr8qc0aksrku.eu-north-1.rds.amazonaws.com dbname=arayanibul user=postgres password=Arayanibul2024"
```

---

## Troubleshooting

### Container başlamıyor
```bash
docker logs arayanibul-api
```

### DB bağlantı hatası
1. Security group kontrol et (`arayanibul-db-sg`)
2. RDS endpoint doğru mu kontrol et
3. Password doğru mu kontrol et

### Health check başarısız
1. Port mapping doğru mu: `-p 5000:5000`
2. Container çalışıyor mu: `docker ps`
3. Logları kontrol et: `docker logs arayanibul-api`

### OAuth hatası
OAuth credentials yoksa uygulama yine de çalışmalı.
ServiceExtensions.cs'de OAuth opsiyonel hale getirildi.

---

## Maliyet Takibi

| Kaynak | Free Tier Limiti | Durum |
|--------|------------------|-------|
| EC2 t3.micro | 750 saat/ay | ✅ Kapsamda |
| RDS db.t3.micro | 750 saat/ay | ✅ Kapsamda |
| EBS Storage | 30 GB/ay | ✅ Kapsamda |
| Data Transfer | 100 GB/ay | ✅ Kapsamda |

> ⚠️ Free tier 12 ay sonra sona erer. Billing Dashboard'u takip et!
> AWS Console → Billing Dashboard → Free Tier

---

## Sonraki Adımlar (Opsiyonel)

- [ ] HTTPS/SSL sertifikası (Let's Encrypt veya AWS ACM)
- [ ] Custom domain bağlama (Route 53)
- [ ] CloudWatch monitoring
- [ ] Auto-restart yapılandırması (`--restart unless-stopped`)
- [ ] S3 bucket (dosya yükleme için)
- [ ] CI/CD pipeline (GitHub Actions)
