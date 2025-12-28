import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-surface border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-primary">Arayanibul</span>
            </Link>
            <p className="text-text-secondary text-sm max-w-md">
              Arayanibul, alicilarin ne aradiklarini ilan ettigi ve saticilarin teklif verdigi
              bir ters ilan platformudur. Ne ariyorsaniz, onu bulan size gelsin!
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-text mb-4">Hizli Erisim</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-text-secondary hover:text-primary text-sm transition-colors"
                >
                  Ana Sayfa
                </Link>
              </li>
              <li>
                <Link
                  to="/needs"
                  className="text-text-secondary hover:text-primary text-sm transition-colors"
                >
                  Ilanlar
                </Link>
              </li>
              <li>
                <Link
                  to="/create-need"
                  className="text-text-secondary hover:text-primary text-sm transition-colors"
                >
                  Ilan Ver
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-text mb-4">Yasal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/terms"
                  className="text-text-secondary hover:text-primary text-sm transition-colors"
                >
                  Kullanim Kosullari
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-text-secondary hover:text-primary text-sm transition-colors"
                >
                  Gizlilik Politikasi
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-text-secondary hover:text-primary text-sm transition-colors"
                >
                  Iletisim
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border mt-8 pt-6 text-center">
          <p className="text-text-secondary text-sm">
            &copy; {currentYear} Arayanibul. Tum haklari saklidir.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
