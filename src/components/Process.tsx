const STEPS = [
  {
    n: '01',
    title: 'Briefing',
    desc: 'Entendemos seu negócio, objetivos e público antes de escrever uma linha de código.',
  },
  {
    n: '02',
    title: 'Design & Prototipagem',
    desc: 'Layout pensado para conversão, validado com você antes do desenvolvimento.',
  },
  {
    n: '03',
    title: 'Desenvolvimento',
    desc: 'Código limpo, performático e responsivo, com automações quando fizer sentido.',
  },
  {
    n: '04',
    title: 'Entrega & Suporte',
    desc: 'Site no ar, treinamento rápido e suporte contínuo pós-entrega.',
  },
];

export default function Process() {
  return (
    <section id="processo" className="scene">
      <div className="scene-inner">
        <div className="section-label">Como funciona</div>
        <h2 className="section-title">
          Um processo claro,<br /><span>do início ao ar</span>
        </h2>
        <div className="steps">
          {STEPS.map((s) => (
            <div className="step" key={s.n}>
              <span className="step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
