import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.ts';

/**
 * Importa el catálogo desde un CSV (por defecto prisma/data/catalogo.csv).
 *
 *   pnpm db:import                       → crea o actualiza todos los productos por código
 *   pnpm db:import -- --solo-nuevos      → solo crea los que no existen (no pisa cambios hechos en el panel)
 *   pnpm db:import -- otro-archivo.csv
 *
 * Columnas: codigo, categoria, nombre, presentacion, precio_efectivo, precio_transferencia,
 *           discrimina_iva (si/no), activo (si/no), revisar (si/no), nota, foto
 *
 * Un producto sin precio se carga con precio 0 e inactivo, para que el bot no lo ofrezca.
 */

const args = process.argv.slice(2).filter((a) => a !== '--');
const onlyNew = args.includes('--solo-nuevos');
const file = resolve(args.find((a) => !a.startsWith('--')) ?? 'prisma/data/catalogo.csv');

/** Parser CSV mínimo (soporta comillas dobles y comas dentro de campos). */
function parseCsv(text: string): Record<string, string>[] {
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
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...data] = rows;
  if (!header) return [];
  const keys = header.map((h) => h.trim().replace(/^﻿/, ''));
  return data.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

const yes = (v: string | undefined) => ['si', 'sí', 's', 'true', '1', 'x'].includes((v ?? '').toLowerCase());
/** Acepta 1234.5, 1234,5 y 1.234,50 */
function money(v: string | undefined): number | null {
  if (!v) return null;
  let s = v.replace(/[$\s]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Precio inválido: "${v}"`);
  return n;
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const rows = parseCsv(readFileSync(file, 'utf8'));
  console.log(`Leyendo ${rows.length} filas de ${file}${onlyNew ? ' (solo nuevos)' : ''}`);

  const errors: string[] = [];
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    const line = i + 2;
    if (!r.codigo) errors.push(`línea ${line}: falta el código`);
    if (!r.nombre) errors.push(`línea ${line}: falta el nombre`);
    const code = r.codigo?.toUpperCase();
    if (code && seen.has(code)) errors.push(`línea ${line}: código repetido ${code}`);
    if (code) seen.add(code);
    try {
      money(r.precio_efectivo);
      money(r.precio_transferencia);
    } catch (e) {
      errors.push(`línea ${line}: ${(e as Error).message}`);
    }
  });
  if (errors.length) {
    console.error('El archivo tiene errores, no se importó nada:\n  ' + errors.join('\n  '));
    process.exit(1);
  }

  // Categorías en el orden en que aparecen en el archivo
  const categoryIds = new Map<string, number>();
  let sortOrder = 0;
  for (const name of [...new Set(rows.map((r) => r.categoria).filter(Boolean))] as string[]) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name, sortOrder: sortOrder++ } });
    categoryIds.set(name, c.id);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  await prisma.$transaction(
    async (tx) => {
      for (const r of rows) {
        const code = r.codigo!.toUpperCase();
        const price = money(r.precio_efectivo);
        const priceTransfer = money(r.precio_transferencia);
        const data = {
          name: r.nombre!,
          unit: r.presentacion || 'unidad',
          price: price ?? 0,
          priceTransfer,
          discriminaIva: yes(r.discrimina_iva),
          // Sin precio nunca queda activo, diga lo que diga la columna
          active: price != null && price > 0 && (r.activo === undefined || r.activo === '' || yes(r.activo)),
          needsReview: yes(r.revisar),
          reviewNote: [r.nota, r.foto ? `foto: ${r.foto}` : ''].filter(Boolean).join(' · ') || null,
          categoryId: r.categoria ? categoryIds.get(r.categoria)! : null,
        };
        const existing = await tx.product.findUnique({ where: { code }, select: { id: true } });
        if (existing) {
          if (onlyNew) {
            skipped++;
            continue;
          }
          await tx.product.update({ where: { code }, data });
          updated++;
        } else {
          await tx.product.create({ data: { code, ...data } });
          created++;
        }
      }
    },
    { timeout: 120_000 },
  );

  const [active, review] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.product.count({ where: { needsReview: true } }),
  ]);
  console.log(`Listo: ${created} creados, ${updated} actualizados${onlyNew ? `, ${skipped} ya existían` : ''}.`);
  console.log(`En la base: ${active} productos activos, ${review} marcados para revisar.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
