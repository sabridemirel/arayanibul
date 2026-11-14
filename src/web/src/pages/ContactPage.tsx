// NOTE: Şirket bilgileri src/config/legal.ts dosyasından gelir; yayın öncesi doldurulmalıdır.
import React from 'react';
import { Link } from 'react-router-dom';
import { EnvelopeIcon, ShieldCheckIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { LegalLayout, LegalValue, LegalEmail } from '../components/legal';
import { LEGAL, isLegalPlaceholder } from '../config/legal';

const ContactPage: React.FC = () => {
  const supportEmailReady = !isLegalPlaceholder(LEGAL.supportEmail);

  return (
    <LegalLayout
      title="İletişim"
      path="/contact"
      showEffectiveDate={false}
      intro={
        <p>
          Soru, öneri veya şikâyetleriniz için bize e-posta ile ulaşabilirsiniz. Mesajlarınızı en
          kısa sürede yanıtlıyoruz.
        </p>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 rounded-lg bg-background border border-border">
          <EnvelopeIcon className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-text">Destek</h2>
            <p className="text-text-secondary text-sm mb-3">
              Hesabınız, ilanlarınız, teklifleriniz veya güvenli ödeme ile ilgili her konuda.
            </p>
            <p className="text-text mb-3">
              <LegalEmail k="supportEmail" subject="Arayanibul Destek" />
            </p>
            {supportEmailReady && (
              <a
                href={`mailto:${LEGAL.supportEmail}?subject=${encodeURIComponent('Arayanibul Destek')}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
              >
                <EnvelopeIcon className="h-5 w-5" />
                E-posta Gönder
              </a>
            )}
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-lg bg-background border border-border">
          <ShieldCheckIcon className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-text">Kişisel Veriler (KVKK)</h2>
            <p className="text-text-secondary text-sm mb-2">
              KVKK kapsamındaki başvurularınız için. Başvuru yöntemleri{' '}
              <Link to="/kvkk" className="text-primary hover:text-primary-dark underline">
                KVKK Aydınlatma Metni
              </Link>
              'nde yer alır.
            </p>
            <p className="text-text">
              <LegalEmail k="kvkkEmail" subject="KVKK Başvurusu" />
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-lg bg-background border border-border">
          <BuildingOfficeIcon className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary space-y-1">
            <h2 className="font-semibold text-text text-base mb-1">Hizmet Sağlayıcı</h2>
            <p><LegalValue k="companyName" /></p>
            <p>Adres: <LegalValue k="address" /></p>
          </div>
        </div>
      </div>
    </LegalLayout>
  );
};

export default ContactPage;
