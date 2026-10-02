import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// En desarrollo, el panel le habla a la API a través de este proxy (sin CORS).
// Se usa 127.0.0.1 y no "localhost" a propósito: en macOS "localhost" puede
// resolver a IPv6 y caer en otro dev server que esté usando el mismo puerto.
// En producción, definí VITE_API_URL con la URL de la API.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.API_PROXY_TARGET || 'http://127.0.0.1:3100';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': target,
        '/auth': target,
      },
    },
  };
});
