const SERVICES = [
  {
    icon: '⚡',
    title: 'Landpages & Sites',
    desc: 'Páginas rápidas, responsivas e otimizadas para converter visitantes em clientes.',
  },
  {
    icon: '🖥️',
    title: 'Criação de Sistemas',
    desc: 'Sistemas web sob medida — painéis administrativos, plataformas internas e ferramentas que automatizam a operação do seu negócio.',
  },
  {
    icon: '🤖',
    title: 'Automação com IA',
    desc: 'Atendimento automático no WhatsApp, qualificação de leads e fluxos inteligentes 24h.',
  },
  {
    icon: '🔗',
    title: 'Integrações',
    desc: 'Conectamos seus sistemas, ferramentas e canais em um único fluxo automatizado.',
  },
];

export default function Services() {
  return (
    <section id="servicos" className="scene">
      <div className="scene-inner">
        <div className="section-label">O que fazemos</div>
        <h2 className="section-title">
          Tecnologia que gera<br /><span>resultado real</span>
        </h2>
        <p className="section-desc">
          Desenvolvemos sites de alta conversão e sistemas de automação com IA — para o seu
          negócio trabalhar mesmo quando você não está.
        </p>
        <div className="cards">
          {SERVICES.map((s) => (
            <div className="card" key={s.title}>
              <div className="card-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
