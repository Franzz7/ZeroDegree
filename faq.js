(function () {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }

    callback();
  }

  ready(function () {
    var input = document.getElementById('faqSearch');
    var list = document.getElementById('faqList');
    var noMatch = document.getElementById('faqNoMatch');
    if (!input || !list) return;

    var items = Array.prototype.slice.call(list.querySelectorAll('.faq-item'));

    input.addEventListener('input', function () {
      var query = input.value.trim().toLowerCase();
      var hasMatch = false;

      items.forEach(function (item) {
        var matches = !query || item.textContent.toLowerCase().indexOf(query) !== -1;
        item.style.display = matches ? '' : 'none';
        if (matches) hasMatch = true;
      });

      if (noMatch) noMatch.style.display = query && !hasMatch ? 'block' : '';
    });
  });
})();
