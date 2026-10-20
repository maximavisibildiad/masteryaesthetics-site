// Sends the home and contact forms to GoHighLevel (Inbound Webhook "MASTERY - Entrada sitio") without changing the
// visible form: the A2P consent block stays untouched.
(function () {
  var WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/CDWMBDDuWrhpV6P6QdqP/webhook-trigger/8a89e9bb-32a8-4d52-b423-2fb03d8fd698';
  var THANKS = 'Gracias. Te escribimos o te llamamos en breve para coordinar tu diagnóstico.';

  function utm(name) { return new URLSearchParams(location.search).get(name) || ''; }

  function cookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  // Accepts any US format ((555) 123-4567, 555.123.4567, +1 555 123 4567) and returns E.164 (+15551234567), or '' if invalid.
  function toE164(raw) {
    var d = (raw || '').replace(/\D/g, '');
    if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
    return d.length === 10 ? '+1' + d : '';
  }

  // Shows the error right under the field instead of at the bottom of the form.
  function fieldError(input, text) {
    var holder = input.parentNode;
    var err = holder.querySelector('.form-err');
    if (!text) { if (err) err.remove(); return; }
    if (!err) { err = document.createElement('p'); err.className = 'form-err'; err.style.cssText = 'color:#C62828;font-size:13px;margin:6px 0 0;'; holder.appendChild(err); }
    err.textContent = text;
  }

  function consentText(input) {
    var p = input && input.parentNode.querySelector('p');
    return p ? p.textContent.trim() : '';
  }

  function send(payload) {
    return fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function () {
      // Fallback if the browser blocks the JSON request (CORS): simple form-encoded POST.
      return fetch(WEBHOOK_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(payload) });
    });
  }

  document.querySelectorAll('form.f').forEach(function (form) {
    // Hidden trap field: people never see it, bots fill it. A non-semantic name keeps browser autofill out of it, and a
    // filled trap only flags the lead (spam_trap = yes) instead of dropping it, so a real person is never lost.
    var trap = document.createElement('input');
    trap.type = 'text'; trap.name = 'hp_x7k'; trap.tabIndex = -1; trap.autocomplete = 'off';
    trap.setAttribute('aria-hidden', 'true');
    trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';
    form.appendChild(trap);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var field = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      var name = field('nombre');
      if (!name) return;
      var tel = form.querySelector('[name="telefono"]');
      var phone = toE164(field('telefono'));
      if (!phone) {
        if (tel) { fieldError(tel, 'Escribe un teléfono de EE.UU. de 10 dígitos, por ejemplo (555) 123-4567.'); tel.focus(); }
        return;
      }
      if (tel) fieldError(tel, '');
      var parts = name.split(/\s+/);
      var nonMkt = form.querySelector('[name="consent_nonmarketing"]');
      var mkt = form.querySelector('[name="consent_marketing"]');
      var revenue = field('facturacion_mensual') || field('facturacion');

      var payload = {
        name: name,
        first_name: parts[0],
        last_name: parts.slice(1).join(' '),
        phone: phone,
        email: field('correo'),
        clinic_name: '',
        clinic_type: field('tipo_clinica'),
        monthly_revenue: revenue,
        qualifies_10k: revenue ? (revenue !== 'menos_10k' ? 'yes' : 'no') : '',
        spam_trap: trap.value ? 'yes' : 'no',
        message: field('mensaje'),
        state: field('estado').toUpperCase(),
        country: 'US',
        language: document.documentElement.lang || 'es',
        consent_nonmarketing: nonMkt && nonMkt.checked ? 'yes' : 'no',
        consent_marketing: mkt && mkt.checked ? 'yes' : 'no',
        consent_timestamp: new Date().toISOString(),
        consent_text_nonmarketing: consentText(nonMkt),
        consent_text_marketing: consentText(mkt),
        lead_form: location.pathname.indexOf('contact') >= 0 ? 'contact_page' : 'home_form',
        page_url: location.href,
        utm_source: utm('utm_source'),
        utm_medium: utm('utm_medium'),
        utm_campaign: utm('utm_campaign'),
        utm_content: utm('utm_content'),
        fbclid: utm('fbclid'),
        event_id: 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10),
        event_time: String(Math.floor(Date.now() / 1000)),
        fbp: cookie('_fbp'),
        fbc: cookie('_fbc') || (utm('fbclid') ? 'fb.1.' + Date.now() + '.' + utm('fbclid') : ''),
        client_user_agent: navigator.userAgent
      };

      var button = form.querySelector('button[type="submit"]');
      if (button) { button.disabled = true; button.textContent = 'Enviando...'; }
      if (window.fbq) fbq('track', 'Lead', { content_name: payload.clinic_type || 'diagnostico' }, { eventID: payload.event_id });
      send(payload).finally(function () {
        var msg = document.createElement('p');
        msg.className = 'form-thanks';
        msg.textContent = THANKS;
        form.replaceWith(msg);
      });
    });
  });
})();
