const STACK = ['HTML5', 'CSS3', 'JavaScript', 'TypeScript', 'React', 'Node.js'];

const DIFERENCIAIS = [
  { title: 'Velocidade de entrega', desc: 'Do briefing ao ar em semanas, não meses.' },
  { title: 'Foco em conversão', desc: 'Cada decisão de design pensada pra gerar resultado.' },
  { title: 'Suporte direto', desc: 'Você fala com quem desenvolve, sem intermediários.' },
];

export default function About() {
  return (
    <section id="sobre" className="scene">
      <div className="scene-inner">
        <div className="section-label">Quem somos</div>
        <h2 className="section-title">
          Tecnologia feita por quem<br /><span>constrói de verdade</span>
        </h2>
        <p className="section-desc">
          A WMC Tech nasceu da experiência prática de William McBauer, desenvolvedor front-end
          focado em interfaces modernas, performáticas e centradas em resultado. Cada projeto é
          pensado do zero para vender, automatizar e escalar — sem template genérico.
        </p>

        <div className="diferenciais">
          {DIFERENCIAIS.map((d) => (
            <div className="diferencial" key={d.title}>
              <h3>{d.title}</h3>
              <p>{d.desc}</p>
            </div>
          ))}
        </div>

        <div className="stack-row">
          {STACK.map((tech) => (
            <span className="stack-tag" key={tech}>{tech}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
