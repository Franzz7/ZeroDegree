(function () {
  'use strict';

  var FORM_ENDPOINT = '/.netlify/functions/submit-enquiry';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var ENQUIRY_TYPES = ['home', 'promo-event', 'event', 'gym', 'production', 'partnership', 'general'];
  var HIDE_REFERRAL_FOR = ['partnership', 'general'];

  function initEnquiryTypePreselect() {
    var type = new URLSearchParams(window.location.search).get('type');
    if (ENQUIRY_TYPES.indexOf(type) === -1) return;
    var radio = document.querySelector('input[name="enquiry_type"][value="' + type + '"]');
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function initForm() {
    var form = document.getElementById('enquiry-form');
    if (!form) return;

    var formLoadedAt = Date.now();
    var typeGroups = Array.prototype.slice.call(form.querySelectorAll('[data-group]'));
    var referralGroup = document.getElementById('referral-group');

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
      form.querySelectorAll('.input-error').forEach(function (el) {
        el.classList.remove('input-error');
      });
      form.querySelectorAll('.field-error, .form-error, .form-ineligible').forEach(function (el) {
        el.remove();
      });
    }

    function clearGroupErrors(element) {
      var group = getFieldGroup(element);
      if (!group) return;
      element.classList.remove('input-error');
      group.querySelectorAll('.field-error').forEach(function (el) { el.remove(); });
      group.querySelectorAll('.form-option-group, .form-checkbox-group').forEach(function (el) {
        el.classList.remove('input-error');
      });
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

    function updateEnquiryTypeFields() {
      var enquiryType = form.querySelector('input[name="enquiry_type"]:checked');
      var value = enquiryType ? enquiryType.value : '';

      typeGroups.forEach(function (group) {
        group.hidden = group.getAttribute('data-group') !== value;
      });

      if (referralGroup) {
        referralGroup.hidden = HIDE_REFERRAL_FOR.indexOf(value) !== -1;
      }
    }

    function validate() {
      var firstError = null;
      var name = getField('name');
      var phone = getField('phone');
      var email = getField('email');
      var postcode = getField('postcode');
      var enquiryType = form.querySelector('input[name="enquiry_type"]:checked');
      var postcodeValue = getValue('postcode');

      if (!enquiryType) firstError = firstError || setRadioError('enquiry_type', 'Please select what you\'re enquiring about.');
      if (!getValue('name')) {
        setError(name, 'Please enter your full name.');
        firstError = firstError || name;
      }
      if (!getValue('phone')) {
        setError(phone, 'Please enter your telephone number.');
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
        setError(postcode, 'Please enter the installation or event location.');
        firstError = firstError || postcode;
      }

      var required = Array.prototype.slice.call(form.querySelectorAll('[data-required]'));
      required.forEach(function (el) {
        if (el.closest('[hidden]')) return;

        var isOptionGroup = el.classList.contains('form-option-group');
        var isCheckboxGroup = el.classList.contains('form-checkbox-group');
        var filled;

        if (isOptionGroup) {
          filled = !!el.querySelector('input[type="radio"]:checked');
        } else if (isCheckboxGroup) {
          var checkbox = el.querySelector('input[type="checkbox"]');
          filled = !!(checkbox && checkbox.checked);
        } else {
          filled = !!(el.value && el.value.trim());
        }

        if (!filled) {
          var message = el.getAttribute('data-required-message') ||
            (isOptionGroup || isCheckboxGroup ? 'Please select an option.' : 'Please complete this field.');
          setError(el, message);
          firstError = firstError || el;
        }
      });

      return { firstError: firstError };
    }

    function showSuccess() {
      form.innerHTML =
        '<div class="form-success">' +
          '<h3>Thank you for your enquiry.</h3>' +
          "<p>We've received your details and will respond as soon as possible.</p>" +
          '<p>If your enquiry is urgent, you can also contact us by <a href="tel:+447363087890">telephone</a> or <a href="https://wa.me/447363087890" target="_blank" rel="noopener">WhatsApp</a>.</p>' +
        '</div>';
      window.scrollTo({ top: form.parentElement.offsetTop - 100, behavior: 'smooth' });
    }

    function collectPayload() {
      var enquiryType = (form.querySelector('input[name="enquiry_type"]:checked') || {}).value || '';
      var privacyField = getField('privacy_ack');

      var payload = {
        name: getValue('name'),
        phone: getValue('phone'),
        email: getValue('email'),
        postcode: getValue('postcode'),
        enquiry_type: enquiryType,
        referral_code: getValue('referral_code'),
        privacy_ack: !!(privacyField && privacyField.checked),
        website: getValue('website'),
        form_loaded_at: formLoadedAt
      };

      var activeGroup = form.querySelector('[data-group="' + enquiryType + '"]');
      if (activeGroup) {
        Array.prototype.slice.call(activeGroup.querySelectorAll('input, select, textarea')).forEach(function (field) {
          if (!field.name) return;
          if (field.type === 'radio') {
            if (field.checked) payload[field.name] = field.value;
          } else {
            payload[field.name] = field.value.trim();
          }
        });
      }

      return payload;
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
        return response.json()
          .catch(function () { return {}; })
          .then(function (data) {
            var message = data.errors
              ? data.errors.map(function (e) { return e.message; }).join(', ')
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

    form.querySelectorAll('input[name="enquiry_type"]').forEach(function (radio) {
      radio.addEventListener('change', updateEnquiryTypeFields);
    });

    form.querySelectorAll('input, select, textarea').forEach(function (element) {
      element.addEventListener('input', function () { clearGroupErrors(element); });
      element.addEventListener('change', function () { clearGroupErrors(element); });
    });

    updateEnquiryTypeFields();
  }

  initEnquiryTypePreselect();
  initForm();
})();
