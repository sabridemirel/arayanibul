import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import {
  HomePage,
  LoginPage,
  RegisterPage,
  CreateOfferPage,
  CreateNeedPage,
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
} from './pages';
import { Loading } from './components/ui';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireGuest?: boolean;
  /** Registered users only: guest accounts are redirected to the home page */
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
    return <Navigate to="/" replace />;
  }

  if (requireGuest && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

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
      <Route
        path="/create-need"
        element={
          <ProtectedRoute requireAuth>
            <CreateNeedPage />
          </ProtectedRoute>
        }
      />
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
      <Route
        path="/needs/create"
        element={
          <ProtectedRoute requireAuth>
            <CreateNeedPage />
          </ProtectedRoute>
        }
      />
      <Route path="/needs/:id" element={<NeedDetailPage />} />
      <Route
        path="/offers/create/:needId"
        element={
          <ProtectedRoute requireAuth>
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
