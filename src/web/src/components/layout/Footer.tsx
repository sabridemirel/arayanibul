import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-[#5A189A] to-[#3c0764] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img
                src="/assets/mascot.png"
                alt="Arayanibul Maskot"
                className="h-16 w-16 object-contain"
              />
              <span className="text-2xl font-extrabold">
                <span className="text-white">Arayanı</span>
                <span className="text-[#F59E0B]">BUL</span>
              </span>
            </Link>
            <p className="text-white/60 text-sm max-w-md leading-relaxed">
              Arayanibul, alicilarin ne aradiklarini ilan ettigi ve saticilarin teklif verdigi
              bir ters ilan platformudur. Ne ariyorsaniz, onu bulan size gelsin!
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-white mb-4">Hizli Erisim</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-white/60 hover:text-[#F59E0B] text-sm transition-colors"
                >
                  Ana Sayfa
                </Link>
              </li>
              <li>
                <Link
                  to="/needs"
                  className="text-white/60 hover:text-[#F59E0B] text-sm transition-colors"
                >
                  Ilanlar
                </Link>
              </li>
              <li>
                <Link
                  to="/create-need"
                  className="text-white/60 hover:text-[#F59E0B] text-sm transition-colors"
                >
                  Ilan Ver
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-bold text-white mb-4">Yasal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/terms"
                  className="text-white/60 hover:text-[#F59E0B] text-sm transition-colors"
                >
                  Kullanim Kosullari
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-white/60 hover:text-[#F59E0B] text-sm transition-colors"
                >
                  Gizlilik Politikasi
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-white/60 hover:text-[#F59E0B] text-sm transition-colors"
                >
                  Iletisim
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 mt-8 pt-6 text-center">
          <p className="text-white/60 text-sm">
            &copy; {currentYear} Arayanibul. Tum haklari saklidir.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
