/**
 * Yasal metinlerde (Kullanım Koşulları, Gizlilik Politikası, KVKK Aydınlatma Metni,
 * Hesap Silme, İletişim) kullanılan şirket bilgileri.
 *
 * Köşeli parantezli değerler ([...]) henüz doldurulmamış yer tutuculardır ve arayüzde
 * sarı arka planla vurgulanır. Yayına almadan önce hepsini gerçek bilgilerle doldurun;
 * metinlerin tamamı bir hukukçu tarafından gözden geçirilmelidir.
 */
export const LEGAL = {
  /** Veri sorumlusu / hizmet sağlayıcı (gerçek kişi) */
  companyName: 'Sabri Demirel',
  /** Tebligata elverişli açık adres */
  address: 'Yenişehir Mah. Osmanlı Bulvarı No:4A D.53 Pendik/İstanbul',
  /** KVKK başvurularının iletileceği e-posta adresi */
  kvkkEmail: 'destek@arayanibul.com',
  /** Genel destek / iletişim e-posta adresi */
  supportEmail: 'destek@arayanibul.com',
  /** Metinlerin yürürlük / son güncelleme tarihi (ör. 1 Aralık 2026) */
  effectiveDate: '14 Kasım 2026',
  /** Sunucu / veritabanı barındırma hizmet sağlayıcısı */
  hostingProvider: 'Hetzner Online GmbH',
  /** Sunucuların bulunduğu ülke */
  hostingCountry: 'Almanya',
  /** İşlemsel e-posta (şifre sıfırlama vb.) gönderim sağlayıcısı */
  emailProvider: 'Brevo (Sendinblue SAS)',
  /** Uyuşmazlıklarda yetkili mahkeme ve icra daireleri */
  jurisdiction: 'İstanbul Anadolu Mahkemeleri ve İcra Daireleri',
} as const;

export type LegalKey = keyof typeof LEGAL;

/** Değer henüz doldurulmamış bir yer tutucu mu? */
export const isLegalPlaceholder = (value: string): boolean =>
  value.startsWith('[') && value.endsWith(']');
