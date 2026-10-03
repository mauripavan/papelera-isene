import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api.ts';
import { dateTime } from '../lib/format.ts';
import { ErrorNote } from './Badges.tsx';

interface WhatsAppStatus {
  mode: 'connection' | 'env' | 'off';
  connection: {
    wabaId: string;
    phoneNumberId: string;
    displayPhone: string | null;
    verifiedName: string | null;
    coexistence: boolean;
    connectedAt: string;
  } | null;
  signup: { appId: string; configId: string; apiVersion: string } | null;
}

declare global {
  interface Window {
    FB?: {
      init(opts: Record<string, unknown>): void;
      login(cb: (r: { authResponse?: { code?: string } | null }) => void, opts: Record<string, unknown>): void;
    };
    fbAsyncInit?: () => void;
  }
}

/** Carga el SDK de Facebook una sola vez. */
let sdkPromise: Promise<void> | null = null;
function loadFacebookSdk(appId: string, version: string) {
  sdkPromise ??= new Promise<void>((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB!.init({ appId, autoLogAppEvents: true, xfbml: false, version });
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/es_LA/sdk.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('No se pudo cargar el SDK de Facebook'));
    };
    document.body.appendChild(script);
  });
  return sdkPromise;
}

/**
 * Abre el Embedded Signup de Meta en modo coexistencia y devuelve lo necesario para conectar:
 * el `code` (por el callback de FB.login) y el waba_id / phone_number_id (por postMessage).
 */
function runEmbeddedSignup(signup: NonNullable<WhatsAppStatus['signup']>) {
  return new Promise<{ code: string; wabaId: string; phoneNumberId?: string }>((resolve, reject) => {
    let session: { wabaId?: string; phoneNumberId?: string } = {};
    let code: string | null = null;

    const done = () => {
      if (code && session.wabaId) {
        window.removeEventListener('message', onMessage);
        resolve({ code, wabaId: session.wabaId, phoneNumberId: session.phoneNumberId });
      }
    };

    const onMessage = (event: MessageEvent) => {
      if (!/^https:\/\/([a-z]+\.)?facebook\.com$/.test(event.origin)) return;
      let data: any = event.data;
      try {
        if (typeof data === 'string') data = JSON.parse(data);
      } catch {
        return;
      }
      if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (data.event === 'CANCEL') {
        window.removeEventListener('message', onMessage);
        reject(new Error(data.data?.error_message ? `Meta: ${data.data.error_message}` : 'Se canceló la conexión'));
        return;
      }
      if (data.data?.waba_id) session = { wabaId: data.data.waba_id, phoneNumberId: data.data.phone_number_id };
      done();
    };
    window.addEventListener('message', onMessage);

    window.FB!.login(
      (response) => {
        code = response.authResponse?.code ?? null;
        if (!code) {
          window.removeEventListener('message', onMessage);
          reject(new Error('Se cerró la ventana de Meta sin terminar la conexión'));
          return;
        }
        // El evento con el waba_id a veces llega un instante después del callback
        setTimeout(() => {
          if (!session.wabaId) {
            window.removeEventListener('message', onMessage);
            reject(new Error('Meta no devolvió la cuenta de WhatsApp. Probá de nuevo.'));
          }
        }, 8000);
        done();
      },
      {
        config_id: signup.configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' },
      },
    );
  });
}

export function WhatsAppCard() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['whatsapp', 'status'], queryFn: () => api<WhatsAppStatus>('/api/whatsapp/status') });
  const [warnings, setWarnings] = useState<string[]>([]);
  const [testTo, setTestTo] = useState('');

  const connect = useMutation({
    mutationFn: async () => {
      const signup = status.data?.signup;
      if (!signup) throw new Error('Falta configurar META_APP_ID y META_CONFIG_ID en el servidor');
      await loadFacebookSdk(signup.appId, signup.apiVersion);
      const result = await runEmbeddedSignup(signup);
      return api<WhatsAppStatus & { warnings: string[] }>('/api/whatsapp/connect', {
        method: 'POST',
        json: { ...result, coexistence: true },
      });
    },
    onSuccess: (r) => {
      setWarnings(r.warnings ?? []);
      qc.setQueryData(['whatsapp', 'status'], r);
    },
  });

  const disconnect = useMutation({
    mutationFn: () => api<WhatsAppStatus>('/api/whatsapp/connection', { method: 'DELETE' }),
    onSuccess: (r) => qc.setQueryData(['whatsapp', 'status'], r),
  });

  const test = useMutation({
    mutationFn: () => api('/api/whatsapp/test', { method: 'POST', json: { to: testTo } }),
  });

  const s = status.data;
  const c = s?.connection;

  return (
    <div className="card span-all">
      <h2>WhatsApp</h2>
      {status.isLoading && <p className="muted">Cargando…</p>}
      {s && (
        <>
          <p>
            {s.mode === 'connection' && c ? (
              <>
                <span className="badge ok">Conectado</span> <b>{c.displayPhone}</b>
                {c.verifiedName && <> · {c.verifiedName}</>}
                {c.coexistence && <span className="muted small"> · sigue funcionando en la app WhatsApp Business</span>}
                <br />
                <span className="muted small">Conectado el {dateTime(c.connectedAt)}</span>
              </>
            ) : s.mode === 'env' ? (
              <>
                <span className="badge info">Número de prueba</span>{' '}
                <span className="muted">El bot usa el número configurado en el servidor (variables de entorno).</span>
              </>
            ) : (
              <>
                <span className="badge neutral">Apagado</span> <span className="muted">El bot no tiene un número de WhatsApp.</span>
              </>
            )}
          </p>

          <p className="muted small">
            Al conectar el número de la papelera, se abre una ventana de Meta: elegí <b>conectar la app WhatsApp Business</b>,
            escaneá el código QR desde el celular (WhatsApp Business → Dispositivos vinculados) y aceptá compartir el
            historial. El número sigue funcionando en el celular como siempre. Importante: hay que abrir WhatsApp Business en
            el celular al menos una vez cada 14 días.
          </p>

          <div className="row">
            <button className="btn primary" onClick={() => connect.mutate()} disabled={connect.isPending || !s.signup}>
              {connect.isPending ? 'Conectando…' : c ? 'Volver a conectar' : 'Conectar WhatsApp de la papelera'}
            </button>
            {c && (
              <button
                className="btn danger ghost"
                disabled={disconnect.isPending}
                onClick={() => window.confirm('¿Desconectar el número? El bot deja de responder en ese número.') && disconnect.mutate()}
              >
                Desconectar
              </button>
            )}
          </div>
          {!s.signup && (
            <p className="muted small">Para habilitar el botón, cargá META_APP_ID y META_CONFIG_ID en el servidor.</p>
          )}
          <ErrorNote error={connect.error ?? disconnect.error} />
          {warnings.map((w) => (
            <p key={w} className="note">
              {w}
            </p>
          ))}

          {s.mode !== 'off' && (
            <form
              className="row test-row"
              onSubmit={(e) => {
                e.preventDefault();
                test.mutate();
              }}
            >
              <input placeholder="Tu número, ej: 5491122334455" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
              <button className="btn" disabled={test.isPending || !testTo}>
                Mandar mensaje de prueba
              </button>
            </form>
          )}
          {test.isSuccess && <p className="success">Mensaje enviado.</p>}
          <ErrorNote error={test.error} />
        </>
      )}
    </div>
  );
}
