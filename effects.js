(function () {

  function init() {

    /* ══════════════════════════════════
       1. TILT 3D — project-card e skill-group
    ══════════════════════════════════ */
    var tiltEls = document.querySelectorAll('.project-card, .skill-group, .info-card');

    tiltEls.forEach(function (card) {
      card.style.willChange = 'transform';
      card.style.transition = 'transform .15s ease, box-shadow .15s ease';

      card.addEventListener('mousemove', function (e) {
        var r  = card.getBoundingClientRect();
        var cx = r.left + r.width  / 2;
        var cy = r.top  + r.height / 2;
        var dx = (e.clientX - cx) / (r.width  / 2);
        var dy = (e.clientY - cy) / (r.height / 2);
        var rx = -dy * 10;
        var ry =  dx * 10;
        card.style.transition = 'transform .08s linear, box-shadow .08s linear';
        card.style.transform  = 'perspective(700px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale(1.03)';
        card.style.boxShadow  = '0 12px 40px rgba(74,143,212,0.18)';
      });

      card.addEventListener('mouseleave', function () {
        card.style.transition = 'transform .5s cubic-bezier(.23,1,.32,1), box-shadow .5s ease';
        card.style.transform  = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)';
        card.style.boxShadow  = '';
      });
    });

    /* ══════════════════════════════════
       2. ATRAÇÃO MAGNÉTICA — botões
    ══════════════════════════════════ */
    var PULL   = 0.38;
    var RADIUS = 100;

    var magnetEls = document.querySelectorAll('.btn-primary, .btn-ghost, .overlay-link, .contact-email');

    magnetEls.forEach(function (btn) {
      btn.style.willChange  = 'transform';
      btn.style.display     = btn.style.display || 'inline-flex';
      btn.style.transition  = 'transform .1s linear';

      btn.addEventListener('mousemove', function (e) {
        var r  = btn.getBoundingClientRect();
        var cx = r.left + r.width  / 2;
        var cy = r.top  + r.height / 2;
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        var d  = Math.sqrt(dx * dx + dy * dy);
        if (d < RADIUS) {
          btn.style.transition = 'transform .1s linear';
          btn.style.transform  = 'translate(' + (dx * PULL) + 'px, ' + (dy * PULL) + 'px)';
        }
      });

      btn.addEventListener('mouseleave', function () {
        btn.style.transition = 'transform .6s cubic-bezier(.23,1,.32,1)';
        btn.style.transform  = 'translate(0px, 0px)';
      });
    });

  }

  /* Aguarda o DOM estar pronto */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
