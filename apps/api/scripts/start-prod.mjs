// Arranque en producción (Railway):
//  1. aplica las migraciones pendientes
//  2. corre el seed (crea el usuario admin si no existe; no toca nada si ya existe)
//  3. si IMPORT_CATALOG=1, importa el catálogo SOLO con productos nuevos (nunca pisa lo editado en el panel)
//  4. levanta la API
import { spawnSync } from 'node:child_process';

function run(cmd, args) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('npx', ['prisma', 'migrate', 'deploy']);
run('npx', ['tsx', 'prisma/seed.ts']);
if (process.env.IMPORT_CATALOG === '1') run('npx', ['tsx', 'prisma/import.ts', '--solo-nuevos']);
run('npx', ['tsx', 'src/index.ts']);
