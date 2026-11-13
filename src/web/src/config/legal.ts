/**
 * Yasal metinlerde (Kullanım Koşulları, Gizlilik Politikası, KVKK Aydınlatma Metni,
 * Hesap Silme, İletişim) kullanılan şirket bilgileri.
 *
 * Köşeli parantezli değerler ([...]) henüz doldurulmamış yer tutuculardır ve arayüzde
 * sarı arka planla vurgulanır. Yayına almadan önce hepsini gerçek bilgilerle doldurun;
 * metinlerin tamamı bir hukukçu tarafından gözden geçirilmelidir.
 */
export const LEGAL = {
  /** Veri sorumlusu / hizmet sağlayıcı şirketin tam ticari unvanı */
  companyName: '[ŞİRKET UNVANI]',
  /** Şirketin tebligata elverişli açık adresi */
  address: '[ADRES]',
  /** MERSİS numarası */
  mersisNo: '[MERSİS NO]',
  /** Vergi dairesi ve vergi numarası */
  taxInfo: '[VERGİ DAİRESİ / VERGİ NO]',
  /** Kayıtlı elektronik posta (KEP) adresi */
  kepAddress: '[KEP ADRESİ]',
  /** KVKK başvurularının iletileceği e-posta adresi */
  kvkkEmail: '[KVKK BAŞVURU E-POSTASI]',
  /** Genel destek / iletişim e-posta adresi */
  supportEmail: '[DESTEK E-POSTASI]',
  /** Müşteri hizmetleri telefonu (yoksa iletişim sayfasından kaldırılabilir) */
  phone: '[TELEFON]',
  /** Metinlerin yürürlük / son güncelleme tarihi (ör. 1 Aralık 2026) */
  effectiveDate: '[YÜRÜRLÜK TARİHİ]',
  /** Sunucu / veritabanı barındırma hizmet sağlayıcısı */
  hostingProvider: '[BARINDIRMA HİZMET SAĞLAYICISI]',
  /** Sunucuların bulunduğu ülke */
  hostingCountry: '[SUNUCU ÜLKESİ]',
  /** İşlemsel e-posta (şifre sıfırlama vb.) gönderim sağlayıcısı */
  emailProvider: '[E-POSTA HİZMET SAĞLAYICISI]',
  /** Güvenli ödeme altyapısını sağlayan lisanslı ödeme kuruluşu */
  paymentProvider: '[ÖDEME HİZMET SAĞLAYICISI]',
  /** Uyuşmazlıklarda yetkili mahkeme ve icra daireleri */
  jurisdiction: '[YETKİLİ MAHKEME VE İCRA DAİRELERİ]',
} as const;

export type LegalKey = keyof typeof LEGAL;

/** Değer henüz doldurulmamış bir yer tutucu mu? */
export const isLegalPlaceholder = (value: string): boolean =>
  value.startsWith('[') && value.endsWith(']');
