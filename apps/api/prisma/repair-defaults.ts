import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.ts';

/**
 * Repara los productos afectados por el bug del PATCH (hasta el 03/10/2026): al editar
 * cualquier campo, la presentación pasaba a "unidad" y "Discrimina IVA" se destildaba.
 *
 * Solo toca productos editados después del import, y solo restaura del CSV:
 *  - presentación, si hoy dice "unidad" y en el CSV decía otra cosa
 *  - discrimina IVA, si hoy está destildado y en el CSV estaba tildado
 *
 *   REPAIR_DEFAULTS=dry    → muestra qué cambiaría, sin tocar nada
 *   REPAIR_DEFAULTS=apply  → aplica los cambios
 */

const mode = process.env.REPAIR_DEFAULTS === 'apply' ? 'apply' : 'dry';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  const [header, ...data] = rows;
  return data.map((r) => Object.fromEntries(header!.map((h, i) => [h, r[i] ?? ''])));
}

async function main() {
  const csv = new Map(parseCsv(readFileSync(resolve('prisma/data/catalogo.csv'), 'utf8')).map((r) => [r.codigo!.toUpperCase(), r]));
  const products = await prisma.product.findMany();
  const fixes: { id: number; code: string; data: { unit?: string; discriminaIva?: boolean }; desc: string[] }[] = [];

  for (const p of products) {
    const edited = p.updatedAt.getTime() - p.createdAt.getTime() > 60_000;
    const src = csv.get(p.code);
    if (!edited || !src) continue;
    const data: { unit?: string; discriminaIva?: boolean } = {};
    const desc: string[] = [];
    if (p.unit === 'unidad' && src.presentacion && src.presentacion !== 'unidad') {
      data.unit = src.presentacion;
      desc.push(`presentación "unidad" → "${src.presentacion}"`);
    }
    if (!p.discriminaIva && src.discrimina_iva === 'si') {
      data.discriminaIva = true;
      desc.push('discrimina IVA: no → sí');
    }
    if (desc.length) fixes.push({ id: p.id, code: p.code, data, desc });
  }

  console.log(`[repair] ${fixes.length} productos para reparar (modo: ${mode})`);
  for (const f of fixes) console.log(`[repair] ${f.code}: ${f.desc.join(', ')}`);
  if (mode === 'apply') {
    // Sin tocar updatedAt de forma manual: Prisma lo actualiza solo
    for (const f of fixes) await prisma.product.update({ where: { id: f.id }, data: f.data });
    console.log(`[repair] listo, ${fixes.length} productos reparados`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
