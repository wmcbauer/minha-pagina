import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // escuta em 0.0.0.0 (cobre 127.0.0.1 e ::1) — evita problema de bind só em IPv6
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // three.js + o ecossistema r3f num chunk à parte do código do
          // site (Experience3D/ChipScene, já carregado sob demanda via
          // lazy() em App.tsx). Não reduz o total baixado na primeira
          // visita — os dois chunks carregam juntos mesmo — mas separa a
          // parte que praticamente não muda (as libs) da que muda a cada
          // deploy (o app), então visitas seguintes após um novo deploy
          // não pagam de novo pelas libs, só pelo chunk do app.
          'vendor-3d': ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
        },
      },
    },
  },
});
