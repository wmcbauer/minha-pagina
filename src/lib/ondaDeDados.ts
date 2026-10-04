/**
 * Troca de tema com "onda de dados".
 *
 * A tela vira uma grade de células quadradas. Uma onda parte do botão clicado
 * e se espalha em círculo; cada célula, quando a onda a alcança, passa por
 * três fases curtas — (1) fundo na cor de destaque do NOVO tema com um
 * caractere aleatório, (2) fundo na cor do texto do novo tema, (3) some,
 * revelando a página já no tema novo.
 *
 * Como funciona por baixo (View Transitions API):
 *  - o navegador congela um retrato da página ANTIGA, o tema é trocado dentro
 *    do callback, e o retrato da página NOVA é colocado por cima;
 *  - o retrato novo é recortado por uma máscara (`--onda-mask`, uma imagem com
 *    um pixel por célula) que só "abre" nas células cuja onda já passou;
 *  - os caracteres são desenhados num <canvas> fixo que ganha o próprio
 *    `view-transition-name`, porque o conjunto da transição é pintado ACIMA
 *    de qualquer elemento comum da página, até dos de z-index alto;
 *  - ao terminar, o canvas e a máscara são removidos.
 *
 * Sem View Transitions (ou com "reduzir movimento") cai numa troca simples
 * com transição de cor via CSS.
 */

export const CHARSETS = {
  binario: '01',
  codigo: '<>/{}=;',
  hex: '0123456789ABCDEF',
} as const;

export interface OpcoesOnda {
  /** lado de cada célula, em px */
  tamanhoCelula: number;
  /** tempo até a onda alcançar a célula mais distante, em ms */
  duracaoOnda: number;
  /** atraso aleatório máximo somado a cada célula, em ms (deixa a onda orgânica) */
  variacao: number;
  /** tempo que cada célula leva pelas 3 fases, em ms */
  duracaoCelula: number;
  /** caracteres sorteados na fase 1 (ver CHARSETS) */
  caracteres: string;
}

export const OPCOES_PADRAO: OpcoesOnda = {
  tamanhoCelula: 16,
  duracaoOnda: 1000,
  variacao: 140,
  duracaoCelula: 300,
  caracteres: CHARSETS.binario,
};

const NOME_NA_TRANSICAO = 'onda-dados';
let emAndamento = false;

const prefereReduzido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** troca simples: o CSS anima cor de fundo, texto e bordas por ~0,4s */
function trocaSimples(aplicar: () => void) {
  const raiz = document.documentElement;
  raiz.classList.add('tema-suave');
  aplicar();
  window.setTimeout(() => raiz.classList.remove('tema-suave'), 450);
}

/**
 * @param origem  centro da onda, em px da viewport (o botão clicado)
 * @param aplicar troca o tema — roda DENTRO da transição, então tudo o que ela
 *                mudar aparece só no retrato "novo"
 */
export async function trocarComOnda(
  origem: { x: number; y: number },
  aplicar: () => void,
  opcoes: Partial<OpcoesOnda> = {},
): Promise<void> {
  if (emAndamento) return;
  if (!document.startViewTransition || prefereReduzido()) {
    trocaSimples(aplicar);
    return;
  }
  emAndamento = true;

  const o = { ...OPCOES_PADRAO, ...opcoes };
  const largura = window.innerWidth;
  const altura = window.innerHeight;
  const colunas = Math.ceil(largura / o.tamanhoCelula);
  const linhas = Math.ceil(altura / o.tamanhoCelula);
  const total = colunas * linhas;

  // atraso de cada célula: proporcional à distância até a origem (a mais
  // distante leva `duracaoOnda`) + variação aleatória
  const maisLonge = Math.max(
    Math.hypot(origem.x, origem.y),
    Math.hypot(largura - origem.x, origem.y),
    Math.hypot(origem.x, altura - origem.y),
    Math.hypot(largura - origem.x, altura - origem.y),
  ) || 1;
  const atraso = new Float32Array(total);
  for (let l = 0; l < linhas; l += 1) {
    for (let c = 0; c < colunas; c += 1) {
      const cx = (c + 0.5) * o.tamanhoCelula;
      const cy = (l + 0.5) * o.tamanhoCelula;
      const distancia = Math.hypot(cx - origem.x, cy - origem.y) / maisLonge;
      atraso[l * colunas + c] = distancia * o.duracaoOnda + Math.random() * o.variacao;
    }
  }
  const duracaoTotal = o.duracaoOnda + o.variacao + o.duracaoCelula;

  // máscara: 1 pixel por célula, opaco = "já mostra a página nova". Nasce
  // toda transparente e precisa estar pronta ANTES da transição, senão o
  // retrato novo apareceria inteiro no primeiro frame.
  const mascara = document.createElement('canvas');
  mascara.width = colunas;
  mascara.height = linhas;
  const mctx = mascara.getContext('2d')!;
  const pixels = mctx.createImageData(colunas, linhas);
  const aberta = new Uint8Array(total);
  const raiz = document.documentElement;
  const publicarMascara = () => {
    mctx.putImageData(pixels, 0, 0);
    raiz.style.setProperty('--onda-mask', `url(${mascara.toDataURL()})`);
  };
  publicarMascara();
  raiz.style.setProperty('--onda-dur', `${Math.ceil(duracaoTotal + 150)}ms`);

  // camada dos caracteres
  const tela = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  tela.width = Math.round(largura * dpr);
  tela.height = Math.round(altura * dpr);
  Object.assign(tela.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '2147483000',
    viewTransitionName: NOME_NA_TRANSICAO,
  });
  tela.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tela);

  const limpar = () => {
    tela.remove();
    raiz.style.removeProperty('--onda-mask');
    raiz.style.removeProperty('--onda-dur');
    emAndamento = false;
  };

  // `aplicar` é síncrono de ponta a ponta (tema, React e um frame da cena 3D
  // desenhado na hora), então o callback não precisa esperar frame nenhum —
  // esperar atrasava o começo da onda em até 1,5s.
  const transicao = document.startViewTransition(() => {
    aplicar();
  });
  void transicao.finished.then(limpar, limpar);

  try {
    await transicao.ready;
  } catch {
    // transição abortada (aba em segundo plano, por exemplo): o tema já foi
    // aplicado pelo callback, só não há o que animar
    return;
  }

  // cores do tema NOVO (o callback já rodou) — lidas do CSS pra nunca
  // divergirem das variáveis em index.css
  const estilo = getComputedStyle(raiz);
  const cDestaque = estilo.getPropertyValue('--accent').trim() || '#8fc3f0';
  const cTexto = estilo.getPropertyValue('--text').trim() || '#eef2f6';
  const cFundo = estilo.getPropertyValue('--bg').trim() || '#050810';

  const ctx = tela.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const lado = o.tamanhoCelula;
  ctx.font = `${Math.round(lado * 0.78)}px "DM Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fase = o.duracaoCelula / 3;
  const sorteio = () => o.caracteres[Math.floor(Math.random() * o.caracteres.length)];

  const inicio = performance.now();
  const quadro = (agora: number) => {
    const t = agora - inicio;
    ctx.clearRect(0, 0, largura, altura);
    let abriuAlguma = false;

    for (let i = 0; i < total; i += 1) {
      const idade = t - atraso[i];
      if (idade < 0) continue;
      const x = (i % colunas) * lado;
      const y = Math.floor(i / colunas) * lado;

      if (idade < fase) {
        ctx.fillStyle = cDestaque;
        ctx.fillRect(x, y, lado, lado);
        ctx.fillStyle = cFundo;
        ctx.fillText(sorteio(), x + lado / 2, y + lado / 2 + 1);
        continue;
      }
      if (idade < fase * 2) {
        ctx.fillStyle = cTexto;
        ctx.fillRect(x, y, lado, lado);
        continue;
      }
      // fase 3: a página nova já está liberada nessa célula (máscara aberta)
      // e a cor some por cima dela
      if (!aberta[i]) {
        aberta[i] = 1;
        pixels.data[i * 4 + 3] = 255;
        abriuAlguma = true;
      }
      const sumindo = 1 - (idade - fase * 2) / fase;
      if (sumindo > 0) {
        ctx.globalAlpha = sumindo;
        ctx.fillStyle = cTexto;
        ctx.fillRect(x, y, lado, lado);
        ctx.globalAlpha = 1;
      }
    }

    if (abriuAlguma) publicarMascara();
    if (t < duracaoTotal) requestAnimationFrame(quadro);
    else ctx.clearRect(0, 0, largura, altura);
  };
  requestAnimationFrame(quadro);
}
