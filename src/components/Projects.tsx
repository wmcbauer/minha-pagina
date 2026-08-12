const PROJECTS = [
  {
    img: '/assets/projects/estetica.png',
    year: '2024',
    title: 'Estética Automotiva',
    desc: 'Sistema de agendamento online para uma estética automotiva, com verificação automática de disponibilidade por box de trabalho e painel administrativo para gestão das reservas.',
    tags: ['HTML', 'CSS', 'JavaScript', 'Supabase'],
    live: 'https://esteticaautomotivaa.netlify.app/',
    code: 'https://github.com/wmcbauer/Projeto-estetica-automotiva',
  },
  {
    img: '/assets/projects/store.png',
    year: '2024',
    title: 'Store',
    desc: 'Landing page de e-commerce para lançamento de produto, com carrossel de destaques, animações de entrada e chamadas para ação voltadas à conversão.',
    tags: ['HTML', 'CSS', 'GSAP'],
    live: 'https://sssstore.netlify.app/',
    code: 'https://github.com/wmcbauer/store',
  },
  {
    img: '/assets/projects/devmovie.png',
    year: '2023',
    title: 'DevMovies',
    desc: 'Plataforma de catálogo de filmes e séries, com navegação por categorias, destaque de lançamentos e páginas de detalhe para cada título.',
    tags: ['Vue', 'TypeScript'],
    live: 'https://mmoviesandseries.netlify.app/',
    code: 'https://github.com/wmcbauer/dev-movie',
  },
];

export default function Projects() {
  return (
    <section id="projetos" className="scene">
      <div className="scene-inner">
        <div className="section-label">Projetos</div>
        <h2 className="section-title">
          Sites que já<br /><span>colocamos no ar</span>
        </h2>
        <div className="projects-grid">
          {PROJECTS.map((p) => (
            <article className="project-card" key={p.title}>
              <div className="project-thumb">
                <img src={p.img} alt={p.title} loading="lazy" width={480} height={270} />
                <div className="project-overlay">
                  <a href={p.live} target="_blank" rel="noreferrer">ver site ↗</a>
                  <a href={p.code} target="_blank" rel="noreferrer">código ↗</a>
                </div>
              </div>
              <div className="project-info">
                <div className="project-header">
                  <h3>{p.title}</h3>
                  <span className="project-year">{p.year}</span>
                </div>
                <p>{p.desc}</p>
                <div className="project-tags">
                  {p.tags.map((t) => <span key={t}>{t}</span>)}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
