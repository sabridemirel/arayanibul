import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';

const Header: React.FC = () => {
  const { isAuthenticated, isGuest, user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/assets/mascot.png"
              alt="Arayanibul Maskot"
              className="h-10 w-10 object-contain"
            />
            <span className="text-xl font-bold text-primary">Arayanibul</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-text-secondary hover:text-primary transition-colors"
            >
              Ana Sayfa
            </Link>
            <Link
              to="/needs"
              className="text-text-secondary hover:text-primary transition-colors"
            >
              Ilanlar
            </Link>
            {isAuthenticated && !isGuest && (
              <Link
                to="/my-needs"
                className="text-text-secondary hover:text-primary transition-colors"
              >
                Ilanlarim
              </Link>
            )}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<PlusCircleIcon className="h-4 w-4" />}
                  onClick={() => navigate('/create-need')}
                >
                  Ilan Ver
                </Button>
                <div className="flex items-center gap-2">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors"
                  >
                    <UserCircleIcon className="h-6 w-6" />
                    <span className="text-sm">
                      {isGuest ? 'Misafir' : `${user?.firstName || 'Kullanici'}`}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-text-secondary hover:text-error transition-colors"
                    aria-label="Cikis Yap"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Giris Yap
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                  Kayit Ol
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-text-secondary hover:text-primary transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Menuyu Kapat' : 'Menuyu Ac'}
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-surface border-t border-border">
          <div className="px-4 py-4 space-y-3">
            <button
              onClick={() => handleNavigation('/')}
              className="block w-full text-left px-3 py-2 text-text-secondary hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
            >
              Ana Sayfa
            </button>
            <button
              onClick={() => handleNavigation('/needs')}
              className="block w-full text-left px-3 py-2 text-text-secondary hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
            >
              Ilanlar
            </button>

            {isAuthenticated ? (
              <>
                {!isGuest && (
                  <button
                    onClick={() => handleNavigation('/my-needs')}
                    className="block w-full text-left px-3 py-2 text-text-secondary hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Ilanlarim
                  </button>
                )}
                <button
                  onClick={() => handleNavigation('/create-need')}
                  className="block w-full text-left px-3 py-2 text-secondary-orange hover:bg-amber-50 rounded-lg transition-colors"
                >
                  Ilan Ver
                </button>
                <button
                  onClick={() => handleNavigation('/profile')}
                  className="block w-full text-left px-3 py-2 text-text-secondary hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Profil ({isGuest ? 'Misafir' : user?.firstName})
                </button>
                <hr className="border-border" />
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-error hover:bg-red-50 rounded-lg transition-colors"
                >
                  Cikis Yap
                </button>
              </>
            ) : (
              <>
                <hr className="border-border" />
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => handleNavigation('/login')}
                >
                  Giris Yap
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => handleNavigation('/register')}
                >
                  Kayit Ol
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
