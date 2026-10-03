import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import { useAuth } from './lib/auth.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { OrderDetailPage } from './pages/OrderDetailPage.tsx';
import { OrdersPage } from './pages/OrdersPage.tsx';
import { PriceListPage } from './pages/PriceListPage.tsx';
import { ProductsPage } from './pages/ProductsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';

export function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Lista de precios pública: la abre cualquiera desde el link del bot, sin login
  if (location.pathname === '/lista') return <PriceListPage />;

  if (loading) return <div className="splash">Cargando…</div>;
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/pedidos" replace />} />
        <Route path="/pedidos" element={<OrdersPage />} />
        <Route path="/pedidos/:id" element={<OrderDetailPage />} />
        <Route path="/productos" element={<ProductsPage />} />
        <Route path="/ajustes" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/pedidos" replace />} />
      </Route>
    </Routes>
  );
}
