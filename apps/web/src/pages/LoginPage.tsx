import { useState, type FormEvent } from 'react';
import { ErrorNote } from '../components/Badges.tsx';
import { useAuth } from '../lib/auth.tsx';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login" onSubmit={onSubmit}>
        <div className="brand lg">
          <span className="brand-mark" aria-hidden>
            ✎
          </span>
          Papelera Isene
        </div>
        <p className="muted">Ingresá para ver los pedidos y la lista de precios.</p>
        <label>
          Usuario
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <ErrorNote error={error} />
        <button className="btn primary" disabled={busy}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
