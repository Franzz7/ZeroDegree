(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initWordFade() {
    var element = document.querySelector('.promise-section-label');
    if (!element) return;

    var words = element.textContent.trim().split(/\s+/);
    element.textContent = '';

    words.forEach(function (word, index) {
      if (index > 0) element.appendChild(document.createTextNode(' '));
      var span = document.createElement('span');
      span.className = 'wf';
      span.textContent = word;
      element.appendChild(span);
    });

    var spans = Array.from(element.querySelectorAll('.wf'));

    function revealWords() {
      spans.forEach(function (span, index) {
        span.style.transitionDelay = (index * 0.18) + 's';
        span.classList.add('wf-in');
      });
    }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealWords();
      return;
    }

    new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealWords();
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.4 }).observe(element);
  }

  function initHeroTyper() {
    var el = document.querySelector('.hero-sub');
    if (!el) return;

    var text = el.textContent.trim();
    el.textContent = '';
    el.style.opacity  = '1';
    el.style.animation = 'none';

    var cursor = document.createElement('span');
    cursor.className = 'hero-typer-cursor';
    el.appendChild(cursor);

    if (reduceMotion) {
      el.textContent = text;
      return;
    }

    var i = 0;
    setTimeout(function () {
      function tick() {
        if (i >= text.length) {
          setTimeout(function () {
            if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
          }, 1200);
          return;
        }
        el.insertBefore(document.createTextNode(text[i]), cursor);
        i++;
        setTimeout(tick, 36);
      }
      tick();
    }, 850);
  }

  initWordFade();
  initHeroTyper();
})();
