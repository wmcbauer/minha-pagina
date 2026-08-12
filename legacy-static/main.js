// Nav muda de aparência ao rolar a página
window.addEventListener('scroll', function () {
  var nav = document.getElementById('nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
});
