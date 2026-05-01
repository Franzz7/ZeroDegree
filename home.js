(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }

    callback();
  }

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

    var spans = Array.prototype.slice.call(element.querySelectorAll('.wf'));

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

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        revealWords();
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    observer.observe(element);
  }

  function initTypewriter() {
    var element = document.querySelector('.hero-sub');
    if (!element || reduceMotion) return;

    var fullText = element.textContent.trim();
    var cursor = document.createElement('span');
    var index = 0;

    element.textContent = '';
    cursor.className = 'type-cursor';
    element.appendChild(cursor);

    function typeNextCharacter() {
      if (index >= fullText.length) {
        cursor.classList.add('done');
        return;
      }

      cursor.insertAdjacentText('beforebegin', fullText[index]);
      index += 1;
      window.setTimeout(typeNextCharacter, index === 1 ? 0 : 45);
    }

    window.setTimeout(typeNextCharacter, 800);
  }

  function initMobileIconAnimation() {
    if (reduceMotion || window.innerWidth > 900) return;

    var items = Array.prototype.slice.call(document.querySelectorAll('.promise-item'));
    var lastIndex = -1;
    if (!items.length) return;

    window.setInterval(function () {
      var index;

      items.forEach(function (element) {
        element.classList.remove('is-playing');
      });

      do {
        index = Math.floor(Math.random() * items.length);
      } while (items.length > 1 && index === lastIndex);

      lastIndex = index;
      items[index].classList.add('is-playing');
    }, 5000);
  }

  function initBenefitsCarousel() {
    var track = document.getElementById('testi-track');
    var cards = Array.prototype.slice.call(document.querySelectorAll('#testi-track .testi-card'));
    var N = cards.length;
    if (!N) return;
    var cur = 0;
    var progressFill = document.getElementById('testi-progress-fill');

    function syncTrackHeight() {
      if (!track) return;
      var maxH = 0;
      cards.forEach(function (c) { if (c.scrollHeight > maxH) maxH = c.scrollHeight; });
      if (maxH > 0) track.style.minHeight = maxH + 'px';
    }

    function resetProgress() {
      if (!progressFill) return;
      progressFill.style.animation = 'none';
      void progressFill.offsetWidth;
      progressFill.style.animation = '';
    }

    function show(i) {
      cur = ((i % N) + N) % N;
      var l = ((cur - 1 + N) % N);
      var r = (cur + 1) % N;
      cards.forEach(function (c, idx) {
        c.classList.toggle('is-left',   idx === l);
        c.classList.toggle('is-active', idx === cur);
        c.classList.toggle('is-right',  idx === r);
      });
      resetProgress();
    }

    show(0);
    syncTrackHeight();
    window.setInterval(function () { show(cur + 1); }, 10000);
  }

  ready(function () {
    initWordFade();
    initTypewriter();
    initMobileIconAnimation();
    initBenefitsCarousel();
  });
})();
