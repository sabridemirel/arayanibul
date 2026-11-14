// NOTE: Taslak metindir; yayına almadan önce hukuki inceleme gerekir.
// Google Play'in istediği herkese açık hesap silme sayfasıdır (/account-deletion).
import React from 'react';
import { Link } from 'react-router-dom';
import { LegalLayout, LegalSection, LegalEmail } from '../components/legal';

const linkClass = 'text-primary hover:text-primary-dark underline';

const AccountDeletionPage: React.FC = () => (
  <LegalLayout
    title="Hesap Silme"
    path="/account-deletion"
    showEffectiveDate={false}
    intro={
      <p>
        Arayanibul hesabınızı ve hesabınıza bağlı kişisel verilerinizi dilediğiniz zaman
        silebilirsiniz. Bu sayfa, hesabınızı uygulama veya web sitesi üzerinden ya da e-posta ile
        nasıl sileceğinizi ve silme sonrasında verilerinize ne olacağını açıklar.
      </p>
    }
  >
    <LegalSection title="Uygulama veya Web Sitesi Üzerinden">
      <ol>
        <li>Arayanibul mobil uygulamasında veya web sitesinde hesabınıza giriş yapın.</li>
        <li>
          <strong>Profil</strong> sayfasını açın (web sitesinde sağ üstteki adınıza tıklayarak
          veya doğrudan <Link to="/profile" className={linkClass}>profil sayfasına</Link> giderek).
        </li>
        <li>Sayfanın en altındaki <strong>Hesabımı Sil</strong> bölümüne gidin.</li>
        <li>Açılan pencerede onay için <strong>SİL</strong> yazın ve işlemi onaylayın.</li>
      </ol>
      <p>Hesabınız hemen silinir ve oturumunuz kapatılır.</p>
    </LegalSection>

    <LegalSection title="E-posta ile Talep">
      <p>
        Hesabınıza giriş yapamıyorsanız, Arayanibul'a kayıtlı e-posta adresinizden{' '}
        <LegalEmail k="supportEmail" subject="Hesap Silme Talebi" /> adresine "Hesap Silme
        Talebi" konulu bir e-posta gönderin. Kimliğinizi doğrulamak için ek bilgi isteyebiliriz.
        Talebiniz en geç 30 gün içinde sonuçlandırılır ve size bilgi verilir.
      </p>
    </LegalSection>

    <LegalSection title="Silme Sonrasında Ne Olur?">
      <ul>
        <li>Adınız, e-posta adresiniz, telefon numaranız, adresiniz ve profil fotoğrafınız silinir.</li>
        <li>Aktif ilanlarınız kapatılır ve artık diğer kullanıcılara gösterilmez.</li>
        <li>Bekleyen teklifleriniz geri çekilir.</li>
        <li>
          Mesaj geçmişiniz karşı taraf için kalır; ancak adınız yerine "Silinmiş Kullanıcı"
          gösterilir.
        </li>
        <li>Google, Facebook veya Apple ile giriş bağlantınız ve bildirim anahtarlarınız silinir.</li>
        <li>İşlem geri alınamaz; aynı hesabı daha sonra geri yükleyemezsiniz.</li>
      </ul>
    </LegalSection>

    <LegalSection title="Saklanmaya Devam Eden Veriler">
      <p>
        Mevzuat gereği tutulması zorunlu bazı kayıtlar, hesabınız silindikten sonra da yasal süre
        boyunca saklanır ve süre sonunda imha edilir:
      </p>
      <ul>
        <li>Erişim (log) kayıtları: 5651 sayılı Kanun kapsamında mevzuatta öngörülen süre boyunca.</li>
      </ul>
      <p>
        Ayrıntılı bilgi için{' '}
        <Link to="/privacy" className={linkClass}>Gizlilik Politikası</Link> ve{' '}
        <Link to="/kvkk" className={linkClass}>KVKK Aydınlatma Metni</Link>'ne bakabilirsiniz.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default AccountDeletionPage;
