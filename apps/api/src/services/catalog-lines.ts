import { productPrices, round2 } from '@papelera/shared';
import { prisma } from '../db.ts';
import { unprocessable } from '../lib/http.ts';
import { getSettings } from './settings.ts';

export interface LineDraft {
  productId: number | null;
  quantity: number;
  unitPrice?: number;
  productCode?: string;
  productName?: string;
  unit?: string;
}

export interface StockLine {
  productId: number | null;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
}

export interface PricedLine extends StockLine {
  unitPrice: number;
}

function mergeKey(input: LineDraft): string {
  return input.productId != null ? `id:${input.productId}` : `code:${input.productCode ?? ''}`;
}

/** Junta cantidades si el mismo artículo viene repetido. */
function merge(inputs: LineDraft[]): LineDraft[] {
  const out: LineDraft[] = [];
  const index = new Map<string, number>();
  for (const input of inputs) {
    const key = mergeKey(input);
    const at = index.get(key);
    if (at == null) {
      index.set(key, out.length);
      out.push({ ...input });
      continue;
    }
    const prev = out[at]!;
    out[at] = { ...prev, quantity: prev.quantity + input.quantity, unitPrice: input.unitPrice ?? prev.unitPrice };
  }
  return out;
}

async function resolve(inputs: LineDraft[], priced: boolean): Promise<PricedLine[]> {
  if (!inputs.length) throw unprocessable('Agregá al menos un artículo');
  const merged = merge(inputs);
  const ids = merged.flatMap((line) => (line.productId != null ? [line.productId] : []));
  const products = ids.length ? await prisma.product.findMany({ where: { id: { in: ids } } }) : [];
  const byId = new Map(products.map((product) => [product.id, product]));
  if (ids.some((id) => !byId.has(id))) throw unprocessable('Hay artículos que ya no existen. Volvé a buscarlos.');

  for (const line of merged) {
    if (line.productId == null && (!line.productCode?.trim() || !line.productName?.trim())) {
      throw unprocessable('Falta el artículo');
    }
  }

  const ivaRate = priced ? (await getSettings()).ivaRate : undefined;
  return merged.map((line) => {
    if (line.productId == null) {
      return {
        productId: null,
        productCode: line.productCode!.trim(),
        productName: line.productName!.trim(),
        unit: line.unit?.trim() || 'unidad',
        quantity: line.quantity,
        unitPrice: round2(line.unitPrice ?? 0),
      };
    }
    const product = byId.get(line.productId)!;
    const prices = productPrices(
      {
        price: Number(product.price),
        discriminaIva: product.discriminaIva,
        priceTransfer: product.priceTransfer == null ? null : Number(product.priceTransfer),
      },
      ivaRate,
    );
    return {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      unit: product.unit,
      quantity: line.quantity,
      unitPrice: round2(line.unitPrice ?? prices.transfer),
    };
  });
}

export async function stockLines(inputs: LineDraft[]): Promise<StockLine[]> {
  const lines = await resolve(inputs, false);
  return lines.map(({ unitPrice: _unitPrice, ...line }) => line);
}

/** Precio de cada ítem: el que mandó el panel, o el de transferencia del artículo. */
export async function pricedLines(inputs: LineDraft[]): Promise<PricedLine[]> {
  return resolve(inputs, true);
}
