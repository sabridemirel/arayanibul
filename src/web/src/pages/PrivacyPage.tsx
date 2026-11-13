// NOTE: Taslak metindir; yayına almadan önce hukuki inceleme gerekir.
// Şirket bilgileri src/config/legal.ts dosyasından gelir.
import React from 'react';
import { Link } from 'react-router-dom';
import { LegalLayout, LegalSection, LegalValue, LegalEmail, KvkkContent } from '../components/legal';

const linkClass = 'text-primary hover:text-primary-dark underline';

const PrivacyPage: React.FC = () => (
  <LegalLayout
    title="Gizlilik Politikası"
    path="/privacy"
    intro={
      <p>
        Arayanibul, ihtiyacınızı ilan ettiğiniz ve satıcıların size teklif verdiği bir ters ilan
        platformudur. Bu politika, web sitemizi ve mobil uygulamamızı kullanırken hangi bilgilerin
        toplandığını, nasıl kullanıldığını ve haklarınızı açıklar. Platform{' '}
        <strong><LegalValue k="companyName" /></strong> tarafından işletilmektedir.
      </p>
    }
  >
    <LegalSection title="1. Hangi Bilgileri Topluyoruz?">
      <ul>
        <li>
          <strong>Hesap bilgileri:</strong> ad, soyad, e-posta adresi ve şifre (şifreniz geri
          döndürülemez şekilde şifrelenerek saklanır). Google, Facebook veya Apple ile giriş
          yaparsanız bu sağlayıcıların ilettiği ad, e-posta ve kullanıcı kimliği.
        </li>
        <li>
          <strong>İsteğe bağlı bilgiler:</strong> telefon numarası, adres, profil fotoğrafı ve
          konum bilgisi.
        </li>
        <li>
          <strong>Paylaştığınız içerikler:</strong> ilanlar, teklifler, görseller, mesajlar ve
          değerlendirmeler.
        </li>
        <li>
          <strong>Ödeme bilgileri:</strong> güvenli ödeme işlemlerinin tutarı ve durumu. Kart
          bilgileriniz bizim sunucularımızda saklanmaz; lisanslı ödeme kuruluşu tarafından işlenir.
        </li>
        <li>
          <strong>Teknik bilgiler:</strong> IP adresi, cihaz ve tarayıcı bilgisi, anlık bildirim
          anahtarı, erişim ve hata kayıtları.
        </li>
      </ul>
    </LegalSection>

    <LegalSection title="2. Bilgilerinizi Nasıl Kullanıyoruz?">
      <ul>
        <li>Hesabınızı oluşturmak ve güvenle giriş yapmanızı sağlamak,</li>
        <li>İlanlarınızı yayınlamak, teklifleri size ve satıcılara iletmek,</li>
        <li>Alıcı ile satıcı arasında mesajlaşmayı sağlamak,</li>
        <li>Güvenli ödeme sürecini yürütmek ve ödemenizi işlem tamamlanana kadar emanette tutmak,</li>
        <li>Yeni teklif ve mesajlar için bildirim göndermek,</li>
        <li>Dolandırıcılığı ve kötüye kullanımı önlemek,</li>
        <li>Yasal yükümlülüklerimizi yerine getirmek.</li>
      </ul>
      <p>Kişisel verilerinizi satmayız ve reklam amacıyla üçüncü kişilerle paylaşmayız.</p>
    </LegalSection>

    <LegalSection title="3. Diğer Kullanıcıların Görebildikleri">
      <p>
        İlanlarınız, teklifleriniz, adınız, profil fotoğrafınız ve aldığınız değerlendirmeler
        platformu kullanan herkes tarafından görülebilir. Telefon numaranız ve adresiniz diğer
        kullanıcılarla otomatik olarak paylaşılmaz. Mesajlarınız yalnızca ilgili teklifin karşı
        tarafı tarafından görülebilir. İlan ve mesajlarınızda kişisel bilgilerinizi paylaşırken
        dikkatli olmanızı öneririz.
      </p>
    </LegalSection>

    <LegalSection title="4. Çerezler ve Yerel Depolama">
      <p>
        Web sitemiz, oturumunuzu açık tutmak için tarayıcınızın yerel depolama alanına
        (localStorage) oturum anahtarınızı ve temel profil bilgilerinizi kaydeder. Bu kayıtlar
        hizmetin çalışması için zorunludur ve çıkış yaptığınızda silinir. Reklam veya izleme
        amaçlı üçüncü taraf çerez kullanmıyoruz. İleride analiz amaçlı çerez kullanılması
        hâlinde, bu politika güncellenecek ve gerektiğinde onayınız alınacaktır.
      </p>
    </LegalSection>

    <LegalSection title="5. Saklama ve Silme">
      <p>
        Bilgilerinizi hesabınız açık olduğu sürece saklarız. Hesabınızı dilediğiniz zaman
        silebilirsiniz; ayrıntılar için{' '}
        <Link to="/account-deletion" className={linkClass}>Hesap Silme</Link> sayfasına bakın.
        Hesap silindiğinde verileriniz silinir veya anonim hâle getirilir; yalnızca mevzuat
        gereği saklanması zorunlu kayıtlar (ödeme kayıtları, erişim kayıtları gibi) yasal süre
        boyunca tutulur.
      </p>
    </LegalSection>

    <LegalSection title="6. Güvenlik">
      <p>
        Verileriniz şifreli bağlantı (HTTPS) üzerinden iletilir, şifreler geri döndürülemez
        şekilde saklanır ve sunuculara erişim yetkili personelle sınırlandırılır. Hiçbir sistem
        tamamen risksiz değildir; hesabınızda şüpheli bir durum fark ederseniz bize hemen
        bildirin.
      </p>
    </LegalSection>

    <LegalSection title="7. Çocukların Gizliliği">
      <p>
        Arayanibul 18 yaşından küçüklere yönelik değildir ve bilerek 18 yaşından küçüklerden
        kişisel veri toplamayız. 18 yaşından küçük bir kişinin hesap açtığını fark ederseniz
        bize bildirin; hesabı ve ilgili verileri sileriz.
      </p>
    </LegalSection>

    <LegalSection title="8. Değişiklikler">
      <p>
        Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişiklikleri web sitesi, uygulama
        veya e-posta yoluyla duyururuz. Güncel metin her zaman bu sayfada yer alır.
      </p>
    </LegalSection>

    <LegalSection title="9. İletişim">
      <p>
        Gizlilikle ilgili sorularınız için <LegalEmail k="supportEmail" subject="Gizlilik" />{' '}
        adresine, KVKK kapsamındaki başvurularınız için{' '}
        <LegalEmail k="kvkkEmail" subject="KVKK Başvurusu" /> adresine yazabilirsiniz.
      </p>
    </LegalSection>

    <div id="kvkk" className="border-t border-border pt-8 mt-8 scroll-mt-24">
      <h2 className="text-2xl font-bold text-text mb-6">KVKK Aydınlatma Metni</h2>
      <KvkkContent nested />
    </div>
  </LegalLayout>
);

export default PrivacyPage;
