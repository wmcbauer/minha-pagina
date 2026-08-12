import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // escuta em 0.0.0.0 (cobre 127.0.0.1 e ::1) — evita problema de bind só em IPv6
  },
});
