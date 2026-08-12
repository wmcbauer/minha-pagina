export default function Contact() {
  const year = new Date().getFullYear();

  return (
    <section id="contato" className="scene">
      <div className="scene-inner contact-inner">
        <h2>Pronto para o próximo nível?</h2>
        <p>Fale com a gente e descubra como podemos transformar seu negócio.</p>
        <a href="https://wa.me/5511986812921" className="btn">Falar no WhatsApp</a>
        <div className="contact-social">
          <a href="https://github.com/wmcbauer" target="_blank" rel="noreferrer">GitHub</a>
          <span>/</span>
          <a href="https://www.linkedin.com/in/william-mcbauer-firmino-fernandes/" target="_blank" rel="noreferrer">LinkedIn</a>
        </div>
        <footer>© {year} WMC Tech — Todos os direitos reservados</footer>
      </div>
    </section>
  );
}
