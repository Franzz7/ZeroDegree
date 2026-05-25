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

  function initBenefitsCarousel() {
    var track = document.getElementById('testi-track');
    var cards = Array.from(document.querySelectorAll('#testi-track .testi-card'));
    var progressFill = document.getElementById('testi-progress-fill');
    var total = cards.length;
    var current = 0;
    var intervalId;

    if (!total) return;

    function syncTrackHeight() {
      if (!track) return;

      var maxHeight = 0;
      cards.forEach(function (card) {
        maxHeight = Math.max(maxHeight, card.scrollHeight);
      });

      if (maxHeight > 0) track.style.minHeight = maxHeight + 'px';
    }

    function resetProgress() {
      if (!progressFill || reduceMotion) return;
      progressFill.style.animation = 'none';
      void progressFill.offsetWidth;
      progressFill.style.animation = '';
    }

    function show(index) {
      current = ((index % total) + total) % total;
      var left = (current - 1 + total) % total;
      var right = (current + 1) % total;

      cards.forEach(function (card, cardIndex) {
        card.classList.toggle('is-left', cardIndex === left);
        card.classList.toggle('is-active', cardIndex === current);
        card.classList.toggle('is-right', cardIndex === right);
      });

      resetProgress();
    }

    function start() {
      if (reduceMotion || intervalId) return;
      intervalId = window.setInterval(function () {
        show(current + 1);
      }, 10000);
    }

    function stop() {
      if (!intervalId) return;
      window.clearInterval(intervalId);
      intervalId = null;
    }

    show(0);
    syncTrackHeight();
    start();

    window.addEventListener('resize', syncTrackHeight, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });
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
  initBenefitsCarousel();
  initHeroTyper();
})();
