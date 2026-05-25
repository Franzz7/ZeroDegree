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

  function initScrollState() {
    var header = document.querySelector('header');
    var ticking = false;
    var isScrolled = false;

    function update() {
      ticking = false;
      if (!header) return;

      var next = window.scrollY > 60;
      if (next === isScrolled) return;

      isScrolled = next;
      header.classList.toggle('scrolled', isScrolled);
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
  }

  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('main-nav');
    if (!toggle || !nav) return;

    if (nav.id) toggle.setAttribute('aria-controls', nav.id);

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('nav-open', open);
      document.body.classList.toggle('nav-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (event) {
      if (!event.target.closest('a')) return;
      setOpen(false);
    });

    document.addEventListener('click', function (event) {
      if (!nav.classList.contains('nav-open')) return;
      if (nav.contains(event.target) || toggle.contains(event.target)) return;
      setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  function initReveal() {
    var selector = [
      '.s-reveal',
      '.reveal-item',
      '.reveal',
      '.step',
      '.faq-item',
      '.ben-card'
    ].join(',');
    var targets = Array.prototype.slice.call(document.querySelectorAll(selector));

    if (!targets.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (element) {
        element.classList.add('visible');
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });

    targets.forEach(function (element) {
      observer.observe(element);
    });
  }

  ready(function () {
    initScrollState();
    initMobileNav();
    initReveal();
  });
})();
