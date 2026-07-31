(function () {
  'use strict';

  var FORM_ENDPOINT = '/.netlify/functions/submit-enquiry';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var INTEREST_VALUES = ['home', 'event', 'gym', 'production', 'other'];
  var INTEREST_ALIASES = {
    'promo-event': 'event',
    'partnership': 'other',
    'general': 'other'
  };

  function initInterestPreselect(select) {
    var type = new URLSearchParams(window.location.search).get('type');
    if (!type) return;
    var value = INTEREST_VALUES.indexOf(type) !== -1 ? type : INTEREST_ALIASES[type];
    if (!value) return;
    select.value = value;
  }

  function initForm() {
    var form = document.getElementById('enquiry-form');
    if (!form) return;

    var formLoadedAt = Date.now();

    function getField(name) {
      return form.querySelector('[name="' + name + '"]');
    }

    function getValue(name) {
      var field = getField(name);
      return field ? field.value.trim() : '';
    }

    function setError(element, message) {
      var group = element && element.closest('.form-group');
      if (!element || !group) return;
      element.classList.add('input-error');
      if (!group.querySelector('.field-error')) {
        var error = document.createElement('p');
        error.className = 'field-error';
        error.textContent = message;
        group.appendChild(error);
      }
    }

    function clearErrors() {
      form.querySelectorAll('.input-error').forEach(function (el) {
        el.classList.remove('input-error');
      });
      form.querySelectorAll('.field-error, .form-error').forEach(function (el) {
        el.remove();
      });
    }

    function clearFieldError(element) {
      var group = element.closest('.form-group');
      if (!group) return;
      element.classList.remove('input-error');
      group.querySelectorAll('.field-error').forEach(function (el) { el.remove(); });
    }

    function showFormError(message) {
      var submit = form.querySelector('.form-submit');
      if (!submit) return;
      var existing = form.querySelector('.form-error');
      if (existing) existing.remove();
      var error = document.createElement('p');
      error.className = 'form-error';
      error.textContent = message;
      submit.appendChild(error);
    }

    function validate() {
      var firstError = null;
      var name = getField('name');
      var phone = getField('phone');
      var email = getField('email');
      var interest = getField('interest');
      var postcode = getField('postcode');

      if (!getValue('name')) {
        setError(name, 'Please enter your name.');
        firstError = firstError || name;
      }
      if (!getValue('phone')) {
        setError(phone, 'Please enter your phone number.');
        firstError = firstError || phone;
      }
      if (!getValue('email')) {
        setError(email, 'Please enter your email address.');
        firstError = firstError || email;
      } else if (!EMAIL_RE.test(getValue('email'))) {
        setError(email, 'Please enter a valid email address, for example name@example.com.');
        firstError = firstError || email;
      }
      if (!getValue('interest')) {
        setError(interest, 'Please let us know what you\'re interested in.');
        firstError = firstError || interest;
      }
      if (!getValue('postcode')) {
        setError(postcode, 'Please enter your town or postcode.');
        firstError = firstError || postcode;
      }

      return { firstError: firstError };
    }

    function showSuccess() {
      form.innerHTML =
        '<div class="form-success">' +
          '<h3>Thank you for your enquiry.</h3>' +
          "<p>We've received your details and will be in touch shortly to confirm availability and pricing.</p>" +
          '<p>If your enquiry is urgent, you can also contact us by <a href="tel:+447363087890">telephone</a> or <a href="https://wa.me/447363087890" target="_blank" rel="noopener">WhatsApp</a>.</p>' +
        '</div>';
      window.scrollTo({ top: form.parentElement.offsetTop - 100, behavior: 'smooth' });
    }

    function collectPayload() {
      return {
        name: getValue('name'),
        phone: getValue('phone'),
        email: getValue('email'),
        interest: getValue('interest'),
        postcode: getValue('postcode'),
        preferred_date: getValue('preferred_date'),
        message: getValue('message'),
        website: getValue('website'),
        form_loaded_at: formLoadedAt
      };
    }

    function submitForm(button) {
      var originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending...';

      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(collectPayload())
      })
      .then(function (response) {
        if (response.ok) { showSuccess(); return; }
        throw new Error('Submission failed.');
      })
      .catch(function () {
        button.disabled = false;
        button.textContent = originalText;
        showFormError('Something went wrong. Please try again or email us at info@deepchill.co.uk.');
      });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearErrors();
      var result = validate();
      if (result.firstError) {
        result.firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      var button = form.querySelector('button[type="submit"]');
      if (button) submitForm(button);
    });

    form.querySelectorAll('input, select, textarea').forEach(function (element) {
      element.addEventListener('input', function () { clearFieldError(element); });
      element.addEventListener('change', function () { clearFieldError(element); });
    });

    var interestSelect = getField('interest');
    if (interestSelect) initInterestPreselect(interestSelect);
  }

  initForm();
})();
