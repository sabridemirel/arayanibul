// NOTE: Taslak metindir; yayına almadan önce hukuki inceleme gerekir.
// Şirket bilgileri src/config/legal.ts dosyasından gelir.
import React from 'react';
import { Link } from 'react-router-dom';
import { LegalLayout, LegalSection, LegalValue, LegalEmail } from '../components/legal';

const linkClass = 'text-primary hover:text-primary-dark underline';

const TermsPage: React.FC = () => (
  <LegalLayout
    title="Kullanım Koşulları"
    path="/terms"
    intro={
      <p>
        Bu Kullanım Koşulları, <strong><LegalValue k="companyName" /></strong> ("Arayanibul")
        tarafından işletilen web sitesi ve mobil uygulamanın kullanımına ilişkin kuralları
        belirler. Platforma üye olarak veya platformu kullanarak bu koşulları kabul etmiş
        olursunuz.
      </p>
    }
  >
    <LegalSection title="1. Hizmetin Tanımı">
      <p>
        Arayanibul bir ters ilan platformudur: alıcılar ("arayan") ihtiyaç duydukları ürün veya
        hizmeti ilan eder, satıcılar bu ilanlara teklif verir. Arayan kullanıcı tekliflerden
        birini kabul edebilir ve satıcıyla mesajlaşabilir.
      </p>
      <p>
        Arayanibul, kullanıcılar arasındaki alışverişin tarafı değildir; yalnızca tarafları bir
        araya getiren aracı hizmet sağlayıcıdır. İlan ve tekliflerde sunulan ürün ve hizmetlerin
        niteliği, yasallığı ve ifası ilgili kullanıcıların sorumluluğundadır.
      </p>
    </LegalSection>

    <LegalSection title="2. Üyelik">
      <ul>
        <li>Platformu kullanmak için en az 18 yaşında olmanız gerekir.</li>
        <li>Kayıt sırasında verdiğiniz bilgilerin doğru ve güncel olması sizin sorumluluğunuzdadır.</li>
        <li>
          Hesabınızın ve şifrenizin güvenliğinden siz sorumlusunuz. Hesabınızda yetkisiz bir
          kullanım fark ederseniz bize hemen bildirin.
        </li>
        <li>
          Misafir olarak giriş yapan kullanıcılar ilanlara göz atabilir; mesajlaşma gibi bazı
          özellikler yalnızca üyelere açıktır. Misafir hesaplar bir süre kullanılmadığında
          otomatik olarak silinir.
        </li>
      </ul>
    </LegalSection>

    <LegalSection title="3. İlan ve Teklif Kuralları">
      <p>Platformda aşağıdaki içeriklerin paylaşılması yasaktır:</p>
      <ul>
        <li>Yasa dışı ürün veya hizmetler, ruhsatsız silah, uyuşturucu ve benzeri maddeler,</li>
        <li>Sahte, yanıltıcı veya başkasına ait bilgi ve görseller,</li>
        <li>Hakaret, tehdit, nefret söylemi, müstehcenlik içeren içerikler,</li>
        <li>Fikri mülkiyet haklarını ihlal eden içerikler,</li>
        <li>Spam, reklam amaçlı toplu mesajlar ve platform dışına yönlendirme amaçlı dolandırıcılık girişimleri.</li>
      </ul>
      <p>
        Arayanibul, bu kurallara aykırı içerikleri önceden bildirimde bulunmaksızın kaldırma ve
        ilgili hesabı askıya alma veya kapatma hakkını saklı tutar.
      </p>
    </LegalSection>

    <LegalSection title="4. Ödemeler">
      <p>
        Arayanibul şu anda platform üzerinden ödeme almamaktadır. Ürün veya hizmetin bedeli,
        alıcı ile satıcı arasında doğrudan ödenir; Arayanibul bu ödemelerin tarafı değildir ve
        bunlardan doğan uyuşmazlıklardan sorumlu tutulamaz. Platform üzerinden ödeme hizmeti
        sunulmaya başlanırsa bu koşullar güncellenir ve kullanıcılara bildirilir.
      </p>
    </LegalSection>

    <LegalSection title="5. Mesajlaşma">
      <p>
        Mesajlaşma, yalnızca bir teklifin tarafları arasında ve ilgili teklif kapsamında
        kullanılabilir. Mesajlar güvenlik ve kötüye kullanımın önlenmesi amacıyla saklanır;
        şikâyet hâlinde incelenebilir.
      </p>
    </LegalSection>

    <LegalSection title="6. Değerlendirmeler">
      <p>
        Tamamlanan işlemlerden sonra taraflar birbirini değerlendirebilir. Değerlendirmeler
        gerçek deneyime dayanmalıdır; sahte veya karşılık beklenerek yapılan değerlendirmeler
        kaldırılabilir.
      </p>
    </LegalSection>

    <LegalSection title="7. Fikri Mülkiyet">
      <p>
        Platformun tasarımı, yazılımı, logosu ve markası Arayanibul'a aittir. Paylaştığınız
        içeriklerin sahipliği sizde kalır; ancak bu içeriklerin hizmetin sunulması amacıyla
        platformda gösterilmesi, çoğaltılması ve işlenmesi için Arayanibul'a ücretsiz ve münhasır
        olmayan bir kullanım izni vermiş olursunuz. Bu izin, içeriği veya hesabınızı sildiğinizde
        sona erer.
      </p>
    </LegalSection>

    <LegalSection title="8. Sorumluluğun Sınırlandırılması">
      <p>
        Arayanibul, kullanıcılar arasında yapılan anlaşmaların ifasını, ilan ve tekliflerdeki
        bilgilerin doğruluğunu veya kullanıcıların kimliğini garanti etmez. Hizmetin kesintisiz
        ve hatasız olacağı taahhüt edilmez. Yürürlükteki mevzuatın izin verdiği ölçüde,
        Arayanibul dolaylı zararlardan sorumlu tutulamaz.
      </p>
    </LegalSection>

    <LegalSection title="9. Hesabın Kapatılması">
      <p>
        Hesabınızı dilediğiniz zaman silebilirsiniz; ayrıntılar için{' '}
        <Link to="/account-deletion" className={linkClass}>Hesap Silme</Link> sayfasına bakın.
        Bu koşulları ihlal etmeniz hâlinde Arayanibul hesabınızı askıya alabilir veya
        kapatabilir.
      </p>
    </LegalSection>

    <LegalSection title="10. Kişisel Veriler">
      <p>
        Kişisel verilerinizin işlenmesine ilişkin ayrıntılar{' '}
        <Link to="/privacy" className={linkClass}>Gizlilik Politikası</Link> ve{' '}
        <Link to="/kvkk" className={linkClass}>KVKK Aydınlatma Metni</Link>'nde yer alır.
      </p>
    </LegalSection>

    <LegalSection title="11. Değişiklikler">
      <p>
        Arayanibul bu koşulları güncelleyebilir. Önemli değişiklikler yürürlüğe girmeden önce
        platform veya e-posta yoluyla duyurulur. Değişikliklerden sonra platformu kullanmaya
        devam etmeniz, güncel koşulları kabul ettiğiniz anlamına gelir.
      </p>
    </LegalSection>

    <LegalSection title="12. Uygulanacak Hukuk ve Yetki">
      <p>
        Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda{' '}
        <LegalValue k="jurisdiction" /> yetkilidir. Tüketici sıfatıyla hareket eden kullanıcıların
        Tüketici Hakem Heyetleri ve Tüketici Mahkemelerine başvuru hakları saklıdır.
      </p>
    </LegalSection>

    <LegalSection title="13. İletişim">
      <ul>
        <li>Hizmet sağlayıcı: <LegalValue k="companyName" /></li>
        <li>Adres: <LegalValue k="address" /></li>
        <li>E-posta: <LegalEmail k="supportEmail" /></li>
      </ul>
    </LegalSection>
  </LegalLayout>
);

export default TermsPage;
