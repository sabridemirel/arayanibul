import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import {
  HomePage,
  LoginPage,
  RegisterPage,
  CreateOfferPage,
  CreateNeedPage,
  EditNeedPage,
  SearchPage,
  MyNeedsPage,
  NeedDetailPage,
  MyOffersPage,
  ProfilePage,
  MessagesPage,
  TermsPage,
  PrivacyPage,
  KvkkPage,
  ContactPage,
  AccountDeletionPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  ProductPricePage,
} from './pages';
import { Loading } from './components/ui';
import { postAuthPath } from './utils/pendingNeedDraft';

// Admin panel ships as its own chunk; regular users never download it
const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

const FullPageLoading: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loading size="lg" text="Yükleniyor..." />
  </div>
);

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireGuest?: boolean;
  /** Registered users only: guests are sent to sign-up (they can only browse) */
  requireMember?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = false,
  requireGuest = false,
  requireMember = false,
}) => {
  const { isAuthenticated, isGuest, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Yükleniyor..." />
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireMember && isGuest) {
    return <Navigate to="/register" replace state={{ guestNotice: true }} />;
  }

  // Guests may still open login/register to get a real account
  if (requireGuest && isAuthenticated && !isGuest) {
    // Someone who wrote a listing before signing in goes back to it instead of the home page.
    return <Navigate to={postAuthPath()} replace />;
  }

  return <>{children}</>;
};

// Admin-only: everyone else is sent to the home page
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return <FullPageLoading />;
  if (!isAuthenticated || !user?.isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

// App Routes Component
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />

      {/* Auth Routes (Guest Only) */}
      <Route
        path="/login"
        element={
          <ProtectedRoute requireGuest>
            <LoginPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/register"
        element={
          <ProtectedRoute requireGuest>
            <RegisterPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes */}
      {/* Anyone can write a listing; signing in is asked for when publishing */}
      <Route path="/create-need" element={<CreateNeedPage />} />
      <Route
        path="/my-needs"
        element={
          <ProtectedRoute requireAuth>
            <MyNeedsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-offers"
        element={
          <ProtectedRoute requireAuth>
            <MyOffersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute requireAuth requireMember>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages/:offerId"
        element={
          <ProtectedRoute requireAuth requireMember>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute requireAuth>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Public Detail Routes */}
      <Route path="/search" element={<SearchPage />} />
      <Route path="/needs" element={<SearchPage />} />
      {/* Anyone can write a listing; signing in is asked for when publishing */}
      <Route path="/needs/create" element={<CreateNeedPage />} />
      <Route path="/needs/:id" element={<NeedDetailPage />} />
      {/* "Gerçek Fiyat": public price page of a catalogued product */}
      <Route path="/fiyat/:slug" element={<ProductPricePage />} />
      <Route
        path="/needs/:id/edit"
        element={
          <ProtectedRoute requireAuth requireMember>
            <EditNeedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/offers/create/:needId"
        element={
          <ProtectedRoute requireAuth requireMember>
            <CreateOfferPage />
          </ProtectedRoute>
        }
      />

      {/* Legal Pages */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/kvkk" element={<KvkkPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/account-deletion" element={<AccountDeletionPage />} />

      {/* Password Recovery */}
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Admin Panel */}
      <Route
        path="/admin/*"
        element={
          <AdminRoute>
            <Suspense fallback={<FullPageLoading />}>
              <AdminApp />
            </Suspense>
          </AdminRoute>
        }
      />

      {/* 404 Route */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-primary">404</h1>
              <p className="text-xl text-gray-600 mt-4">Sayfa bulunamadı</p>
              <a
                href="/"
                className="mt-4 inline-block text-primary hover:text-primary-dark"
              >
                Ana sayfaya dön
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

// Main App Component
function App() {
  return (
    <Router>
      <AuthProvider>
        <ChatProvider>
          <AppRoutes />
        </ChatProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
