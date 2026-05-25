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

  initWordFade();
  initBenefitsCarousel();
})();
