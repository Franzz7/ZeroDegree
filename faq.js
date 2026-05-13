(function () {
  'use strict';

  var INITIAL_VISIBLE = 5;

  var input = document.getElementById('faqSearch');
  var list = document.getElementById('faqList');
  var noMatch = document.getElementById('faqNoMatch');
  var showMoreWrap = document.getElementById('faqShowMore');
  var showMoreBtn = document.getElementById('faqShowMoreBtn');
  if (!input || !list) return;

  var items = Array.from(list.querySelectorAll('.faq-item'));
  var expanded = false;

  function applyState() {
    var query = input.value.trim().toLowerCase();
    var isSearching = query.length > 0;
    var matchCount = 0;

    items.forEach(function (item, i) {
      var textMatch = !query || item.textContent.toLowerCase().indexOf(query) !== -1;
      var show = textMatch && (isSearching || expanded || i < INITIAL_VISIBLE);
      item.style.display = show ? '' : 'none';
      if (textMatch) matchCount++;
    });

    if (noMatch) noMatch.style.display = (isSearching && matchCount === 0) ? 'block' : '';
    if (showMoreWrap) {
      showMoreWrap.style.display = (!isSearching && !expanded && items.length > INITIAL_VISIBLE) ? '' : 'none';
    }
  }

  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', function () {
      expanded = true;
      applyState();
    });
  }

  var safetyBody = document.querySelector('.safety-block-body');
  var safetyReadMore = document.querySelector('.safety-read-more');
  if (safetyBody && safetyReadMore) {
    safetyReadMore.addEventListener('click', function () {
      safetyBody.classList.add('expanded');
      safetyReadMore.setAttribute('aria-expanded', 'true');
    });
  }

  input.addEventListener('input', applyState);
  applyState();
})();
