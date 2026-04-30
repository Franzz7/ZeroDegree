(function () {
  'use strict';

  var FORM_ENDPOINT = 'https://formspree.io/f/xqeweroq';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var POSTCODE_RE = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }

    callback();
  }

  function removeElements(elements) {
    Array.prototype.forEach.call(elements, function (element) {
      element.remove();
    });
  }

  function initPackagePreselect() {
    var select = document.getElementById('package');
    if (!select) return;

    var packageName = new URLSearchParams(window.location.search).get('package');
    if (packageName) select.value = packageName;
  }

  function initForm() {
    var form = document.getElementById('enquiry-form');
    if (!form) return;

    function getField(name) {
      return form.querySelector('[name="' + name + '"]');
    }

    function getValue(name) {
      var field = getField(name);
      return field ? field.value.trim() : '';
    }

    function getFieldGroup(element) {
      return element && (element.closest('.form-group') || element.closest('.form-option-group'));
    }

    function setError(element, message) {
      var group = getFieldGroup(element);
      if (!element || !group) return;

      element.classList.add('input-error');

      if (!group.querySelector('.field-error')) {
        var error = document.createElement('p');
        error.className = 'field-error';
        error.textContent = message;
        group.appendChild(error);
      }
    }

    function setRadioError(name, message) {
      var firstRadio = getField(name);
      var group = getFieldGroup(firstRadio);
      if (!group) return null;

      var options = group.querySelector('.form-option-group');
      if (options) options.classList.add('input-error');

      if (!group.querySelector('.field-error')) {
        var error = document.createElement('p');
        error.className = 'field-error';
        error.textContent = message;
        group.appendChild(error);
      }

      return group;
    }

    function clearErrors() {
      Array.prototype.forEach.call(form.querySelectorAll('.input-error'), function (element) {
        element.classList.remove('input-error');
      });
      removeElements(form.querySelectorAll('.field-error, .form-error, .form-ineligible'));
    }

    function clearGroupErrors(element) {
      var group = getFieldGroup(element);
      if (!group) return;

      element.classList.remove('input-error');
      removeElements(group.querySelectorAll('.field-error'));

      var options = group.querySelector('.form-option-group');
      if (options) options.classList.remove('input-error');
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
      var postcode = getField('postcode');
      var tap = form.querySelector('input[name="outdoor_tap"]:checked');
      var power = form.querySelector('input[name="outdoor_power"]:checked');
      var postcodeValue = getValue('postcode');

      if (!getValue('name')) {
        setError(name, 'Please enter your full name.');
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

      if (!postcodeValue) {
        setError(postcode, 'Please enter your postcode.');
        firstError = firstError || postcode;
      } else if (!POSTCODE_RE.test(postcodeValue)) {
        setError(postcode, 'Please enter a valid UK postcode, for example RH1 1AA.');
        firstError = firstError || postcode;
      } else {
        postcode.value = postcodeValue.toUpperCase();
      }

      if (!tap) {
        firstError = firstError || setRadioError('outdoor_tap', 'Please select Yes or No.');
      }

      if (!power) {
        firstError = firstError || setRadioError('outdoor_power', 'Please select Yes or No.');
      }

      return {
        firstError: firstError,
        tap: tap,
        power: power
      };
    }

    function showEligibilityNotice() {
      var notice = document.createElement('div');
      notice.className = 'form-ineligible';
      notice.innerHTML = "<p><strong>Sorry, you don't meet the requirements.</strong> Both an outdoor tap and an outdoor power socket are needed to install and run the chiller. If you're planning to add these, feel free to <a href='mailto:info@deepchill.co.uk'>email us</a> and we can help.</p>";

      var submit = form.querySelector('.form-submit');
      if (submit) submit.before(notice);
      notice.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function showSuccess() {
      form.innerHTML =
        '<div class="form-success">' +
          '<h3>Thanks for your enquiry.</h3>' +
          "<p>We'll be in touch within one business day.</p>" +
        '</div>';

      window.scrollTo({
        top: form.parentElement.offsetTop - 100,
        behavior: 'smooth'
      });
    }

    function submitForm(button) {
      if (!window.fetch) {
        showFormError('Your browser could not send the form. Please email us at info@deepchill.co.uk.');
        return;
      }

      var originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending...';

      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      })
      .then(function (response) {
        if (response.ok) {
          showSuccess();
          return;
        }

        return response.json()
          .catch(function () { return {}; })
          .then(function (data) {
            var message = data.errors
              ? data.errors.map(function (error) { return error.message; }).join(', ')
              : 'Submission failed.';
            throw new Error(message);
          });
      })
      .catch(function () {
        button.disabled = false;
        button.textContent = originalText;
        showFormError('Something went wrong. Please try again or email us at info@deepchill.co.uk.');
      });
    }

    form.addEventListener('submit', function (event) {
      var result;
      var button;

      event.preventDefault();
      clearErrors();

      result = validate();
      if (result.firstError) {
        result.firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      if (result.tap.value === 'no' || result.power.value === 'no') {
        showEligibilityNotice();
        return;
      }

      button = form.querySelector('button[type="submit"]');
      if (button) submitForm(button);
    });

    Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea'), function (element) {
      element.addEventListener('input', function () {
        clearGroupErrors(element);
      });
      element.addEventListener('change', function () {
        clearGroupErrors(element);
      });
    });
  }

  ready(function () {
    initPackagePreselect();
    initForm();
  });
})();
