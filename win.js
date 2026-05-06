(function () {
  'use strict';

  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/info+competition@deepchill.co.uk';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var POSTCODE_RE = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }
    callback();
  }

  function initForm() {
    var form = document.getElementById('win-form');
    var success = document.getElementById('win-success');
    if (!form) return;

    function getField(name) {
      return form.querySelector('[name="' + name + '"]');
    }

    function getValue(name) {
      var field = getField(name);
      return field ? field.value.trim() : '';
    }

    function setError(element, message) {
      if (!element) return;
      var group = element.closest('.form-group');
      if (!group) return;
      element.classList.add('input-error');
      if (!group.querySelector('.field-error')) {
        var error = document.createElement('p');
        error.className = 'field-error';
        error.textContent = message;
        group.appendChild(error);
      }
    }

    function clearErrors() {
      Array.prototype.forEach.call(form.querySelectorAll('.input-error'), function (el) {
        el.classList.remove('input-error');
      });
      Array.prototype.forEach.call(form.querySelectorAll('.field-error, .form-error'), function (el) {
        el.remove();
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();

      var name     = getField('full_name');
      var email    = getField('email');
      var postcode = getField('postcode');
      var marketing = getField('marketing');
      var valid    = true;

      if (!getValue('full_name')) {
        setError(name, 'Please enter your full name.');
        valid = false;
      }

      var emailVal = getValue('email');
      if (!emailVal) {
        setError(email, 'Please enter your email address.');
        valid = false;
      } else if (!EMAIL_RE.test(emailVal)) {
        setError(email, 'Please enter a valid email address.');
        valid = false;
      }

      var postcodeVal = getValue('postcode');
      if (!postcodeVal) {
        setError(postcode, 'Please enter your postcode.');
        valid = false;
      } else if (!POSTCODE_RE.test(postcodeVal)) {
        setError(postcode, 'Please enter a valid UK postcode, e.g. RH6 0AA.');
        valid = false;
      } else {
        postcode.value = postcodeVal.toUpperCase();
      }

      if (!marketing.checked) {
        setError(marketing, 'Please tick to agree before entering.');
        valid = false;
      }

      if (!valid) {
        var firstErr = form.querySelector('.input-error');
        if (firstErr) firstErr.focus();
        return;
      }

      var btn = form.querySelector('.win-submit');
      btn.disabled = true;
      btn.textContent = 'Entering…';

      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: getValue('full_name'),
          email:     getValue('email'),
          postcode:  getValue('postcode'),
          phone:     getValue('phone'),
          marketing: 'yes',
          _subject:  'New Prize Draw Entry'
        })
      })
      .then(function (res) {
        if (res.ok) {
          form.style.display = 'none';
          success.style.display = 'block';
        } else {
          btn.disabled = false;
          btn.textContent = 'Enter Prize Draw';
          var err = document.createElement('p');
          err.className = 'form-error';
          err.textContent = 'Something went wrong. Please try again.';
          form.querySelector('.win-submit').parentNode.insertBefore(err, form.querySelector('.win-submit'));
        }
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Enter Prize Draw';
        var err = document.createElement('p');
        err.className = 'form-error';
        err.textContent = 'Something went wrong. Please try again.';
        form.querySelector('.win-submit').parentNode.insertBefore(err, form.querySelector('.win-submit'));
      });
    });
  }

  ready(initForm);
}());
