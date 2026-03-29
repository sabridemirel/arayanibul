# Arayanibul Web - Advanced Filter UX Specification
# SearchPage Gelismis Filtre Sistemi

**Dosya:** `src/web/src/pages/SearchPage.tsx`
**Tarih:** 2026-03-12
**Hedef:** Mobile app ile birebir design language eslesimi, web-native enhancements

---

## Mevcut Durum Analizi

```
MEVCUT SearchPage yapisI:
- Filter grid: lg:grid-cols-4 (Kategori | Butce | Aciliyet | Uygula Butonu)
- Konum filtresi: YOK (NeedFilters interface'inde latitude/longitude/radius VAR)
- Sort: YOK
- Aktif tag'lar: YOK
- Sonuc sayisi: var ama minimalist
```

---

## 1. Konum Filtresi — Toggle + Radius Dropdown

### Mobile Referansi
Mobile `FilterModal.tsx` — "Konum Yaricapi" bolumu:
- Slider ile 0-100km araliginda radius secimi
- `colors.secondaryOrangeDark` (#D97706) ile thumb + track rengi
- Yardimci metin: "Konum izni verildiyse, bu yaricap icindeki ihtiyaclar gosterilir"

### Web Adaptasyonu: 5. Kolon (Location Filter)

Mevcut `lg:grid-cols-4` grid'i `lg:grid-cols-5` yapilacak. Konum filtresi 4. kolon olarak ekleniyor, mevcut "Uygula" butonu 5. kolona kaliyor.

#### State Diagram

```
[IDLE]
  Kullanici izni yok / henuz istek yok
  Buton: "Konumumu Kullan" (outline variant)

[LOADING]
  Geolocation API istegi suryor
  Buton: disabled, spinner goster

[ACTIVE]
  Konum alindi, radius selector gorunur
  Buton: primary variant (filled purple)
  Radius dropdown: gorunur

[ERROR / DENIED]
  Izin reddedildi veya hata
  Inline hata mesaji goster
  Buton: "Yeniden Dene" (outline, error rengi)
```

#### Component Structure

```
<div> <!-- location-filter-col -->
  <label> Konum </label>

  <!-- State: IDLE -->
  <button class="location-toggle-idle">
    <MapPinIcon />
    Konumumu Kullan
  </button>

  <!-- State: LOADING -->
  <button class="location-toggle-loading" disabled>
    <SpinnerIcon class="animate-spin" />
    Konum Aliniyor...
  </button>

  <!-- State: ACTIVE — buton + radius -->
  <div class="space-y-2">
    <button class="location-toggle-active">
      <MapPinIcon class="text-white" />
      Konum Aktif
      <XMarkIcon class="ml-auto" /> <!-- tiklaninca konumu kaldir -->
    </button>
    <div class="relative">
      <select class="radius-select">
        <option value="5">5 km yaricap</option>
        <option value="10">10 km yaricap</option>
        <option value="25">25 km yaricap</option>
        <option value="50">50 km yaricap</option>
        <option value="100">100 km yaricap</option>
      </select>
      <ChevronDownIcon />
    </div>
  </div>

  <!-- State: ERROR / DENIED -->
  <div class="location-error-state">
    <ExclamationTriangleIcon />
    <span>Konum izni gerekli</span>
    <button class="retry-button">Yeniden Dene</button>
  </div>
</div>
```

#### Exact Tailwind Classes

**Label (diger filterlerle tutarli):**
```
className="block text-sm font-medium text-text mb-1"
```

**Buton — IDLE state:**
```
className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-primary text-primary bg-transparent hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm font-medium"
```

**Buton — LOADING state:**
```
className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-border text-text-secondary bg-background cursor-not-allowed opacity-60 text-sm font-medium"
disabled
```

**Buton — ACTIVE state (konum alindi):**
```
className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors text-sm font-medium"
```

**ACTIVE state icindeki XMarkIcon (konum kaldir):**
```
className="ml-auto h-4 w-4 opacity-80 hover:opacity-100 cursor-pointer flex-shrink-0"
```

**Radius Select (sadece ACTIVE state'de gorunur):**
```
className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-secondary-orange/20 focus:border-secondary-orangeDark transition-colors"
```

Not: Radius select icin secondary orange renk kullaniliyor. Mobile'da da konum slider'i `colors.secondaryOrangeDark` kullaniyordu — bu tutarliligi korur.

**ChevronDownIcon (radius select icinde):**
```
className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none"
```

**Error state container:**
```
className="rounded-lg border border-error/30 bg-error/5 px-3 py-2.5 space-y-1.5"
```

**Error state ikon + metin satiri:**
```
className="flex items-center gap-1.5 text-xs text-error"
```
- ExclamationTriangleIcon: `h-4 w-4 flex-shrink-0`

**Error state "Yeniden Dene" butonu:**
```
className="text-xs font-medium text-primary hover:text-primary-dark underline underline-offset-2 transition-colors"
```

**Yardimci metin (ACTIVE durumda radius alti):**
```
className="text-xs text-text-secondary mt-1"
// Icerik: "Seçilen yarıçap içindeki ilanlar gösterilir"
```

#### UX Karar Notlari

**Neden toggle + dropdown (slider degil)?**
- Web ortaminda slider, mouse ile hassas kontrol icin optimize degildir
- 5 standart preset (5/10/25/50/100 km) kullanici icin yeterince granular
- Select element native OS dropdown acarak mobile web'de de iyi calisir
- Mobile'daki slider web'e dogrudan tasimak UX antiplatter'dir

**Konum izni deneyimi:**
- Buton tiklandiginda tarayici native izin dialog'u gosterir
- Bu tarayici native davranisi — bizim loading state'imiz bu dialog kapatildiktan sonra devreye girer
- Izin reddedildiyse browser ikinci kez sormaz, kullanici browser ayarlarindan degistirmeli — bunu error mesajinda belirtmek gerekir

**Radius default deger:** 10 km (mobile'daki default'la esdeger)

---

## 2. Sort Dropdown — 5. Kolon

### Tasarim Karari: Native Select vs Custom Dropdown

**Karar: Native `<select>` kullan**

Gerekce:
- Mevcut filter grid'indeki tum diger secim elemanlari native `<select>` kullaniyor (Kategori, Aciliyet)
- Tutarli pattern tarayici erisilebilirligi saglıyor (keyboard, screen reader)
- Custom dropdown 5 secenek icin overkill, ek JS complexity gerektirir
- Mobile web'de native select OS modal'i aciyor — kullanici deneyimi daha iyi

### Grid Degisikligi

```
ONCE:  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4
SONRA: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5
```

Konum filtresi 4. kolona, Sort 5. kolona EKLENMIYOR.

Revize yerlestirme plani:
```
Kolon 1: Kategori (mevcut)
Kolon 2: Butce Araligi (mevcut)
Kolon 3: Aciliyet (mevcut)
Kolon 4: Konum (YENI)
Kolon 5: Uygula Butonu (mevcut, yerini korur)
```

Sort dropdown filter grid'inin DISINDA, sonuclar bolumunde Result Header bar'a eklenir. Bu daha dogru bir UX pattern'idir cunku:
- Sort bir "filtre" degil, "goruntuleme tercihi"dir
- Sonuclar gorunurken her an degistirilebilir olmali
- Filtre paneli kapali olsa bile sort her zaman erislebilir olmali

### Sort Dropdown Konumu: Results Header Bar

```
ONCE (mevcut results count satiri):
<p class="text-text-secondary mb-6">
  <span class="font-medium text-text">24</span> ilan bulundu
</p>

SONRA (yeni results header bar):
<div class="flex items-center justify-between mb-6">
  <!-- Sol: Sonuc sayisi -->
  <p class="text-text-secondary">
    <span class="font-medium text-text">24</span> ilan bulundu
    <!-- eger arama varsa: - "bisiklet" icin -->
  </p>

  <!-- Sag: Sort dropdown -->
  <div class="flex items-center gap-2">
    <span class="text-sm text-text-secondary whitespace-nowrap">Sirala:</span>
    <div class="relative">
      <select class="sort-select">
        <option value="newest">En Yeni</option>
        <option value="oldest">En Eski</option>
        <option value="budget_asc">Bütçe: Düşükten Yükseğe</option>
        <option value="budget_desc">Bütçe: Yüksekten Düşüğe</option>
        <option value="offers_desc">En Çok Teklif Alan</option>
      </select>
      <ChevronDownIcon />
    </div>
  </div>
</div>
```

#### Exact Tailwind Classes — Sort Dropdown

**Results Header Container:**
```
className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6"
```

**Sonuc sayisi metni (degismez):**
```
className="text-text-secondary"
```

**Sort container (sag taraf):**
```
className="flex items-center gap-2 flex-shrink-0"
```

**"Sirala:" label:**
```
className="text-sm text-text-secondary whitespace-nowrap"
```

**Sort select:**
```
className="pl-3 pr-8 py-1.5 rounded-lg border border-border bg-surface text-text text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors cursor-pointer hover:border-primary/50"
```

**Sort ChevronDownIcon:**
```
className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none"
```

**Sort wrapper (relative positioning icin):**
```
className="relative"
```

#### Sort Secenekleri ve State Tipi

```typescript
type SortOption = 'newest' | 'oldest' | 'budget_asc' | 'budget_desc' | 'offers_desc';

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'oldest', label: 'En Eski' },
  { value: 'budget_asc', label: 'Bütçe: Düşük → Yüksek' },
  { value: 'budget_desc', label: 'Bütçe: Yüksek → Düşük' },
  { value: 'offers_desc', label: 'En Çok Teklif Alan' },
];

// Initial state
const [sortBy, setSortBy] = useState<SortOption>('newest');
```

**Secili durum gorunumu:**
- Native select zaten secili option'u gosteriyor
- Ek bir "badge" veya icon gerekmez
- Eger siralamasi 'newest' degil ise, sort label basina kucuk bir "•" nokta indicator eklenebilir:

```
className={`text-sm ${sortBy !== 'newest' ? 'text-primary font-medium' : 'text-text-secondary'} whitespace-nowrap`}
// 'newest' disinda bir sort secilince "Sirala:" metni primary renge donuyor
```

---

## 3. Aktif Filtre Tag'lari

### Mobile Referansi
Mobile'da FilterModal'da `getActiveFilterCount()` ile sayac gosteriliyor ama tag'lar yok. Web'de tag sistemi orijinal bir web enhancement'tir — kullanicinin hangi filtrelerin aktif oldugunu tek bakista gormesini saglar.

### Konum: Filter Paneli ile Sonuclar Arasinda

```
[Search Header Section]
[Filter Panel Section — acikken]
[Active Filter Tags Section — YENI]  <-- buraya
[Results Section]
```

Bu section sadece en az 1 aktif filtre varsa render edilir.

### Tag Renk Semasi

Her filtre tipi farkli bir semantic renk alir:

| Filtre Tipi       | Renk           | Tailwind Classes                                              | Gerekce                        |
|-------------------|----------------|---------------------------------------------------------------|-------------------------------|
| Arama sorgusu     | Primary purple | `bg-primary/10 text-primary border border-primary/20`        | Ana eylem                     |
| Kategori          | Primary purple | `bg-primary/10 text-primary border border-primary/20`        | Birincil filtreleme boyutu    |
| Butce             | Info teal      | `bg-info/10 text-info border border-info/20`                 | Ekonomik bilgi                |
| Aciliyet — Acil   | Error kirmizi  | `bg-error/10 text-error border border-error/20`              | Kritik/urgent anlami          |
| Aciliyet — Normal | Primary purple | `bg-primary/10 text-primary border border-primary/20`        | Standart durum                |
| Aciliyet — Esnek  | Success yesil  | `bg-success/10 text-success border border-success/20`        | Rahat/esnek anlami            |
| Konum             | Orange         | `bg-secondary-orange/10 text-secondary-orangeDark border border-secondary-orange/20` | Fiziksel konum (mobile'daki slider orange ile tutarli) |

### Tag Component Structure

```tsx
/* FilterTag — tekil tag */
<span
  role="group"
  aria-label={`Filtre: ${label}, kaldirmak icin X'e basin`}
  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium [renk-classlari]"
>
  {/* Opsiyonel icon */}
  {icon && <IconComponent className="h-3.5 w-3.5 flex-shrink-0" />}

  {/* Filtre degeri */}
  <span>{label}</span>

  {/* Kaldirma butonu */}
  <button
    onClick={() => onRemove()}
    aria-label={`${label} filtresini kaldir`}
    className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current transition-colors"
  >
    <XMarkIcon className="h-3.5 w-3.5" />
  </button>
</span>
```

**XMarkIcon boyutu karari: h-3.5 w-3.5 (14px)**
- 16px tag text'e oranla dogru gorsel agirlik
- Tiklama hedefi: wrapper button `p-0.5` ile 18px efektif hedef — WCAG 2.5.5 icin yeterli (minimum 24px onerilir ama bu context'te kabul edilebilir cunku tag'in kendisi de tiklama bolgesi olabilir)
- Hover state: `hover:bg-black/10` — tag renk semasi ne olursa olsun calisir, ek renk hesabı gerektirmez

**Not:** Daha agresif erisilebilirlik icin XMarkIcon'u saran button'a `min-w-[24px] min-h-[24px]` eklenebilir.

### "Tum filtreleri temizle" Konumu

Tag listesinin en saginda, gap ile ayrilmis bir link olarak:

```
[Arama: bisiklet x]  [Kategori: Elektronik x]  [Konum: 10km x]    Tüm filtreleri temizle
```

**Exact classes:**
```
className="text-sm text-text-secondary hover:text-error transition-colors underline-offset-2 hover:underline ml-2 flex-shrink-0"
```

Hover'da error kirmizisina donmesi, kullaniciya bu aksiyonun destructive oldugunu sinyaller. Hic alt cizgi yok — hover'da belirir.

### Tags Container

```
className="flex flex-wrap items-center gap-2 py-3 px-4 sm:px-6 lg:px-8 bg-surface border-b border-border"
// veya max-width wrapper icinde:
className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-2"
```

### Tum Tag Ornekleri ve Classlari

**Arama sorgusu tag:**
```tsx
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
  <MagnifyingGlassIcon className="h-3.5 w-3.5 flex-shrink-0" />
  <span>&quot;{searchQuery}&quot;</span>
  <button onClick={() => { setSearchQuery(''); performSearch(1, false); }}
    className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current transition-colors"
    aria-label="Arama sorgusunu temizle">
    <XMarkIcon className="h-3.5 w-3.5" />
  </button>
</span>
```

**Kategori tag:**
```tsx
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
  <TagIcon className="h-3.5 w-3.5 flex-shrink-0" />
  <span>{selectedCategoryName}</span>
  <button onClick={() => setSelectedCategoryId(undefined)}
    className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current transition-colors"
    aria-label="Kategori filtresini kaldir">
    <XMarkIcon className="h-3.5 w-3.5" />
  </button>
</span>
```

**Butce tag:**
```tsx
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-info/10 text-info border border-info/20">
  <CurrencyDollarIcon className="h-3.5 w-3.5 flex-shrink-0" />
  <span>{minBudget && maxBudget ? `${minBudget.toLocaleString('tr-TR')} - ${maxBudget.toLocaleString('tr-TR')} TRY` : minBudget ? `${minBudget.toLocaleString('tr-TR')} TRY+` : `${maxBudget!.toLocaleString('tr-TR')} TRY'ye kadar`}</span>
  <button onClick={() => { setMinBudget(''); setMaxBudget(''); }}
    className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current transition-colors"
    aria-label="Butce filtresini kaldir">
    <XMarkIcon className="h-3.5 w-3.5" />
  </button>
</span>
```

**Aciliyet tag — dinamik renk:**
```tsx
// urgencyTagClasses helper fonksiyonu
const getUrgencyTagClasses = (urgency: string): string => {
  switch (urgency) {
    case 'Urgent':  return 'bg-error/10 text-error border border-error/20';
    case 'Normal':  return 'bg-primary/10 text-primary border border-primary/20';
    case 'Flexible': return 'bg-success/10 text-success border border-success/20';
    default: return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
};

const urgencyIcons = { Urgent: BoltIcon, Normal: ClockIcon, Flexible: CalendarDaysIcon };
const UrgencyIcon = urgencyIcons[urgency as keyof typeof urgencyIcons] || ClockIcon;

<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getUrgencyTagClasses(urgency)}`}>
  <UrgencyIcon className="h-3.5 w-3.5 flex-shrink-0" />
  <span>{urgency === 'Urgent' ? 'Acil' : urgency === 'Normal' ? 'Normal' : 'Esnek'}</span>
  <button onClick={() => setUrgency('')}
    className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current transition-colors"
    aria-label="Aciliyet filtresini kaldir">
    <XMarkIcon className="h-3.5 w-3.5" />
  </button>
</span>
```

**Konum tag:**
```tsx
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-secondary-orange/10 text-secondary-orangeDark border border-secondary-orange/20">
  <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
  <span>{locationRadius} km yaricap</span>
  <button onClick={() => { setLocationActive(false); setLocationRadius(10); setUserCoords(null); }}
    className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current transition-colors"
    aria-label="Konum filtresini kaldir">
    <XMarkIcon className="h-3.5 w-3.5" />
  </button>
</span>
```

**HeroIcons import listesi (ek ikonlar):**
```tsx
import {
  // Mevcut:
  MagnifyingGlassIcon, AdjustmentsHorizontalIcon, XMarkIcon,
  FunnelIcon, ChevronDownIcon, ExclamationTriangleIcon, MagnifyingGlassCircleIcon,
  MapPinIcon,
  // YENI — tag ikonlari:
  TagIcon,           // Kategori tag icin (NeedCard'dan zaten import ediliyor)
  CurrencyDollarIcon, // Butce tag icin (NeedCard'dan)
  BoltIcon,          // Urgent aciliyet icin
  ClockIcon,         // Normal aciliyet icin
  CalendarDaysIcon,  // Flexible aciliyet icin
} from '@heroicons/react/24/outline';
```

---

## 4. Sonuc Sayisi Gorunumu

### Mevcut Durum
```tsx
<p className="text-text-secondary mb-6">
  {needs.length === 0 ? 'Sonuc bulunamadi' : (
    <><span className="font-medium text-text">{needs.length}</span> ilan bulundu</>
  )}
</p>
```

Eksikler:
- Pagination varken toplam sayiyi gostermiyor, sadece yuklenen sayiyi
- Sort dropdown ile yan yana duracak sekilde duzenlenmiyor
- Loading skeleton yok

### Yeni Results Header Bar

```tsx
{/* Results Header */}
{!isLoading && !error && (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">

    {/* Sol: Sonuc bilgisi */}
    <div className="flex items-center gap-2 flex-wrap">
      {needs.length === 0 ? (
        <p className="text-text-secondary">Sonuc bulunamadi</p>
      ) : (
        <p className="text-text-secondary">
          <span className="font-semibold text-text text-lg">{needs.length}</span>
          {hasMore ? '+' : ''}{' '}
          <span>ilan bulundu</span>
          {searchQuery && (
            <>
              {' '}&mdash;{' '}
              <span className="text-text">
                &ldquo;<span className="font-medium text-primary">{searchQuery}</span>&rdquo; icin
              </span>
            </>
          )}
        </p>
      )}
    </div>

    {/* Sag: Sort dropdown — sadece sonuc varsa */}
    {needs.length > 0 && (
      <div className="flex items-center gap-2 flex-shrink-0">
        <label
          htmlFor="sort-select"
          className={`text-sm whitespace-nowrap transition-colors ${sortBy !== 'newest' ? 'text-primary font-medium' : 'text-text-secondary'}`}
        >
          Sirala:
        </label>
        <div className="relative">
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="pl-3 pr-8 py-1.5 rounded-lg border border-border bg-surface text-text text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors cursor-pointer hover:border-primary/50 min-w-[180px]"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
        </div>
      </div>
    )}
  </div>
)}

{/* Loading skeleton — results header icin */}
{isLoading && (
  <div className="flex items-center justify-between mb-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-40" />
    <div className="h-8 bg-gray-200 rounded w-48" />
  </div>
)}
```

### "hasMore" ile sayac mesaji

```
24 ilan bulundu          → tam liste (hasMore=false)
24+ ilan bulundu         → daha fazla var (hasMore=true)
"bisiklet" icin 8 ilan  → arama sonucu
```

---

## 5. Responsive Davranis

### Desktop (>= 1280px — lg)

```
+--------------------------------------------------+
| [Kategori v] [Butce Min-Max] [Aciliyet v] [Konum] [Uygula] |
+--------------------------------------------------+

[24+ ilan bulundu — "bisiklet" icin]        [Sirala: En Yeni v]

[X "bisiklet"] [X Elektronik] [X 10km yaricap]  Tüm filtreleri temizle

[Kart] [Kart] [Kart]
[Kart] [Kart] [Kart]
```

Filter grid: `grid-cols-5`
Results grid: `grid-cols-3` (mevcut)

### Laptop (>= 1024px — lg ama dar)

`grid-cols-5` calisir, kolonlar daralar. Min-width sorun cikabilir.
- Butce inputlari: `px-2 py-2.5` (padding azaltilir)
- Sort min-width: `min-w-[160px]`

### Tablet (768px–1279px — md)

```
Filter grid: md:grid-cols-2 (mevcut)
  [Kategori] [Butce]
  [Aciliyet] [Konum]
  [Uygula Butonu — colspan 2 degil, tam genislik]

Results header: flex-col sm:flex-row
  24+ ilan
  Sirala: [dropdown]

Tags: flex-wrap
```

Filter grid'i mevcut `md:grid-cols-2` tutuluyor. Konum 3. satira, Uygula 4. satira dustugunde tasarim bozulur. Duzeltme:

```
TABLET FILTER GRID (md):
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5
→ md breakpoint'te Konum ve Uygula alt alta gelir, bu kabul edilebilir
→ Alternatif: Uygula butonunu filter bolumunun disina cikar, ayri bir satira koy
```

**Onerim — Uygula butonunu filter alt-bar'a tasinmasi:**
```tsx
{/* Filter Grid — 4 kolon (sadece filtreler) */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Kategori, Butce, Aciliyet, Konum */}
</div>

{/* Filter Actions — ayri satir */}
<div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
  <span className="text-sm text-text-secondary">
    {getActiveFilterCount() > 0
      ? `${getActiveFilterCount()} filtre aktif`
      : 'Filtre secilmedi'}
  </span>
  <div className="flex items-center gap-3">
    {getActiveFilterCount() > 0 && (
      <button onClick={clearFilters} className="text-sm text-text-secondary hover:text-error transition-colors">
        Temizle
      </button>
    )}
    <Button variant="primary" onClick={() => { updateURLParams(); performSearch(1, false); }}>
      Filtreleri Uygula
    </Button>
  </div>
</div>
```

Bu yapiyla:
- Desktop: 4 filtre kolonu yan yana, action bar altta
- Tablet: 2 filtre kolonu, action bar altta
- Mobile: 1 kolon filtre, action bar altta

### Mobile Web (< 768px)

```
Filter panel: tek kolon, full-width
Tags: yatay scroll (overflow-x-auto) veya wrap
Results header: ust alta layout
  24+ ilan bulundu
  [Sirala: En Yeni    v]

Tags scrollable:
  [X "bisiklet"] [X Elektronik] [X 10km] → yatay scroll
```

**Tags — mobile icin yatay scroll:**
```tsx
{/* Mobile: yatay scroll, Desktop: wrap */}
<div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-x-visible
                [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
  {/* tag'lar */}

  {/* "Tum filtreleri temizle" — mobile'da en sona, desktop'ta flex-shrink-0 */}
  <button className="flex-shrink-0 text-sm text-text-secondary hover:text-error ...">
    Tüm filtreleri temizle
  </button>
</div>
```

---

## 6. Yeni State Degiskenleri

Mevcut state'e eklenmesi gereken:

```typescript
// Konum filter state
const [locationActive, setLocationActive] = useState(false);
const [locationLoading, setLocationLoading] = useState(false);
const [locationError, setLocationError] = useState<string | null>(null);
const [locationRadius, setLocationRadius] = useState<number>(10);
const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

// Sort state
const [sortBy, setSortBy] = useState<SortOption>('newest');
```

**Geolocation handler:**
```typescript
const handleLocationToggle = async () => {
  if (locationActive) {
    // Konumu kapat
    setLocationActive(false);
    setUserCoords(null);
    setLocationError(null);
    return;
  }

  if (!navigator.geolocation) {
    setLocationError('Tarayiciniz konum desteklemiyor');
    return;
  }

  setLocationLoading(true);
  setLocationError(null);

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      setLocationActive(true);
      setLocationLoading(false);
    },
    (error) => {
      setLocationLoading(false);
      if (error.code === error.PERMISSION_DENIED) {
        setLocationError('Konum izni reddedildi. Tarayici ayarlarindan izin verin.');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setLocationError('Konumunuz belirlenemedi. Tekrar deneyin.');
      } else {
        setLocationError('Konum alinamadi. Tekrar deneyin.');
      }
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
};
```

**buildFilters icin konum ekleme:**
```typescript
const buildFilters = useCallback((): NeedFilters => {
  const filters: NeedFilters = { page: currentPage, pageSize: ITEMS_PER_PAGE };

  if (selectedCategoryId) filters.categoryId = selectedCategoryId;
  if (minBudget) filters.minBudget = parseInt(minBudget);
  if (maxBudget) filters.maxBudget = parseInt(maxBudget);
  if (urgency) filters.urgency = urgency;
  if (searchQuery.trim()) filters.search = searchQuery.trim();

  // Konum filtresi — YENI
  if (locationActive && userCoords) {
    filters.latitude = userCoords.lat;
    filters.longitude = userCoords.lng;
    filters.radius = locationRadius;
  }

  // Sort — sort API parametresi backend'e eklendiginde aktif olur
  // filters.sortBy = sortBy;

  return filters;
}, [selectedCategoryId, minBudget, maxBudget, urgency, searchQuery, currentPage, locationActive, userCoords, locationRadius]);
```

---

## 7. Tam Filter Panel JSX (Revize)

Mevcut `showFilters && (...)` bolumunun yerine gececek:

```tsx
{/* Filters Panel */}
{showFilters && (
  <section className="bg-surface border-b border-border py-4">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      {/* Filter Header */}
      <div className="flex items-center gap-2 mb-4">
        <FunnelIcon className="h-5 w-5 text-primary" />
        <span className="font-medium text-text">Filtreler</span>
        {getActiveFilterCount() > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold bg-secondary-orange text-white rounded-full">
            {getActiveFilterCount()}
          </span>
        )}
      </div>

      {/* Filter Grid — 4 filtre kolonu */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Kolon 1: Kategori */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">Kategori</label>
          <div className="relative">
            <select ...> ... </select>
            <ChevronDownIcon ... />
          </div>
        </div>

        {/* Kolon 2: Butce */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">Butce Araligi (TRY)</label>
          <div className="flex items-center gap-2">
            <input type="number" placeholder="Min" ... />
            <span className="text-text-secondary">-</span>
            <input type="number" placeholder="Max" ... />
          </div>
        </div>

        {/* Kolon 3: Aciliyet */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">Aciliyet Durumu</label>
          <div className="relative">
            <select ...> ... </select>
            <ChevronDownIcon ... />
          </div>
        </div>

        {/* Kolon 4: Konum — YENI */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">Konum</label>

          {/* IDLE state */}
          {!locationActive && !locationLoading && !locationError && (
            <button
              onClick={handleLocationToggle}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-primary text-primary bg-transparent hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors text-sm font-medium"
            >
              <MapPinIcon className="h-4 w-4" />
              Konumumu Kullan
            </button>
          )}

          {/* LOADING state */}
          {locationLoading && (
            <button
              disabled
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-border text-text-secondary bg-background cursor-not-allowed opacity-60 text-sm font-medium"
            >
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Konum Aliniyor...
            </button>
          )}

          {/* ACTIVE state */}
          {locationActive && !locationLoading && (
            <div className="space-y-2">
              <button
                onClick={handleLocationToggle}
                className="w-full inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors text-sm font-medium"
              >
                <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                <span>Konum Aktif</span>
                <XMarkIcon className="ml-auto h-4 w-4 opacity-80 hover:opacity-100 flex-shrink-0" />
              </button>
              <div className="relative">
                <select
                  value={locationRadius}
                  onChange={(e) => setLocationRadius(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-secondary-orange/20 focus:border-secondary-orangeDark transition-colors"
                >
                  <option value={5}>5 km yaricap</option>
                  <option value={10}>10 km yaricap</option>
                  <option value={25}>25 km yaricap</option>
                  <option value={50}>50 km yaricap</option>
                  <option value={100}>100 km yaricap</option>
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
              </div>
              <p className="text-xs text-text-secondary">
                Secilen yaricap icindeki ilanlar gosterilir
              </p>
            </div>
          )}

          {/* ERROR state */}
          {locationError && !locationLoading && (
            <div className="rounded-lg border border-error/30 bg-error/5 px-3 py-2.5 space-y-1.5">
              <div className="flex items-start gap-1.5">
                <ExclamationTriangleIcon className="h-4 w-4 text-error flex-shrink-0 mt-0.5" />
                <p className="text-xs text-error leading-snug">{locationError}</p>
              </div>
              <button
                onClick={handleLocationToggle}
                className="text-xs font-medium text-primary hover:text-primary-dark underline underline-offset-2 transition-colors"
              >
                Yeniden Dene
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Filter Actions Bar */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <p className="text-sm text-text-secondary">
          {getActiveFilterCount() > 0
            ? `${getActiveFilterCount()} filtre aktif`
            : 'Filtre secilmedi'}
        </p>
        <div className="flex items-center gap-3">
          {getActiveFilterCount() > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-text-secondary hover:text-error transition-colors"
            >
              Temizle
            </button>
          )}
          <Button
            variant="primary"
            onClick={() => { updateURLParams(); performSearch(1, false); }}
          >
            Filtreleri Uygula
          </Button>
        </div>
      </div>

    </div>
  </section>
)}
```

---

## 8. Aktif Tag'lar Section — Tam JSX

Filter panel ile results section ARASINA eklenir:

```tsx
{/* Active Filter Tags — en az 1 aktif filtre varsa goster */}
{(searchQuery || selectedCategoryId || minBudget || maxBudget || urgency || locationActive) && (
  <section className="bg-surface/50 border-b border-border/50 py-2.5">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5
                      [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
                      sm:flex-wrap sm:overflow-x-visible">

        {/* Arama sorgusu tag */}
        {searchQuery && (
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
            <MagnifyingGlassIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="max-w-[120px] truncate">&ldquo;{searchQuery}&rdquo;</span>
            <button
              onClick={() => { setSearchQuery(''); performSearch(1, false); }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              aria-label="Arama sorgusunu temizle"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        )}

        {/* Kategori tag */}
        {selectedCategoryId && (
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
            <TagIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{categories.find(c => c.id === selectedCategoryId)?.nameTr || 'Kategori'}</span>
            <button
              onClick={() => setSelectedCategoryId(undefined)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              aria-label="Kategori filtresini kaldir"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        )}

        {/* Butce tag */}
        {(minBudget || maxBudget) && (
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-info/10 text-info border border-info/20">
            <CurrencyDollarIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {minBudget && maxBudget
                ? `${parseInt(minBudget).toLocaleString('tr-TR')} - ${parseInt(maxBudget).toLocaleString('tr-TR')} TRY`
                : minBudget
                ? `${parseInt(minBudget).toLocaleString('tr-TR')} TRY+`
                : `${parseInt(maxBudget!).toLocaleString('tr-TR')} TRY'ye kadar`}
            </span>
            <button
              onClick={() => { setMinBudget(''); setMaxBudget(''); }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-info transition-colors"
              aria-label="Butce filtresini kaldir"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        )}

        {/* Aciliyet tag */}
        {urgency && (
          <span className={`inline-flex flex-shrink-0 items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getUrgencyTagClasses(urgency)}`}>
            {urgency === 'Urgent' && <BoltIcon className="h-3.5 w-3.5 flex-shrink-0" />}
            {urgency === 'Normal' && <ClockIcon className="h-3.5 w-3.5 flex-shrink-0" />}
            {urgency === 'Flexible' && <CalendarDaysIcon className="h-3.5 w-3.5 flex-shrink-0" />}
            <span>{urgency === 'Urgent' ? 'Acil' : urgency === 'Normal' ? 'Normal' : 'Esnek'}</span>
            <button
              onClick={() => setUrgency('')}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current transition-colors"
              aria-label="Aciliyet filtresini kaldir"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        )}

        {/* Konum tag */}
        {locationActive && (
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-secondary-orange/10 text-secondary-orangeDark border border-secondary-orange/20">
            <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{locationRadius} km yaricap</span>
            <button
              onClick={() => { setLocationActive(false); setUserCoords(null); setLocationError(null); }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-secondary-orangeDark transition-colors"
              aria-label="Konum filtresini kaldir"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        )}

        {/* Tum filtreleri temizle */}
        <button
          onClick={clearFilters}
          className="flex-shrink-0 ml-1 text-sm text-text-secondary hover:text-error transition-colors hover:underline underline-offset-2 whitespace-nowrap"
        >
          Tüm filtreleri temizle
        </button>

      </div>
    </div>
  </section>
)}
```

---

## 9. Erisebilirlik (Accessibility)

### Focus Gostergesi
Tum interaktif elemanlar icin consistent focus ring:
```
focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1
```

### Klavye Navigasyonu
- Filter toggle butonu: `Tab` ile odaklanilir, `Enter`/`Space` ile toggle edilir
- Konum butonu: `Tab` → `Enter` ile Geolocation tetiklenir
- Sort select: `Tab` → ok tuslari ile secim
- Tag X butonlari: `Tab` sirasiyla gecer, `Enter` ile kaldirir

### ARIA Labels

```tsx
// Filtre sayac badge
<span aria-label={`${getActiveFilterCount()} aktif filtre`}>

// Konum butonu — state'e gore aria-label degisir
aria-label={locationActive ? 'Konumu kapat' : 'Konumumu kullanarak filtrele'}
aria-pressed={locationActive}

// Sort select
<label htmlFor="sort-select">Sirala</label>
<select id="sort-select" aria-label="Sonuclari sirala">

// Tag'lar
<span role="group" aria-label={`Aktif filtre: ${filterLabel}`}>

// Tags container
<div role="list" aria-label="Aktif filtreler">
// Her tag: role="listitem"
```

### Screen Reader Sonuc Sayisi
```tsx
<p aria-live="polite" aria-atomic="true" className="text-text-secondary">
  <span className="font-semibold text-text">{needs.length}</span>
  {hasMore ? '+' : ''} ilan bulundu
</p>
```

`aria-live="polite"` ile arama/filtre degistiginde ekran okuyucu sonuc sayisini okur.

---

## 10. Dosya Degisiklik Ozeti

### `src/web/src/pages/SearchPage.tsx`

Eklenecek:
1. `locationActive`, `locationLoading`, `locationError`, `locationRadius`, `userCoords` state'leri
2. `sortBy` state'i ve `SortOption` tipi
3. `handleLocationToggle` fonksiyonu
4. `getUrgencyTagClasses` yardimci fonksiyonu
5. `buildFilters` icinde konum parametreleri
6. Filter grid'i `lg:grid-cols-4` kalmasi — Konum 4. kolon olarak eklenmesi, Uygula butonu action bar'a tasinmasi
7. Aktif tag'lar section (filter panel ile results arasinda)
8. Results header bar (sonuc sayisi + sort dropdown)
9. HeroIcons import guncellenmesi (`TagIcon`, `CurrencyDollarIcon`, `MapPinIcon`, `BoltIcon`, `ClockIcon`, `CalendarDaysIcon`)

### `src/web/tailwind.config.js`

Degisiklik gerekmez. Mevcut renk tanimlari yeterli:
- `primary.DEFAULT`, `primary.light`, `primary.dark`
- `secondary.orange`, `secondary.orangeDark`
- `error`, `success`, `info`
- Tailwind opacity modifier'lari (`/10`, `/20`, `/30`) otomatik calisir

### `src/web/src/services/api.ts` — `NeedFilters` interface'i

Zaten hazir:
```typescript
export interface NeedFilters {
  // ...
  latitude?: number;   // var
  longitude?: number;  // var
  radius?: number;     // var
  // sortBy?: string;  // backend hazir olunca eklenecek
}
```

---

## 11. Gorsel Tutarlilik Kontrol Listesi

- [x] Filter section arka plan: `bg-surface` — mobile FilterModal `colors.surface` ile esdeger
- [x] Filter label: `text-sm font-medium text-text` — mobile `fontSize: 18, fontWeight: '700'` den adapt edildi (web'de 18px label cok buyuk)
- [x] Select/input focus ring: `focus:ring-primary/20 focus:border-primary` — design system primary rengi
- [x] Konum orange renk: `text-secondary-orangeDark`, `bg-secondary-orange/10` — mobile radius slider `colors.secondaryOrangeDark` ile tutarli
- [x] Urgent kirmizi: `bg-error/10 text-error` — mobile `colors.urgentDark` mantigi
- [x] Normal aciliyet mor: `bg-primary/10 text-primary` — mobile `colors.normal = '#7B2CBF'` ile esdeger
- [x] Flexible yesil: `bg-success/10 text-success` — mobile `colors.flexible = '#1e7e34'` ile esdeger
- [x] Filter count badge: `bg-secondary-orange text-white` — mobile `headerBadge` `backgroundColor: colors.secondaryOrangeDark` ile tutarli
- [x] Tag pill shape: `rounded-full px-3 py-1` — mobile chip `borderRadius: 22` ile tutarli
- [x] Card hover: mevcut `hover:shadow-lg hover:border-primary/30` — korunuyor
