// NOTE: Taslak metindir; yayına almadan önce hukuki inceleme gerekir.
// Şirket bilgileri src/config/legal.ts dosyasından gelir.
import React from 'react';
import { Link } from 'react-router-dom';
import { LegalSection, LegalValue, LegalEmail } from './LegalLayout';

interface KvkkContentProps {
  /** Render headings one level lower (used inside the Privacy Policy page) */
  nested?: boolean;
}

/** 6698 sayılı KVKK md.10 kapsamında aydınlatma metni. /kvkk ve /privacy sayfalarında kullanılır. */
const KvkkContent: React.FC<KvkkContentProps> = ({ nested = false }) => (
  <>
    <LegalSection nested={nested} title="1. Veri Sorumlusu">
      <p>
        6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca kişisel verileriniz,
        veri sorumlusu sıfatıyla <strong><LegalValue k="companyName" /></strong> ("Arayanibul")
        tarafından aşağıda açıklanan kapsamda işlenmektedir.
      </p>
      <ul>
        <li>Adres: <LegalValue k="address" /></li>
        <li>MERSİS No: <LegalValue k="mersisNo" /></li>
        <li>KEP adresi: <LegalValue k="kepAddress" /></li>
        <li>KVKK başvuru e-postası: <LegalEmail k="kvkkEmail" subject="KVKK Başvurusu" /></li>
      </ul>
    </LegalSection>

    <LegalSection nested={nested} title="2. İşlenen Kişisel Veriler">
      <ul>
        <li>
          <strong>Kimlik ve iletişim bilgileri:</strong> ad, soyad, e-posta adresi; isteğe bağlı
          olarak telefon numarası ve adres.
        </li>
        <li>
          <strong>Profil bilgileri:</strong> profil fotoğrafı, değerlendirme ve puanlar, doğrulama
          rozetleri.
        </li>
        <li>
          <strong>Konum bilgisi:</strong> ilan verirken veya yakınınızdaki ilanları ararken
          paylaşmayı seçtiğiniz şehir, ilçe ya da yaklaşık konum.
        </li>
        <li>
          <strong>Platform içerikleri:</strong> verdiğiniz ilanlar, teklifler, ilan ve tekliflere
          eklediğiniz görseller, diğer kullanıcılarla mesajlaşma içerikleri ve değerlendirmeler.
        </li>
        <li>
          <strong>Hesap ve güvenlik bilgileri:</strong> şifrenizin geri döndürülemez şekilde
          şifrelenmiş hali, oturum anahtarları, Google, Facebook veya Apple ile giriş yaptığınızda
          bu sağlayıcıların ilettiği kullanıcı kimliği.
        </li>
        <li>
          <strong>Cihaz ve kullanım bilgileri:</strong> IP adresi, cihaz ve tarayıcı türü, erişim
          kayıtları ve hata kayıtları.
        </li>
      </ul>
    </LegalSection>

    <LegalSection nested={nested} title="3. İşleme Amaçları">
      <ul>
        <li>Üyelik hesabınızın oluşturulması, kimliğinizin doğrulanması ve hesabınızın yönetimi,</li>
        <li>İlan verme, teklif verme, mesajlaşma ve değerlendirme hizmetlerinin sunulması,</li>
        <li>Yeni teklif, mesaj ve ilan durumu gibi konularda bildirim gönderilmesi,</li>
        <li>Şifre sıfırlama gibi hesap güvenliği işlemlerinin yürütülmesi,</li>
        <li>Dolandırıcılık, kötüye kullanım ve kural ihlallerinin önlenmesi, platform güvenliğinin sağlanması,</li>
        <li>Talep ve şikâyetlerinizin yanıtlanması,</li>
        <li>Mevzuattan doğan yükümlülüklerin yerine getirilmesi ve yetkili kurumların taleplerinin karşılanması,</li>
        <li>Hizmetlerin iyileştirilmesi amacıyla anonim kullanım istatistiklerinin oluşturulması.</li>
      </ul>
    </LegalSection>

    <LegalSection nested={nested} title="4. Hukuki Sebepler">
      <p>Kişisel verileriniz KVKK md.5/2 kapsamında aşağıdaki hukuki sebeplere dayanılarak işlenir:</p>
      <ul>
        <li>
          <strong>Sözleşmenin kurulması ve ifası (md.5/2-c):</strong> üyelik, ilan, teklif,
          mesajlaşma ve değerlendirme hizmetlerinin sunulması.
        </li>
        <li>
          <strong>Hukuki yükümlülüğün yerine getirilmesi (md.5/2-ç):</strong> 5651 sayılı Kanun
          kapsamındaki erişim kayıtları, vergi ve ticaret mevzuatı kapsamındaki kayıtlar.
        </li>
        <li>
          <strong>Bir hakkın tesisi, kullanılması veya korunması (md.5/2-e):</strong> olası
          uyuşmazlıklarda delil olarak kullanılacak kayıtlar.
        </li>
        <li>
          <strong>Meşru menfaat (md.5/2-f):</strong> platform güvenliği, kötüye kullanımın
          önlenmesi ve hizmetin geliştirilmesi.
        </li>
        <li>
          <strong>Açık rıza (md.5/1):</strong> yukarıdaki sebeplerin bulunmadığı hâllerde, örneğin
          ticari elektronik ileti gönderimi veya isteğe bağlı konum paylaşımı için. Açık rızanızı
          dilediğiniz zaman geri alabilirsiniz.
        </li>
      </ul>
    </LegalSection>

    <LegalSection nested={nested} title="5. Kişisel Verilerin Aktarılması">
      <p>Kişisel verileriniz, yukarıdaki amaçlarla sınırlı olarak aşağıdaki alıcılara aktarılabilir:</p>
      <ul>
        <li>
          <strong>Diğer kullanıcılar:</strong> ilanlarınız, teklifleriniz, adınız, profil
          fotoğrafınız ve değerlendirmeleriniz platformu kullanan diğer kişilere; mesajlarınız
          yalnızca ilgili teklifin karşı tarafına gösterilir.
        </li>
        <li>
          <strong>Hizmet sağlayıcılar:</strong> barındırma hizmeti (<LegalValue k="hostingProvider" />),
          e-posta gönderim hizmeti (<LegalValue k="emailProvider" />) ve sosyal giriş
          sağlayıcıları (Google, Facebook, Apple).
        </li>
        <li>
          <strong>Yetkili kamu kurum ve kuruluşları:</strong> mevzuatın gerektirdiği hâllerde ve
          talep edilmesi durumunda.
        </li>
      </ul>
    </LegalSection>

    <LegalSection nested={nested} title="6. Yurt Dışına Aktarım">
      <p>
        Barındırma, e-posta gönderimi ve sosyal giriş hizmetlerini sağlayan
        şirketlerin bir kısmının sunucuları yurt dışında (<LegalValue k="hostingCountry" /> ve
        diğer ülkeler) bulunmaktadır. Bu aktarımlar KVKK md.9 uyarınca; yeterlilik kararı
        bulunması hâlinde bu karara dayanılarak, bulunmaması hâlinde ise Kişisel Verileri Koruma
        Kurulu tarafından ilan edilen standart sözleşmelerin imzalanması ve Kurul'a bildirilmesi
        gibi uygun güvencelerden biri sağlanarak gerçekleştirilir.
      </p>
    </LegalSection>

    <LegalSection nested={nested} title="7. Toplama Yöntemi">
      <p>
        Kişisel verileriniz; web sitesi ve mobil uygulama üzerindeki formlar, Google, Facebook veya
        Apple ile giriş, mesajlaşma ekranları ve çerezler ile benzeri teknolojiler
        aracılığıyla elektronik ortamda, otomatik veya kısmen otomatik yollarla toplanır.
      </p>
    </LegalSection>

    <LegalSection nested={nested} title="8. Saklama Süresi">
      <p>
        Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca ve hesabınız açık kaldığı
        sürece saklanır. Hesabınızı sildiğinizde verileriniz silinir veya anonim hâle getirilir.
        Ancak mevzuat gereği tutulması zorunlu kayıtlar (örneğin 5651 sayılı Kanun kapsamındaki erişim kayıtları için mevzuatta öngörülen
        süre) bu süreler boyunca saklanır ve süre sonunda imha edilir. Misafir hesaplar belirli
        bir süre kullanılmadığında otomatik olarak silinir.
      </p>
    </LegalSection>

    <LegalSection nested={nested} title="9. KVKK md.11 Kapsamındaki Haklarınız">
      <p>KVKK md.11 uyarınca veri sorumlusuna başvurarak:</p>
      <ul>
        <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
        <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
        <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
        <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
        <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
        <li>KVKK md.7'de öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme,</li>
        <li>Düzeltme, silme ve yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
        <li>Münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhinize bir sonuç çıkmasına itiraz etme,</li>
        <li>Kanuna aykırı işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
      </ul>
      <p>haklarına sahipsiniz.</p>
    </LegalSection>

    <LegalSection nested={nested} title="10. Başvuru Yöntemi">
      <p>
        Haklarınıza ilişkin taleplerinizi, Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında
        Tebliğ'e uygun olarak; kimliğinizi tespit etmeye yarayan bilgilerle birlikte:
      </p>
      <ul>
        <li>
          Arayanibul'a kayıtlı e-posta adresinizden <LegalEmail k="kvkkEmail" subject="KVKK Başvurusu" />{' '}
          adresine e-posta göndererek,
        </li>
        <li>
          <LegalValue k="kepAddress" /> adresine güvenli elektronik imzalı olarak KEP ile,
        </li>
        <li>
          Islak imzalı dilekçe ile <LegalValue k="address" /> adresine şahsen veya noter aracılığıyla
        </li>
      </ul>
      <p>
        iletebilirsiniz. Başvurunuz en geç 30 gün içinde ücretsiz olarak sonuçlandırılır; işlemin
        ayrıca bir maliyet gerektirmesi hâlinde Kurul tarafından belirlenen tarife uygulanabilir.
        Hesabınızı silmek için <Link to="/account-deletion" className="text-primary hover:text-primary-dark underline">Hesap Silme</Link>{' '}
        sayfasındaki adımları izleyebilirsiniz.
      </p>
    </LegalSection>
  </>
);

export default KvkkContent;
