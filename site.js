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
    var bar = document.getElementById('scroll-progress');
    var header = document.querySelector('header');

    function update() {
      var page = document.documentElement;
      var maxScroll = page.scrollHeight - page.clientHeight;
      var progress = maxScroll > 0 ? (page.scrollTop / maxScroll) * 100 : 0;

      if (bar) bar.style.width = progress + '%';
      if (header) header.classList.toggle('scrolled', window.scrollY > 60);
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('main-nav');
    if (!toggle || !nav) return;

    if (nav.id) toggle.setAttribute('aria-controls', nav.id);

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('nav-open', open);
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
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
      '.product-card',
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

  function shouldSkipTransition(link) {
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#') return true;
    if (link.target && link.target !== '_self') return true;
    if (link.hasAttribute('download')) return true;

    var destination;
    try {
      destination = new URL(href, window.location.href);
    } catch (error) {
      return true;
    }

    if (destination.origin !== window.location.origin) return true;
    if (destination.protocol !== window.location.protocol) return true;

    var samePageHash =
      destination.pathname === window.location.pathname &&
      destination.search === window.location.search &&
      destination.hash;

    return Boolean(samePageHash);
  }

  function initPageTransitions() {
    if (reduceMotion) return;

    document.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      var link = event.target.closest('a[href]');
      if (!link || shouldSkipTransition(link)) return;

      event.preventDefault();
      document.body.classList.add('page-exit');

      window.setTimeout(function () {
        window.location.assign(link.href);
      }, 260);
    });

    window.addEventListener('pageshow', function (event) {
      if (event.persisted) document.body.classList.remove('page-exit');
    });
  }

  ready(function () {
    initScrollState();
    initMobileNav();
    initReveal();
    initPageTransitions();
  });
})();
