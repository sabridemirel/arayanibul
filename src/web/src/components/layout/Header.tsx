import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  PlusCircleIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../hooks/useChat';
import Button from '../ui/Button';

const Header: React.FC = () => {
  const { isAuthenticated, isGuest, user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useChat();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const canMessage = isAuthenticated && !isGuest;
  const unreadLabel = unreadCount > 9 ? '9+' : String(unreadCount);
  const unreadBadge = unreadCount > 0 && (
    <span
      className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#F59E0B] text-[#3c0764] text-xs font-bold"
      aria-label={`${unreadCount} okunmamış mesaj`}
    >
      {unreadLabel}
    </span>
  );

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
    <header className="bg-[#5A189A] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/assets/mascot.png"
              alt="Arayanibul Maskot"
              className="h-9 w-9 object-contain"
            />
            <span className="text-xl font-extrabold">
              <span className="text-white">Arayanı</span>
              <span className="text-[#F59E0B]">BUL</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-white/70 hover:text-white transition-colors font-medium"
            >
              Ana Sayfa
            </Link>
            <Link
              to="/needs"
              className="text-white/70 hover:text-white transition-colors font-medium"
            >
              İlanlar
            </Link>
            {isAuthenticated && !isGuest && (
              <Link
                to="/my-needs"
                className="text-white/70 hover:text-white transition-colors font-medium"
              >
                İlanlarım
              </Link>
            )}
            {canMessage && (
              <Link
                to="/messages"
                className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition-colors font-medium"
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                Mesajlar
                {unreadBadge}
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
                  İlan Ver
                </Button>
                <div className="flex items-center gap-2">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                  >
                    <UserCircleIcon className="h-6 w-6" />
                    <span className="text-sm font-medium">
                      {isGuest ? 'Misafir' : `${user?.firstName || 'Kullanıcı'}`}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-white/70 hover:text-red-300 transition-colors"
                    aria-label="Çıkış Yap"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="!text-white/80 hover:!text-white hover:!bg-white/10"
                >
                  Giriş Yap
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/register')}
                  className="!bg-[#F59E0B] !text-[#3c0764] hover:!bg-[#D97706] !border-0 font-bold"
                >
                  Kayıt Ol
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden relative p-2 text-white/80 hover:text-white transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Menüyü Kapat' : 'Menüyü Aç'}
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
            {canMessage && unreadCount > 0 && !isMobileMenuOpen && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-[#F59E0B] ring-2 ring-[#5A189A]" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#5A189A] border-t border-white/10">
          <div className="px-4 py-4 space-y-3">
            <button
              onClick={() => handleNavigation('/')}
              className="block w-full text-left px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-medium"
            >
              Ana Sayfa
            </button>
            <button
              onClick={() => handleNavigation('/needs')}
              className="block w-full text-left px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-medium"
            >
              İlanlar
            </button>

            {isAuthenticated ? (
              <>
                {!isGuest && (
                  <button
                    onClick={() => handleNavigation('/my-needs')}
                    className="block w-full text-left px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-medium"
                  >
                    İlanlarım
                  </button>
                )}
                {canMessage && (
                  <button
                    onClick={() => handleNavigation('/messages')}
                    className="flex w-full items-center justify-between px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-medium"
                  >
                    <span>Mesajlar</span>
                    {unreadBadge}
                  </button>
                )}
                <button
                  onClick={() => handleNavigation('/create-need')}
                  className="block w-full text-left px-3 py-2 text-[#F59E0B] hover:bg-white/10 rounded-lg transition-colors font-semibold"
                >
                  İlan Ver
                </button>
                <button
                  onClick={() => handleNavigation('/profile')}
                  className="block w-full text-left px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-medium"
                >
                  Profil ({isGuest ? 'Misafir' : user?.firstName})
                </button>
                <hr className="border-white/10" />
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-red-300 hover:bg-white/10 rounded-lg transition-colors font-medium"
                >
                  Çıkış Yap
                </button>
              </>
            ) : (
              <>
                <hr className="border-white/10" />
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => handleNavigation('/login')}
                  className="!text-white/80 hover:!text-white hover:!bg-white/10"
                >
                  Giriş Yap
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => handleNavigation('/register')}
                  className="!bg-[#F59E0B] !text-[#3c0764] hover:!bg-[#D97706] !border-0 font-bold"
                >
                  Kayıt Ol
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
