(function () {
  'use strict';

  var FORM_ENDPOINT = '/.netlify/functions/submit-enquiry';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var ENQUIRY_TYPES = ['home', 'promo-event', 'event', 'gym', 'production', 'partnership', 'general'];
  var BOOKING_TYPES = ['promo-event', 'event', 'gym', 'production'];

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
    var bookingFieldGroups = Array.prototype.slice.call(form.querySelectorAll('[data-booking-fields]'));

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

    function updateBookingFieldsVisibility() {
      var enquiryType = form.querySelector('input[name="enquiry_type"]:checked');
      var showBooking = !!enquiryType && BOOKING_TYPES.indexOf(enquiryType.value) !== -1;
      bookingFieldGroups.forEach(function (group) {
        group.hidden = !showBooking;
      });
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
        setError(postcode, 'Please enter an address, postcode or location.');
        firstError = firstError || postcode;
      }

      return { firstError: firstError };
    }

    function showSuccess() {
      form.innerHTML =
        '<div class="form-success">' +
          '<h3>Thanks for your enquiry.</h3>' +
          "<p>We've received your details and will confirm availability or respond as soon as possible.</p>" +
        '</div>';
      window.scrollTo({ top: form.parentElement.offsetTop - 100, behavior: 'smooth' });
    }

    function submitForm(button) {
      var originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending...';

      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:                 getValue('name'),
          business:             getValue('business'),
          phone:                getValue('phone'),
          email:                getValue('email'),
          postcode:             getValue('postcode'),
          enquiry_type:         (form.querySelector('input[name="enquiry_type"]:checked') || {}).value || '',
          event_date:           getValue('event_date'),
          start_time:           getValue('start_time'),
          finish_time:          getValue('finish_time'),
          setups:               getValue('setups'),
          access_power:         getValue('access_power'),
          access_water:         getValue('access_water'),
          access_drainage:      getValue('access_drainage'),
          installation_location: (form.querySelector('input[name="installation_location"]:checked') || {}).value || '',
          referral_code:        getValue('referral_code'),
          message:              getValue('message'),
          website:              getValue('website'),
          form_loaded_at:       formLoadedAt
        })
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
      radio.addEventListener('change', updateBookingFieldsVisibility);
    });

    form.querySelectorAll('input, select, textarea').forEach(function (element) {
      element.addEventListener('input', function () { clearGroupErrors(element); });
      element.addEventListener('change', function () { clearGroupErrors(element); });
    });

    updateBookingFieldsVisibility();
  }

  initEnquiryTypePreselect();
  initForm();
})();
