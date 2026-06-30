(function () {
  var screen = document.getElementById('boot-screen');
  var title  = document.getElementById('hero-title');
  var sub    = document.getElementById('hero-sub');
  var video  = document.getElementById('hero-video');
  var drag   = document.getElementById('drag-section');

  if (!screen) return;

  setTimeout(function () {
    screen.classList.add('hidden');
    setTimeout(function () { screen.remove(); }, 700);
  }, 1700);

  setTimeout(function () {
    if (title) title.classList.add('fade-in');
  }, 2300);

  setTimeout(function () {
    if (sub) sub.classList.add('fade-in');
  }, 3400);

  setTimeout(function () {
    if (video) video.classList.add('fade-in');
  }, 4300);

  setTimeout(function () {
    if (drag) drag.classList.add('fade-in');
  }, 5300);
})();
