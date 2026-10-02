import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// En desarrollo, el panel le habla a la API a través de este proxy (sin CORS).
// En producción, definí VITE_API_URL con la URL de la API.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
    },
  },
});
