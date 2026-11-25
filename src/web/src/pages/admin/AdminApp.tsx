import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import ReviewQueuePage from './ReviewQueuePage';
import AdminNeedsPage from './AdminNeedsPage';
import AdminReportsPage from './AdminReportsPage';
import AdminUsersPage from './AdminUsersPage';
import AdminKeywordsPage from './AdminKeywordsPage';
import AdminProductsPage from './AdminProductsPage';

/** Admin panel, mounted at /admin/* as a lazily loaded chunk */
const AdminApp: React.FC = () => (
  <Routes>
    <Route element={<AdminLayout />}>
      <Route index element={<ReviewQueuePage />} />
      <Route path="needs" element={<AdminNeedsPage />} />
      <Route path="reports" element={<AdminReportsPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="keywords" element={<AdminKeywordsPage />} />
      <Route path="products" element={<AdminProductsPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Route>
  </Routes>
);

export default AdminApp;
