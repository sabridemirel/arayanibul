import React from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../layout';
import { Card } from '../ui';
import { LEGAL, isLegalPlaceholder } from '../../config/legal';
import type { LegalKey } from '../../config/legal';

/** Renders a value from config/legal.ts; unfilled placeholders are highlighted. */
export const LegalValue: React.FC<{ k: LegalKey }> = ({ k }) => {
  const value = LEGAL[k];
  if (isLegalPlaceholder(value)) {
    return (
      <mark className="bg-yellow-100 text-yellow-900 font-semibold px-1 rounded">
        {value}
      </mark>
    );
  }
  return <>{value}</>;
};

/** E-mail address from config/legal.ts rendered as a mailto link. */
export const LegalEmail: React.FC<{ k: 'kvkkEmail' | 'supportEmail'; subject?: string }> = ({
  k,
  subject,
}) => {
  const value = LEGAL[k];
  if (isLegalPlaceholder(value)) {
    return <LegalValue k={k} />;
  }
  const href = `mailto:${value}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
  return (
    <a href={href} className="text-primary hover:text-primary-dark underline">
      {value}
    </a>
  );
};

interface LegalSectionProps {
  title: string;
  children: ReactNode;
  /** Use a smaller heading when the section is nested inside another document */
  nested?: boolean;
  id?: string;
}

export const LegalSection: React.FC<LegalSectionProps> = ({ title, children, nested, id }) => (
  <section id={id} className="mb-8 scroll-mt-24">
    {nested ? (
      <h3 className="text-lg font-semibold text-text mb-3">{title}</h3>
    ) : (
      <h2 className="text-xl font-bold text-text mb-3">{title}</h2>
    )}
    <div className="text-text-secondary leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1 [&_strong]:text-text">
      {children}
    </div>
  </section>
);

const RELATED_LINKS = [
  { to: '/terms', label: 'Kullanım Koşulları' },
  { to: '/privacy', label: 'Gizlilik Politikası' },
  { to: '/kvkk', label: 'KVKK Aydınlatma Metni' },
  { to: '/account-deletion', label: 'Hesap Silme' },
  { to: '/contact', label: 'İletişim' },
];

interface LegalLayoutProps {
  title: string;
  /** Current route; hidden from the related links list */
  path: string;
  intro?: ReactNode;
  showEffectiveDate?: boolean;
  children: ReactNode;
}

const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  path,
  intro,
  showEffectiveDate = true,
  children,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card padding="lg">
            <h1 className="text-2xl lg:text-3xl font-bold text-text mb-2">{title}</h1>
            {showEffectiveDate && (
              <p className="text-sm text-text-secondary mb-6">
                Son güncelleme: <LegalValue k="effectiveDate" />
              </p>
            )}
            {intro && <div className="text-text-secondary leading-relaxed mb-8 space-y-3">{intro}</div>}
            {children}
          </Card>

          <nav aria-label="Diğer yasal metinler" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center">
            {RELATED_LINKS.filter((link) => link.to !== path).map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-primary hover:text-primary-dark"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LegalLayout;
