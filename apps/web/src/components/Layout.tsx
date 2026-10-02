import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';

export function Layout() {
  const { user, logout } = useAuth();
  // Contador de pedidos para revisar, se refresca solo.
  const counts = useQuery({
    queryKey: ['orders', 'counts'],
    queryFn: () => api<Record<string, number>>('/api/orders/counts'),
    refetchInterval: 15_000,
  });
  const toReview = counts.data?.PENDIENTE_REVISION ?? 0;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            ✎
          </span>
          Papelera Isene
        </div>
        <nav className="nav">
          <NavLink to="/pedidos">
            Pedidos {toReview > 0 && <span className="pill">{toReview}</span>}
          </NavLink>
          <NavLink to="/productos">Productos</NavLink>
          <NavLink to="/ajustes">Ajustes</NavLink>
        </nav>
        <div className="user">
          <span className="muted">{user?.username}</span>
          <button className="btn ghost sm" onClick={logout}>
            Salir
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
