(function () {

  /* ── Scroll reveal ── */
  var revealEls = [];

  function collectReveal() {
    document.querySelectorAll(
      '#about, #skills, #projects, #contact, ' +
      '.project-card, .skill-group, .stat, .info-card, ' +
      '.hero-eyebrow, .hero-title, .hero-role, .hero-bio, .hero-cta, .hero-deco'
    ).forEach(function (el) {
      el.classList.add('reveal');
      revealEls.push(el);
    });
  }

  function checkReveal() {
    var threshold = window.innerHeight * 0.88;
    revealEls.forEach(function (el) {
      var top = el.getBoundingClientRect().top;
      if (top < threshold) el.classList.add('visible');
    });
  }

  /* ── Nav active link on scroll ── */
  var sections = [];
  var navLinks = [];

  function collectNav() {
    document.querySelectorAll('#nav .nav-links a').forEach(function (a) {
      navLinks.push(a);
    });
    ['hero','about','skills','projects','contact'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) sections.push({ id: id, el: el });
    });
  }

  function updateNav() {
    var scrollY = window.scrollY + 120;
    var current = '';
    sections.forEach(function (s) {
      if (s.el.offsetTop <= scrollY) current = s.id;
    });
    navLinks.forEach(function (a) {
      var href = a.getAttribute('href').replace('#','');
      if (href === current) {
        a.style.color = 'var(--white)';
      } else {
        a.style.color = '';
      }
    });
  }

  /* ── Nav background on scroll ── */
  var nav = document.getElementById('nav');
  function updateNavBg() {
    if (window.scrollY > 60) {
      nav.style.borderBottomColor = 'rgba(99,145,210,0.2)';
    } else {
      nav.style.borderBottomColor = '';
    }
  }

  /* ── Stagger hero on load ── */
  function staggerHero() {
    var els = document.querySelectorAll(
      '.hero-eyebrow, .hero-title, .hero-role, .hero-bio, .hero-cta, .hero-deco'
    );
    els.forEach(function (el, i) {
      el.style.transitionDelay = (i * 0.1) + 's';
      setTimeout(function () {
        el.classList.add('visible');
      }, 80 + i * 100);
    });
  }

  /* ── Smooth scroll for nav anchors ── */
  function bindAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var target = document.querySelector(a.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  /* ── Init ── */
  window.addEventListener('DOMContentLoaded', function () {
    collectReveal();
    collectNav();
    bindAnchors();
    staggerHero();
    checkReveal();
    updateNavBg();
    updateNav();
  });

  window.addEventListener('scroll', function () {
    checkReveal();
    updateNav();
    updateNavBg();
  }, { passive: true });

})();
