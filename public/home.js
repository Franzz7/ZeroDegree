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

    var heightPending = false;

    function syncTrackHeight() {
      if (!track) return;

      var maxHeight = 0;
      cards.forEach(function (card) {
        maxHeight = Math.max(maxHeight, card.scrollHeight);
      });

      if (maxHeight > 0) track.style.minHeight = maxHeight + 'px';
    }

    // Reading scrollHeight forces a synchronous layout, so coalesce the bursts
    // of resize events into one measurement per frame.
    function requestHeightSync() {
      if (heightPending) return;
      heightPending = true;
      window.requestAnimationFrame(function () {
        heightPending = false;
        syncTrackHeight();
      });
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

    window.addEventListener('resize', requestHeightSync, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });
  }

  // Types the hero subtitle out character by character.
  //
  // Driven by requestAnimationFrame rather than a chain of ~120 setTimeouts:
  // the visual result is identical, but the work is frame-aligned, catches up
  // in a single batch after a dropped frame, and pauses automatically while the
  // tab is in the background. It also writes into one text node instead of
  // appending a new one per character, which keeps the DOM flat.
  var TYPE_MS_PER_CHAR = 36;
  var TYPE_START_DELAY = 850;
  var CURSOR_LINGER = 1200;

  function initHeroTyper() {
    var el = document.querySelector('.hero-sub');
    if (!el) return;

    var text = el.textContent.trim();
    el.textContent = '';
    el.style.opacity = '1';
    el.style.animation = 'none';

    var cursor = document.createElement('span');
    cursor.className = 'hero-typer-cursor';

    if (reduceMotion) {
      el.textContent = text;
      return;
    }

    var node = document.createTextNode('');
    el.appendChild(node);
    el.appendChild(cursor);

    var start = 0;
    var shown = 0;

    function frame(now) {
      if (!start) start = now;

      var target = Math.min(text.length, Math.floor((now - start) / TYPE_MS_PER_CHAR));
      if (target !== shown) {
        shown = target;
        node.nodeValue = text.slice(0, shown);
      }

      if (shown < text.length) {
        window.requestAnimationFrame(frame);
        return;
      }

      window.setTimeout(function () {
        if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      }, CURSOR_LINGER);
    }

    window.setTimeout(function () {
      window.requestAnimationFrame(frame);
    }, TYPE_START_DELAY);
  }

  initWordFade();
  initBenefitsCarousel();
  initHeroTyper();
})();
