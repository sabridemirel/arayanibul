import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
} from './pages';
import { Loading } from './components/ui';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireGuest?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = false,
  requireGuest = false,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Yukleniyor..." />
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
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
      <Route
        path="/categories"
        element={
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold">Kategoriler</h1>
            <p className="text-gray-500 mt-2">Bu sayfa yakin zamanda eklenecek.</p>
          </div>
        }
      />

      {/* Legal Pages */}
      <Route
        path="/terms"
        element={
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold">Kullanim Kosullari</h1>
            <p className="text-gray-500 mt-2">Bu sayfa yakin zamanda eklenecek.</p>
          </div>
        }
      />
      <Route
        path="/privacy"
        element={
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold">Gizlilik Politikasi</h1>
            <p className="text-gray-500 mt-2">Bu sayfa yakin zamanda eklenecek.</p>
          </div>
        }
      />
      <Route
        path="/contact"
        element={
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold">Iletisim</h1>
            <p className="text-gray-500 mt-2">Bu sayfa yakin zamanda eklenecek.</p>
          </div>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold">Sifremi Unuttum</h1>
            <p className="text-gray-500 mt-2">Bu sayfa yakin zamanda eklenecek.</p>
          </div>
        }
      />

      {/* 404 Route */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-primary">404</h1>
              <p className="text-xl text-gray-600 mt-4">Sayfa bulunamadi</p>
              <a
                href="/"
                className="mt-4 inline-block text-primary hover:text-primary-dark"
              >
                Ana sayfaya don
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
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
