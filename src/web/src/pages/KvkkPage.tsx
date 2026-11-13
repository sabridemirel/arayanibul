// NOTE: Taslak metindir; yayına almadan önce hukuki inceleme gerekir.
import React from 'react';
import { LegalLayout, KvkkContent } from '../components/legal';

const KvkkPage: React.FC = () => (
  <LegalLayout
    title="KVKK Aydınlatma Metni"
    path="/kvkk"
    intro={
      <p>
        Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 10. maddesi
        uyarınca, Arayanibul web sitesi ve mobil uygulamasını kullanan kişilerin kişisel
        verilerinin işlenmesine ilişkin olarak hazırlanmıştır.
      </p>
    }
  >
    <KvkkContent />
  </LegalLayout>
);

export default KvkkPage;
