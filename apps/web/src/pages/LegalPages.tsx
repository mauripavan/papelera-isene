import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { api } from '../lib/api.ts';

interface Info {
  businessName: string;
  pickupAddress: string;
}

function useInfo() {
  return useQuery({ queryKey: ['public', 'info'], queryFn: () => api<Info>('/public/info') });
}

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  const info = useInfo();
  return (
    <div className="legal">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          ✎
        </span>
        {info.data?.businessName ?? 'Papelera Isene'}
      </div>
      <h1>{title}</h1>
      {children}
      <p className="muted small">Última actualización: octubre de 2026.</p>
    </div>
  );
}

/** Política de privacidad (Meta la pide para aprobar la app de WhatsApp). */
export function PrivacyPage() {
  const info = useInfo();
  const name = info.data?.businessName ?? 'Papelera Isene';
  const address = info.data?.pickupAddress;
  return (
    <LegalLayout title="Política de privacidad">
      <p>
        Esta política explica qué datos usa <b>{name}</b>
        {address ? ` (${address})` : ''} cuando nos hacés un pedido por WhatsApp, y para qué.
      </p>
      <h2>Qué datos usamos</h2>
      <ul>
        <li>Tu número de WhatsApp y el nombre de tu perfil.</li>
        <li>Los productos que pedís, el medio de pago y si retirás o te lo enviamos.</li>
        <li>La dirección de envío, si elegís envío.</li>
        <li>El comprobante de transferencia, si nos lo mandás.</li>
      </ul>
      <h2>Para qué los usamos</h2>
      <p>
        Solo para tomar, preparar y entregar tus pedidos, y para avisarte por WhatsApp sobre su estado (confirmación,
        faltantes, fecha de entrega). No los usamos para publicidad ni los vendemos o compartimos con otras empresas.
      </p>
      <h2>Con quién se comparten</h2>
      <p>
        Los mensajes viajan por WhatsApp, un servicio de Meta, y se rigen también por sus condiciones. Los datos de los
        pedidos se guardan en servidores contratados para este sistema. Nadie más tiene acceso.
      </p>
      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        La conversación con el bot se descarta a las pocas horas. Los pedidos se conservan porque los necesitamos para la
        contabilidad del negocio.
      </p>
      <h2>Tus derechos</h2>
      <p>
        Podés pedir ver, corregir o borrar tus datos en cualquier momento (Ley 25.326 de Protección de Datos Personales).
        Cómo hacerlo está explicado en <a href="/eliminar-datos">Eliminación de datos</a>. La Agencia de Acceso a la
        Información Pública es el órgano de control de esta ley.
      </p>
    </LegalLayout>
  );
}

/** Instrucciones de eliminación de datos (Meta pide la URL en la configuración de la app). */
export function DataDeletionPage() {
  const info = useInfo();
  const name = info.data?.businessName ?? 'Papelera Isene';
  return (
    <LegalLayout title="Eliminación de datos">
      <p>Para que {name} borre tus datos personales:</p>
      <ol>
        <li>
          Escribinos por WhatsApp, al mismo número donde hacés los pedidos, el mensaje: <b className="mono">BORRAR MIS DATOS</b>
        </li>
        <li>El bot borra en el momento tu nombre, tu dirección y la conversación, y te confirma por el mismo chat.</li>
      </ol>
      <p>
        Los pedidos que ya hiciste se conservan sin esos datos, porque los necesitamos para la contabilidad. Si querés
        algo más, pedíselo a quien te atiende por ese mismo chat.
      </p>
      <p>
        Ver también la <a href="/privacidad">Política de privacidad</a>.
      </p>
    </LegalLayout>
  );
}
