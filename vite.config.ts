import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * O Vite só põe <link rel="modulepreload"> no HTML pros imports estáticos. A
 * Experience3D é lazy, então o navegador só descobria que precisava dela
 * depois de baixar e executar o index.js — uma viagem de rede a mais antes
 * de qualquer coisa aparecer no celular. Este plugin anuncia o chunk dela já
 * no HTML, pra ele baixar em paralelo com o resto.
 */
function preCarregarExperiencia(): Plugin {
  return {
    name: 'pre-carregar-experiencia',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const chunk = Object.values(ctx.bundle).find(
          (c) => c.type === 'chunk' && c.name === 'Experience3D',
        );
        if (!chunk) return html;
        return html.replace(
          '</head>',
          `  <link rel="modulepreload" crossorigin href="/${chunk.fileName}">
</head>`,
        );
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), preCarregarExperiencia()],
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
          // O @react-three/postprocessing (bloom) fica de FORA de propósito:
          // é carregado depois, sob demanda (ver src/three/Brilho.tsx).
          'vendor-3d': ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
