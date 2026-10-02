import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.ts';

/**
 * Crea el usuario admin y la configuración inicial.
 * Con SEED_SAMPLE=1 además carga categorías y productos de ejemplo para probar.
 * Es idempotente: se puede correr varias veces.
 */
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const password = process.env.ADMIN_PASSWORD;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (!existing) {
    if (!password) throw new Error('Definí ADMIN_PASSWORD para crear el usuario inicial');
    await prisma.user.create({ data: { username, passwordHash: await bcrypt.hash(password, 10) } });
    console.log(`Usuario "${username}" creado`);
  } else {
    console.log(`Usuario "${username}" ya existe (no se cambia la contraseña)`);
  }

  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  if (process.env.SEED_SAMPLE === '1') {
    const sample: Record<string, [code: string, name: string, unit: string, price: number, discriminaIva: boolean][]> = {
      Resmas: [
        ['R-A4', 'Resma A4 75g', 'resma x 500', 7800, true],
        ['R-OF', 'Resma Oficio 75g', 'resma x 500', 8900, true],
      ],
      Escritura: [
        ['BIC-AZ', 'Birome Bic azul', 'caja x 50', 9500, true],
        ['LAP-HB', 'Lápiz negro HB', 'caja x 12', 2100, false],
      ],
      Descartables: [
        ['VAS-180', 'Vaso plástico 180cc', 'paquete x 100', 2600, false],
        ['SERV-33', 'Servilleta 33x33', 'paquete x 100', 1900, false],
      ],
    };
    let order = 0;
    for (const [categoryName, products] of Object.entries(sample)) {
      const category = await prisma.category.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName, sortOrder: order++ },
      });
      for (const [code, name, unit, price, discriminaIva] of products) {
        await prisma.product.upsert({
          where: { code },
          update: {},
          create: { code, name, unit, price, discriminaIva, categoryId: category.id },
        });
      }
    }
    console.log('Productos de ejemplo cargados');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
