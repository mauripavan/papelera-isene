import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { ErrorNote } from '../components/Badges.tsx';
import { WhatsAppCard } from '../components/WhatsAppCard.tsx';
import { api } from '../lib/api.ts';
import type { Settings } from '../lib/types.ts';

export function SettingsPage() {
  return (
    <section>
      <div className="page-head">
        <h1>Ajustes</h1>
      </div>
      <WhatsAppCard />
      <div className="grid-2">
        <BusinessForm />
        <PasswordForm />
      </div>
    </section>
  );
}

function BusinessForm() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api<Settings>('/api/settings') });
  const [form, setForm] = useState({ businessName: '', ivaPct: '21', transferInfo: '', pickupAddress: '', minOrder: '0' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    setForm({
      businessName: settings.data.businessName,
      ivaPct: String(Math.round(settings.data.ivaRate * 1000) / 10),
      transferInfo: settings.data.transferInfo,
      pickupAddress: settings.data.pickupAddress,
      minOrder: String(settings.data.minOrderForDelivery),
    });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      api<Settings>('/api/settings', {
        method: 'PATCH',
        json: {
          businessName: form.businessName,
          ivaRate: Number(form.ivaPct.replace(',', '.')) / 100,
          transferInfo: form.transferInfo,
          pickupAddress: form.pickupAddress,
          minOrderForDelivery: Number(form.minOrder.replace(',', '.')) || 0,
        },
      }),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    save.mutate();
  };

  return (
    <form className="card form-grid" onSubmit={onSubmit}>
      <h2>Negocio</h2>
      <label className="span-2">
        Nombre
        <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required />
      </label>
      <label>
        IVA para productos que discriminan (%)
        <input value={form.ivaPct} onChange={(e) => setForm({ ...form, ivaPct: e.target.value })} inputMode="decimal" required />
      </label>
      <label className="span-2">
        Compra mínima para envío ($)
        <input value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} inputMode="decimal" />
        <span className="muted small">0 = sin mínimo. El bot lo avisa al preguntar retiro o envío.</span>
      </label>
      <label className="span-2">
        Dirección para retirar
        <input
          value={form.pickupAddress}
          onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })}
          placeholder="Calle 123, San Justo"
        />
      </label>
      <label className="span-2">
        Datos para transferir (el bot se los manda al cliente)
        <textarea
          rows={4}
          value={form.transferInfo}
          onChange={(e) => setForm({ ...form, transferInfo: e.target.value })}
          placeholder={'Alias: papelera.isene\nTitular: ...'}
        />
      </label>
      <ErrorNote error={save.error} />
      {saved && <p className="success span-2">Guardado.</p>}
      <button className="btn primary" disabled={save.isPending}>
        Guardar
      </button>
    </form>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [done, setDone] = useState(false);
  const change = useMutation({
    mutationFn: () => api('/auth/password', { method: 'POST', json: { currentPassword, newPassword } }),
    onSuccess: () => {
      setDone(true);
      setCurrent('');
      setNew('');
    },
  });

  return (
    <form
      className="card form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(false);
        change.mutate();
      }}
    >
      <h2>Cambiar contraseña</h2>
      <label className="span-2">
        Contraseña actual
        <input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
      </label>
      <label className="span-2">
        Contraseña nueva (mínimo 8 caracteres)
        <input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} autoComplete="new-password" minLength={8} required />
      </label>
      <ErrorNote error={change.error} />
      {done && <p className="success span-2">Contraseña actualizada.</p>}
      <button className="btn" disabled={change.isPending}>
        Cambiar
      </button>
    </form>
  );
}
