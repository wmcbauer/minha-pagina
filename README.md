# WMC Tech

Site da WMC Tech: uma experiência de scroll em 3D (React + Vite + TypeScript + react-three-fiber), em português, inglês e espanhol.

## Comandos

```bash
npm install
npm run dev       # desenvolvimento (http://localhost:5173)
npm run build     # checa os tipos e gera a pasta dist/
npm run preview   # serve o dist/ em http://localhost:4173
```

## Estrutura

```
index.html            primeira pintura, SEO (meta, Open Graph, JSON-LD) e fallback sem JS
public/               copiado como está pro dist/: logos, vídeos, og-image, robots, sitemap
src/
  main.tsx, App.tsx   entrada; App monta header, WhatsApp, tela de abertura e a experiência 3D
  components/         peças 2D por cima da cena (Hero, Presentation, TelaPanel, SceneNav, ...)
  three/
    Experience3D.tsx  a cena + o loop que sincroniza o DOM com o scroll
    timeline.ts       linha do tempo do scroll (em que offset cada coisa acontece)
    beams.ts          feixes de energia 2D e projeção 3D → tela
    captures.tsx      componentes que tiram scroll/offset/câmera de dentro do Canvas
    nodesConfig.ts    as cenas: posição, câmera, vídeo, lado do texto
    sceneTheme.ts     cores da cena 3D em cada tema (escuro/claro)
    ChipScene.tsx     o chip, as telas e as trilhas 3D
  i18n/translations.ts  todos os textos (pt, en, es)
  hooks/              idioma e layout compacto
  config/contact.ts   número do WhatsApp (único lugar pra trocar)
  lib/                tema (theme.ts), onda de dados da troca de tema (ondaDeDados.ts),
                      analytics (Clarity, opcional) e funções numéricas
```

## Como mexer

- **Textos:** `src/i18n/translations.ts` (os três idiomas têm que ter as mesmas chaves).
- **Adicionar ou reordenar cenas:** `src/three/nodesConfig.ts`. Os nós sem `position` são só espaço de scroll; a abertura precisa de 3 deles (ver `PRES_TOTAL` em `timeline.ts`).
- **Cores e tema:** as variáveis ficam no topo de `src/index.css` (`:root` = escuro, `:root[data-theme='light']` = claro). A cena 3D não lê CSS: as mesmas cores estão em `src/three/sceneTheme.ts` — mudou uma, mude a outra. O efeito da troca (onda de células com caracteres) é configurável em `src/lib/ondaDeDados.ts` (`OPCOES_PADRAO`: tamanho da célula, duração, variação e conjunto de caracteres).
- **Número do WhatsApp:** `src/config/contact.ts`.
- **Analytics:** copie `.env.example` para `.env` e preencha `VITE_CLARITY_ID`.

## Publicar na Hostinger

1. Pare qualquer servidor local e rode `npm run build`.
2. Em `public_html`, apague o `assets/` e os arquivos antigos da raiz.
3. Envie o **conteúdo** de `dist/` (não a pasta em si): `index.html`, `assets/`, `og-image.png`, `apple-touch-icon.png`, `robots.txt`, `sitemap.xml`.
