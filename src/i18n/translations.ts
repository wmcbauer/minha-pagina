export type Language = 'pt' | 'en' | 'es';

/** Telas da seção 3D que têm painel de texto ao lado — a chave liga o nó
 * (nodesConfig.ts) ao texto traduzido daqui. */
export type TelaKey = 'sobre' | 'servicos' | 'processo' | 'projetos' | 'contato';

interface PanelTopic {
  title: string;
  desc: string;
}

interface TelaPanelContent {
  eyebrow: string;
  heading: string;
  topics: PanelTopic[];
  /** só o rótulo do botão — o link vem de config/contact.ts, porque URL e
   * número não são texto traduzível e não devem ser repetidos por idioma */
  cta?: string;
}

export interface Translation {
  /** título e descrição da aba/busca no idioma ativo (o HTML estático que os
   * robôs leem é o português — ver index.html; isto acompanha quem troca) */
  meta: {
    title: string;
    description: string;
  };
  /** botão de WhatsApp: `label` é o texto/nome acessível, `mensagem` chega
   * pré-preenchida na conversa (assim o atendimento já sabe de onde veio) */
  whatsapp: {
    label: string;
    mensagem: string;
  };
  hero: {
    eyebrow: string;
    subtitle: string;
    badge: string;
  };
  card1: {
    intro: string;
    bullets: { title: string; desc: string }[];
  };
  card2: {
    label: string;
    paragraph: string;
    tiles: { title: string; desc: string }[];
  };
  card3: {
    cta: string;
    tags: string[];
  };
  telas: Record<TelaKey, TelaPanelContent>;
  /** rótulos da trilha de navegação lateral. Só os blocos que não têm um
   * texto curto próprio pra reaproveitar — os das telas vêm do `eyebrow`
   * de cada painel, e "quem somos" vem de card2.label */
  nav: {
    inicio: string;
    solucoes: string;
    /** o card "quem somos" da apresentação. Rótulo próprio, e não
     * card2.label, porque a primeira TELA também se chama "quem somos" — dois
     * nós com o mesmo nome deixam a trilha ambígua (e o leitor de tela pior) */
    equipe: string;
    /** o card 3 da apresentação: ponte pras telas ("veja na prática").
     * Já se chamou "portfólio", mas não há portfólio no site — o nome
     * prometia o que o visitante não ia encontrar */
    naPratica: string;
    /** nome acessível dos dois controles de passo */
    anterior: string;
    proximo: string;
  };
}

export const translations: Record<Language, Translation> = {
  pt: {
    meta: {
      title: 'WMC Tech — Sites e atendimento automático para pequenos negócios',
      description:
        'Criamos o site e o atendimento automático da sua empresa, com prazo e valor por escrito e tudo explicado sem jargão. Orçamento sem compromisso.',
    },
    whatsapp: {
      label: 'Falar no WhatsApp',
      mensagem: 'Olá! Vi o site da WMC Tech e gostaria de um orçamento.',
    },
    hero: {
      eyebrow: 'Sites · Organização · Atendimento automático',
      subtitle: 'Mais clientes e menos trabalho pra você.',
      badge: 'Projetos entregues em todo o Brasil',
    },
    card1: {
      intro: 'A WMC Tech resolve os problemas digitais do seu negócio, sem você precisar entender de tecnologia:',
      bullets: [
        { title: 'Site que vende', desc: 'Páginas rápidas e bonitas, feitas pra transformar visita em cliente.' },
        { title: 'Negócio organizado', desc: 'Pedidos, clientes e caixa num lugar só, sem planilha solta.' },
        { title: 'Atendimento automático', desc: 'Responde seus clientes no WhatsApp 24h, mesmo fora do horário.' },
        { title: 'Tudo conectado', desc: 'Seus programas conversando entre si, sem digitar a mesma coisa duas vezes.' },
      ],
    },
    card2: {
      label: 'Quem somos',
      paragraph:
        'Somos uma equipe focada em tecnologia aplicada ao dia a dia de quem empreende. Entendemos que nem todo mundo entende de programação — e não precisa. Nosso trabalho é traduzir sua necessidade real (organizar o caixa, atender mais rápido, vender mais) numa solução simples de usar, sem enrolação técnica.',
      tiles: [
        { title: 'Comunicação direta', desc: 'Você fala com quem desenvolve' },
        { title: 'Sem enrolação técnica', desc: 'Linguagem simples, do início ao fim' },
        { title: 'Suporte contínuo', desc: 'Do ar ao pós-lançamento' },
      ],
    },
    card3: {
      cta: 'Este site inteiro foi feito por nós. Role e veja como a gente pode fazer o mesmo pelo seu negócio.',
      tags: ['Sites', 'Organização', 'Atendimento', 'Tudo conectado'],
    },
    telas: {
      sobre: {
        eyebrow: 'Quem somos',
        heading: 'Você fala direto com quem constrói o seu projeto',
        topics: [
          { title: 'Sem intermediário', desc: 'Nada de fila de atendimento ou robô: você trata com quem escreve o código.' },
          { title: 'No ar em semanas, não em meses', desc: 'Prazo curto e combinado desde o começo, sem projeto que se arrasta.' },
          { title: 'Tudo explicado sem jargão', desc: 'Você entende cada etapa e sabe exatamente o que está contratando.' },
        ],
      },
      servicos: {
        eyebrow: 'O que fazemos',
        heading: 'O que a gente resolve no seu negócio',
        topics: [
          { title: 'Site que traz cliente', desc: 'Sua empresa achada no Google e passando confiança pra quem chega.' },
          { title: 'Sistema do seu jeito', desc: 'Pedidos, clientes e caixa organizados num lugar só, sem planilha solta.' },
          { title: 'Atendimento que não dorme', desc: 'Responde e agenda no WhatsApp 24h, mesmo fora do horário.' },
          { title: 'Tudo conectado', desc: 'Seus sistemas conversando entre si, sem ninguém digitando duas vezes.' },
        ],
      },
      processo: {
        eyebrow: 'Como funciona',
        heading: 'Do primeiro papo até estar no ar',
        topics: [
          { title: '01 — Conversa', desc: 'A gente entende seu negócio e o que precisa resolver. Sem compromisso.' },
          { title: '02 — Proposta fechada', desc: 'Prazo e valor por escrito antes de começar. Sem custo surpresa no meio.' },
          { title: '03 — Você aprova antes', desc: 'Vê como vai ficar e pede ajuste à vontade, antes de virar site.' },
          { title: '04 — No ar e acompanhado', desc: 'Publicamos, ensinamos você a usar e seguimos por perto depois.' },
        ],
      },
      projetos: {
        eyebrow: 'Projetos',
        heading: 'Negócios que já estão rodando com a gente',
        topics: [
          { title: 'Estética Automotiva — 2024', desc: 'A agenda se preenche sozinha: o cliente marca online, sem ninguém no telefone.' },
          { title: 'Store — 2024', desc: 'Loja que abre rápido no celular e não perde quem estava quase comprando.' },
          { title: 'DevMovies — 2023', desc: 'Acervo grande, organizado por categoria e fácil de achar o que quer.' },
        ],
      },
      contato: {
        eyebrow: 'Contato',
        heading: 'Conta o seu problema. A gente diz se dá pra resolver.',
        topics: [
          { title: 'Orçamento sem compromisso', desc: 'Explica o que precisa e recebe prazo e valor. Se não fizer sentido, a gente fala.' },
          { title: 'Direto no WhatsApp', desc: 'Sem formulário longo nem espera: você já fala com quem desenvolve.' },
        ],
        cta: 'Chamar no WhatsApp',
      },
    },
    nav: {
      inicio: 'Início',
      solucoes: 'Soluções',
      equipe: 'A equipe',
      naPratica: 'Na prática',
      anterior: 'Bloco anterior',
      proximo: 'Próximo bloco',
    },
  },
  en: {
    meta: {
      title: 'WMC Tech — Websites and automatic customer service for small businesses',
      description:
        'We build your company website and automatic customer service, with the deadline and price in writing and everything explained without jargon. Free quote.',
    },
    whatsapp: {
      label: 'Chat on WhatsApp',
      mensagem: 'Hi! I saw the WMC Tech website and would like a quote.',
    },
    hero: {
      eyebrow: 'Websites · Organization · Automatic customer service',
      subtitle: 'More customers, less work for you.',
      badge: 'Projects delivered all across Brazil',
    },
    card1: {
      intro: 'WMC Tech solves your business’s digital problems, without you having to understand technology:',
      bullets: [
        { title: 'A website that sells', desc: 'Fast, good-looking pages built to turn visitors into customers.' },
        { title: 'A business in order', desc: 'Orders, customers and cash in one place — no more loose spreadsheets.' },
        { title: 'Automatic customer service', desc: 'Answers your customers on WhatsApp 24/7, even outside business hours.' },
        { title: 'Everything connected', desc: 'Your programs talking to each other, so nobody types the same thing twice.' },
      ],
    },
    card2: {
      label: 'Who we are',
      paragraph:
        "We're a team focused on technology applied to the everyday life of entrepreneurs. We know not everyone understands code — and you don't need to. Our job is to translate your real needs (organizing your cash flow, serving customers faster, selling more) into a solution that's simple to use, with no technical jargon.",
      tiles: [
        { title: 'Direct communication', desc: 'You talk straight to the developer' },
        { title: 'No technical jargon', desc: 'Plain language, start to finish' },
        { title: 'Ongoing support', desc: 'From launch to post-launch' },
      ],
    },
    card3: {
      cta: 'This entire website was built by us. Scroll and see how we can do the same for your business.',
      tags: ['Websites', 'Organization', 'Customer service', 'Everything connected'],
    },
    telas: {
      sobre: {
        eyebrow: 'Who we are',
        heading: 'You talk straight to the person building your project',
        topics: [
          { title: 'No middleman', desc: 'No support queue, no bot: you deal with the person writing the code.' },
          { title: 'Live in weeks, not months', desc: 'A short deadline agreed upfront — no project that drags on forever.' },
          { title: 'Explained without jargon', desc: 'You understand every step and know exactly what you are paying for.' },
        ],
      },
      servicos: {
        eyebrow: 'What we do',
        heading: 'What we actually fix in your business',
        topics: [
          { title: 'A site that brings customers', desc: 'Your business found on Google and earning trust from whoever lands there.' },
          { title: 'A system built your way', desc: 'Orders, customers and cash in one place — no more loose spreadsheets.' },
          { title: 'Support that never sleeps', desc: 'Answers and books on WhatsApp 24/7, even outside business hours.' },
          { title: 'Everything connected', desc: 'Your systems talking to each other, with nobody typing the same thing twice.' },
        ],
      },
      processo: {
        eyebrow: 'How it works',
        heading: 'From the first conversation to going live',
        topics: [
          { title: '01 — Conversation', desc: 'We learn your business and what you need solved. No strings attached.' },
          { title: '02 — Fixed proposal', desc: 'Deadline and price in writing before we start. No surprise costs halfway.' },
          { title: '03 — You approve first', desc: 'You see how it will look and ask for changes freely, before it becomes a site.' },
          { title: '04 — Live and supported', desc: 'We publish it, teach you to use it, and stay close afterwards.' },
        ],
      },
      projetos: {
        eyebrow: 'Projects',
        heading: 'Businesses already running with us',
        topics: [
          { title: 'Car Detailing — 2024', desc: 'The calendar fills itself: customers book online, nobody stuck on the phone.' },
          { title: 'Store — 2024', desc: 'A shop that loads fast on mobile and keeps the ones who were about to buy.' },
          { title: 'DevMovies — 2023', desc: 'A large catalogue, sorted by category and easy to search through.' },
        ],
      },
      contato: {
        eyebrow: 'Contact',
        heading: 'Tell us your problem. We will say if we can solve it.',
        topics: [
          { title: 'Free quote, no strings', desc: 'Tell us what you need and get a deadline and a price. If it makes no sense, we will say so.' },
          { title: 'Straight to WhatsApp', desc: 'No long form, no waiting: you talk to the developer right away.' },
        ],
        cta: 'Message us on WhatsApp',
      },
    },
    nav: {
      inicio: 'Start',
      solucoes: 'Solutions',
      equipe: 'The team',
      naPratica: 'In practice',
      anterior: 'Previous section',
      proximo: 'Next section',
    },
  },
  es: {
    meta: {
      title: 'WMC Tech — Sitios web y atención automática para pequeños negocios',
      description:
        'Creamos el sitio web y la atención automática de tu empresa, con plazo y precio por escrito y todo explicado sin tecnicismos. Presupuesto sin compromiso.',
    },
    whatsapp: {
      label: 'Hablar por WhatsApp',
      mensagem: '¡Hola! Vi el sitio de WMC Tech y me gustaría un presupuesto.',
    },
    hero: {
      eyebrow: 'Sitios web · Organización · Atención automática',
      subtitle: 'Más clientes y menos trabajo para ti.',
      badge: 'Proyectos entregados en todo Brasil',
    },
    card1: {
      intro: 'WMC Tech resuelve los problemas digitales de tu negocio, sin que tengas que entender de tecnología:',
      bullets: [
        { title: 'Un sitio que vende', desc: 'Páginas rápidas y bonitas, hechas para convertir visitas en clientes.' },
        { title: 'Negocio organizado', desc: 'Pedidos, clientes y caja en un solo lugar, sin planillas sueltas.' },
        { title: 'Atención automática', desc: 'Responde a tus clientes por WhatsApp 24h, incluso fuera del horario.' },
        { title: 'Todo conectado', desc: 'Tus programas hablando entre sí, sin escribir lo mismo dos veces.' },
      ],
    },
    card2: {
      label: 'Quiénes somos',
      paragraph:
        'Somos un equipo enfocado en tecnología aplicada al día a día de quien emprende. Entendemos que no todo el mundo entiende de programación — y no hace falta. Nuestro trabajo es traducir tu necesidad real (organizar la caja, atender más rápido, vender más) en una solución simple de usar, sin rodeos técnicos.',
      tiles: [
        { title: 'Comunicación directa', desc: 'Hablas con quien desarrolla' },
        { title: 'Sin rodeos técnicos', desc: 'Lenguaje simple, de principio a fin' },
        { title: 'Soporte continuo', desc: 'Del lanzamiento al post-lanzamiento' },
      ],
    },
    card3: {
      cta: 'Este sitio entero lo hicimos nosotros. Desplázate y mira cómo podemos hacer lo mismo por tu negocio.',
      tags: ['Sitios', 'Organización', 'Atención', 'Todo conectado'],
    },
    telas: {
      sobre: {
        eyebrow: 'Quiénes somos',
        heading: 'Hablas directo con quien construye tu proyecto',
        topics: [
          { title: 'Sin intermediarios', desc: 'Nada de filas de atención ni bots: tratas con quien escribe el código.' },
          { title: 'En línea en semanas, no en meses', desc: 'Plazo corto y acordado desde el principio, sin proyectos que se alargan.' },
          { title: 'Todo explicado sin tecnicismos', desc: 'Entiendes cada etapa y sabes exactamente lo que estás contratando.' },
        ],
      },
      servicos: {
        eyebrow: 'Qué hacemos',
        heading: 'Lo que resolvemos en tu negocio',
        topics: [
          { title: 'Un sitio que trae clientes', desc: 'Tu empresa encontrada en Google y transmitiendo confianza a quien llega.' },
          { title: 'Un sistema a tu manera', desc: 'Pedidos, clientes y caja organizados en un solo lugar, sin planillas sueltas.' },
          { title: 'Atención que no duerme', desc: 'Responde y agenda por WhatsApp 24h, incluso fuera del horario.' },
          { title: 'Todo conectado', desc: 'Tus sistemas hablando entre sí, sin que nadie escriba lo mismo dos veces.' },
        ],
      },
      processo: {
        eyebrow: 'Cómo funciona',
        heading: 'De la primera charla hasta estar en línea',
        topics: [
          { title: '01 — Conversación', desc: 'Entendemos tu negocio y lo que necesitas resolver. Sin compromiso.' },
          { title: '02 — Propuesta cerrada', desc: 'Plazo y precio por escrito antes de empezar. Sin costos sorpresa a mitad de camino.' },
          { title: '03 — Apruebas antes', desc: 'Ves cómo va a quedar y pides ajustes a gusto, antes de que sea un sitio.' },
          { title: '04 — En línea y acompañado', desc: 'Lo publicamos, te enseñamos a usarlo y seguimos cerca después.' },
        ],
      },
      projetos: {
        eyebrow: 'Proyectos',
        heading: 'Negocios que ya funcionan con nosotros',
        topics: [
          { title: 'Estética Automotriz — 2024', desc: 'La agenda se llena sola: el cliente reserva en línea, sin nadie al teléfono.' },
          { title: 'Store — 2024', desc: 'Tienda que abre rápido en el celular y no pierde a quien estaba por comprar.' },
          { title: 'DevMovies — 2023', desc: 'Catálogo grande, ordenado por categoría y fácil de encontrar lo que buscas.' },
        ],
      },
      contato: {
        eyebrow: 'Contacto',
        heading: 'Cuéntanos tu problema. Te decimos si podemos resolverlo.',
        topics: [
          { title: 'Presupuesto sin compromiso', desc: 'Cuentas qué necesitas y recibes plazo y precio. Si no tiene sentido, te lo decimos.' },
          { title: 'Directo por WhatsApp', desc: 'Sin formularios largos ni esperas: hablas de una vez con quien desarrolla.' },
        ],
        cta: 'Escribir por WhatsApp',
      },
    },
    nav: {
      inicio: 'Inicio',
      solucoes: 'Soluciones',
      equipe: 'El equipo',
      naPratica: 'En la práctica',
      anterior: 'Bloque anterior',
      proximo: 'Bloque siguiente',
    },
  },
};
