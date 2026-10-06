/**
 * Ilustraciones genéricas por tipo de producto (no hay fotos de cada uno).
 * Se elige por palabras del nombre y, si no hay coincidencia, por la categoría.
 * Dibujos de línea en un cuadro de 48×48, con el color de la categoría.
 */

type Kind =
  | 'bag'
  | 'tray'
  | 'box'
  | 'plate'
  | 'cup'
  | 'container'
  | 'cutlery'
  | 'roll'
  | 'tape'
  | 'mold'
  | 'liner'
  | 'doily'
  | 'hat'
  | 'horn'
  | 'balloon'
  | 'tie'
  | 'spool'
  | 'glue'
  | 'paper'
  | 'envelope'
  | 'napkin'
  | 'sealer'
  | 'sheet'
  | 'strap'
  | 'generic';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const DRAW: Record<Kind, React.ReactNode> = {
  bag: (
    <>
      <path d="M12 17h24l-2 22H14z" />
      <path d="M18 17v-3a6 6 0 0 1 12 0v3" />
    </>
  ),
  tray: (
    <>
      <path d="M7 22h34l-4 10H11z" />
      <path d="M11 32h26" opacity=".5" />
    </>
  ),
  box: (
    <>
      <path d="M10 18l14-6 14 6v16l-14 6-14-6z" />
      <path d="M10 18l14 6 14-6M24 24v16" />
    </>
  ),
  plate: (
    <>
      <ellipse cx="24" cy="26" rx="17" ry="8" />
      <ellipse cx="24" cy="25" rx="10" ry="4.5" opacity=".6" />
    </>
  ),
  cup: (
    <>
      <path d="M14 13h20l-3 26H17z" />
      <path d="M15 19h18" opacity=".6" />
    </>
  ),
  container: (
    <>
      <path d="M13 21h22l-2 16H15z" />
      <rect x="11" y="15" width="26" height="6" rx="2" />
    </>
  ),
  cutlery: (
    <>
      <path d="M17 10v10a3 3 0 0 0 6 0V10M20 10v28" />
      <path d="M31 10c-3 2-4 7-4 12h4v16" />
    </>
  ),
  roll: (
    <>
      <ellipse cx="17" cy="24" rx="6" ry="12" />
      <path d="M17 12h14c3.3 0 6 5.4 6 12s-2.7 12-6 12H17" />
      <ellipse cx="17" cy="24" rx="2" ry="4" opacity=".6" />
    </>
  ),
  tape: (
    <>
      <circle cx="22" cy="24" r="12" />
      <circle cx="22" cy="24" r="5" opacity=".6" />
      <path d="M34 24h8v5" />
    </>
  ),
  mold: (
    <>
      <ellipse cx="24" cy="18" rx="15" ry="5" />
      <path d="M9 18v12c0 2.8 6.7 5 15 5s15-2.2 15-5V18" />
    </>
  ),
  liner: (
    <>
      <path d="M12 20h24l-4 16H16z" />
      <path d="M16 20l2 16M21 20l1 16M27 20l-1 16M32 20l-2 16" opacity=".55" />
    </>
  ),
  doily: (
    <>
      <path d="M24 9l3 3.5 4.5-1 1 4.5 4.5 1-1 4.5L39.5 24 36 27l1 4.5-4.5 1-1 4.5-4.5-1L24 39l-3-3.5-4.5 1-1-4.5-4.5-1 1-4.5L8.5 24 12 21l-1-4.5 4.5-1 1-4.5 4.5 1z" />
      <circle cx="24" cy="24" r="6" opacity=".6" />
    </>
  ),
  hat: (
    <>
      <path d="M24 8l11 30H13z" />
      <path d="M17 27l4-2 4 3 4-2" opacity=".6" />
      <circle cx="24" cy="7" r="2" />
    </>
  ),
  horn: (
    <>
      <path d="M9 21l20-7v20L9 27z" />
      <path d="M29 14c5 0 9 4.5 9 10s-4 10-9 10" opacity=".6" />
    </>
  ),
  balloon: (
    <>
      <ellipse cx="24" cy="19" rx="10" ry="12" />
      <path d="M24 31l-2 3h4zM24 34c0 4-4 4-4 8" />
    </>
  ),
  tie: (
    <>
      <path d="M12 36c0-10 8-22 22-24" />
      <rect x="31" y="9" width="7" height="7" rx="1.5" />
      <path d="M15 31l3 1M18 26l3 1M22 21l3 1" opacity=".6" />
    </>
  ),
  spool: (
    <>
      <path d="M14 11h20M14 37h20" />
      <rect x="17" y="11" width="14" height="26" />
      <path d="M17 17l14 3M17 23l14 3M17 29l14 3" opacity=".6" />
    </>
  ),
  glue: (
    <>
      <rect x="15" y="18" width="18" height="21" rx="3" />
      <path d="M19 18v-4h10v4M22 14l2-6 2 6" />
    </>
  ),
  paper: (
    <>
      <path d="M14 10h16l6 6v24H14z" />
      <path d="M30 10v6h6M19 23h12M19 28h12M19 33h8" opacity=".6" />
    </>
  ),
  envelope: (
    <>
      <rect x="9" y="14" width="30" height="21" rx="2" />
      <path d="M9 16l15 11 15-11" />
    </>
  ),
  napkin: (
    <>
      <path d="M11 13h26v22H11z" />
      <path d="M11 13l26 22" opacity=".55" />
      <path d="M24 13v22" opacity=".3" />
    </>
  ),
  sealer: (
    <>
      <rect x="8" y="28" width="32" height="8" rx="2" />
      <path d="M10 23l4-5 4 5 4-5 4 5 4-5 4 5 4-5" />
    </>
  ),
  sheet: (
    <>
      <path d="M8 30l16-14 16 14-16 8z" />
      <path d="M8 30v3l16 8 16-11v-3" opacity=".6" />
    </>
  ),
  strap: (
    <>
      <rect x="11" y="13" width="26" height="22" rx="3" />
      <path d="M24 13v22M11 24h26" />
    </>
  ),
  generic: (
    <>
      <rect x="11" y="13" width="26" height="24" rx="3" />
      <path d="M11 20h26M21 13v7M27 13v7" opacity=".6" />
    </>
  ),
};

/** Palabra del nombre (sin tildes, en minúscula) → dibujo. El orden importa: gana la primera. */
const BY_NAME: [RegExp, Kind][] = [
  [/\b(precinto|precintos)\b/, 'tie'],
  [/\b(pirotin|pirotines|capsula)/, 'liner'],
  [/\bblonda/, 'doily'],
  [/\b(molde|tortera|budinera|marmita|savarin|flanera)/, 'mold'],
  [/\b(bandeja|panchera|provoletera)/, 'tray'],
  [/\b(bolsa|bolsas|bolson)/, 'bag'],
  [/\b(caja|cajita|cajas|estuche)/, 'box'],
  [/\b(plato|platos|ensaladera)/, 'plate'],
  [/\b(vaso|vasos|copa|cucurucho)/, 'cup'],
  [/\b(pote|potes|tapa|tapas|envase|recipiente|contenedor)/, 'container'],
  [/\b(cuchara|cucharas|tenedor|cuchillo|cubierto|revolvedor)/, 'cutlery'],
  [/\b(cinta|cintas|teflon adhesivo)/, 'tape'],
  [/\b(film|rollo|rollos|bobina|polietileno)/, 'roll'],
  [/\b(servilleta|servilletas|panuelo|panuelos|toalla|toallas)/, 'napkin'],
  [/\b(gorro|galera|sombrero|vincha|disfraz|corona|nariz|antifaz|collar|collares)/, 'hat'],
  [/\b(matraca|corneta|pito|pitos|lengua|serpentina|canon|nieve)/, 'horn'],
  [/\b(globo|globos|bengala|vela|velas)/, 'balloon'],
  [/\b(hilo|piolin)/, 'spool'],
  [/\b(plasticola|silicona|adhesivo|pegamento|cola)\b/, 'glue'],
  [/\b(sobre|sobres)\b/, 'envelope'],
  [/\b(resma|hoja|hojas|tarjeta|tarjetas|papel|cartulina|afiche)/, 'paper'],
  [/\b(resistencia|teflon|selladora|repuesto)/, 'sealer'],
  [/\b(fleje|zuncho|esquinero)/, 'strap'],
  [/\b(lamina|laminas|plancha|disco|discos|oblea|base|bases|lingote)/, 'sheet'],
];

const BY_CATEGORY: Record<string, Kind> = {
  Bolsas: 'bag',
  Descartables: 'cup',
  Cotillón: 'balloon',
  Repostería: 'mold',
  Embalaje: 'tape',
  Envases: 'container',
  'Papel e higiene': 'napkin',
  'Bandejas de cartón': 'tray',
  'Cajas de cartulina': 'box',
  'Cajas de cartón': 'box',
  Cintas: 'tape',
  Librería: 'paper',
  Papelería: 'paper',
  'Repuestos selladora Lipari': 'sealer',
};

/** Colores por categoría: [fondo, trazo]. Suaves, para que no compitan con el precio. */
const TINTS: [string, string][] = [
  ['#e8eefc', '#2a4fb0'],
  ['#e3f3e9', '#1d7a46'],
  ['#fdf0d5', '#9a5b00'],
  ['#fbe7ef', '#a8325e'],
  ['#ece8fb', '#5a3fb0'],
  ['#e2f2f4', '#1f6f7a'],
  ['#f3ece2', '#7a5530'],
];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function productKind(name: string, category: string): Kind {
  const n = plain(name);
  for (const [re, kind] of BY_NAME) if (re.test(n)) return kind;
  return BY_CATEGORY[category] ?? 'generic';
}

export function ProductIcon({ name, category, size = 44 }: { name: string; category: string; size?: number }) {
  const [bg, fg] = TINTS[hash(category) % TINTS.length]!;
  return (
    <span className="p-icon" style={{ width: size, height: size, background: bg, color: fg }} aria-hidden>
      <svg viewBox="0 0 48 48" width={size * 0.78} height={size * 0.78} {...S}>
        {DRAW[productKind(name, category)]}
      </svg>
    </span>
  );
}
