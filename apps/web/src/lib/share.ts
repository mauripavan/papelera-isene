import { normalizeArPhone } from '@papelera/shared';

export function purchaseListText(input: {
  contactName?: string | null;
  items: { code: string; name: string; unit: string; quantity: number }[];
}): string {
  const contact = input.contactName?.trim();
  const hello = contact ? `Hola ${contact},` : 'Hola,';
  const lines = input.items.map((item) => `• ${item.code} — ${item.name} (${item.unit}) × ${item.quantity}`);
  return `${hello} te paso el pedido de Papelera Isene:\n\n${lines.join('\n')}\n\nGracias.`;
}

/** null si el teléfono no es un celular de Argentina. */
export function whatsappShare(phone: string | null | undefined, text: string): string | null {
  if (!phone?.trim()) return null;
  const normalized = normalizeArPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function emailShare(email: string | null | undefined, subject: string, text: string): string | null {
  const to = email?.trim();
  if (!to) return null;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}
