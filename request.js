// Multi-step request flow (request.html) for clinic owners anywhere in the United States.
// Steps: treatment → challenge → city/state/web → GHL form "Form dco" in a pop-up window → thanks.
// The GHL form collects name, phone, email, ZIP, revenue, language, clinic name, specialty, notes and both consents.
// This page only asks what that form does not, and sends those answers to the same Inbound Webhook
// ("MASTERY - Entrada sitio") once the GHL form is submitted, using the phone and email the form reports back.
(function () {
  // GoHighLevel workflow "MASTERY - Entrada sitio" (Inbound Webhook). Unchanged.
  var WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/CDWMBDDuWrhpV6P6QdqP/webhook-trigger/8a89e9bb-32a8-4d52-b423-2fb03d8fd698';
  // Conversions API: GoHighLevel workflow "MASTERY - CAPI - Lead sitio" (empty until the Meta dataset exists).
  var CAPI_WEBHOOK_URL = '';


  // Treatments grouped by specialty. The specialty itself is asked by the GHL form.
  var TREATMENTS = {
    implantes: 'Implantes / All-on-4', diseno_sonrisa: 'Diseño de sonrisa / carillas', ortodoncia: 'Ortodoncia invisible',
    rellenos: 'Rellenos con ácido hialurónico', toxina: 'Toxina botulínica', perfilado: 'Perfilado / rinomodelación',
    lipo_bbl: 'Lipoescultura / BBL', mamoplastia: 'Mamoplastia', rinoplastia: 'Rinoplastia', abdominoplastia: 'Abdominoplastia',
    otro: 'Otro tratamiento'
  };
  var CHALLENGE = {
    pauta_bolsillo: 'Hoy la pauta sale de mi bolsillo y no puedo escalarla.',
    sin_sistema: 'No tengo un sistema para captar pacientes nuevos de forma constante.',
    pauta_no_rinde: 'Invierto en anuncios y no veo los resultados que espero.',
    leads_sin_atender: 'Me llegan mensajes de pacientes y no se atienden a tiempo.',
    pacientes_no_vuelven: 'Los pacientes no vuelven después del primer tratamiento.',
    no_seguro: 'No tengo claro qué está frenando el crecimiento y quiero un diagnóstico.'
  };
  var PROGRESS = { detail: 15, challenge: 40, location: 65, form: 90, thanks: 100 };

  var form = document.getElementById('flow');
  var state = { top_procedure: '', challenge: '' };
  var history = [];
  var current = 'detail';
  var sent = false;

  function $(id) { return document.getElementById(id); }
  function utm(name) { return new URLSearchParams(location.search).get(name) || ''; }

  function cookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  // One event_id per visit. It goes in the page URL so the GHL form's hidden field "event_id" picks it up
  // (the embed reads the parent page's query parameters), and the pixel Lead uses the same id.
  var params = new URLSearchParams(location.search);
  var EVENT_ID = params.get('event_id') || ('lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10));
  if (!params.get('event_id')) {
    params.set('event_id', EVENT_ID);
    try { window.history.replaceState(null, '', location.pathname + '?' + params.toString() + location.hash); } catch (e) {}
  }

  // SHA-256 hex of a value normalized as Meta requires; empty input stays empty.
  function sha256(value) {
    if (!value || !window.crypto || !crypto.subtle) return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }

  function metaUserData(p) {
    var digits = (p.phone || '').replace(/\D/g, '');
    if (digits.length === 10) digits = '1' + digits;
    var fields = {
      em: (p.email || '').toLowerCase(),
      ph: digits,
      fn: (p.first_name || '').toLowerCase(),
      ln: (p.last_name || '').toLowerCase(),
      ct: (p.city || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, ''),
      st: (p.state || '').toLowerCase(),
      country: 'us'
    };
    var keys = Object.keys(fields);
    return Promise.all(keys.map(function (k) { return sha256(fields[k]); })).then(function (hashes) {
      var out = {};
      keys.forEach(function (k, i) { out['meta_' + k] = hashes[i]; });
      return out;
    });
  }

  function show(step, push) {
    if (push !== false) history.push(current);
    form.querySelectorAll('.step').forEach(function (s) { s.classList.toggle('on', s.dataset.step === step); });
    current = step;
    $('bar').style.width = (PROGRESS[step] || 10) + '%';
    window.scrollTo(0, 0);
    if (step === 'form' && window.MasteryForm) MasteryForm.open();
    var first = form.querySelector('.step.on .field input');
    if (first) setTimeout(function () { first.focus(); }, 50);
  }
  function back() {
    var prev = history.pop();
    if (prev) show(prev, false);
  }

  // ---- Option lists ----
  function bindOpts(group) {
    group.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        group.querySelectorAll('.opt').forEach(function (o) { o.classList.remove('sel'); });
        b.classList.add('sel');
        state[group.dataset.group] = b.dataset.value;
        if (group.dataset.mode === 'auto') setTimeout(function () { next(); }, 180);
      });
    });
  }
  bindOpts(form.querySelector('[data-group="top_procedure"]'));
  bindOpts(form.querySelector('[data-group="challenge"]'));

  function treatmentText() {
    var own = $('own_words_2').value.trim();
    if (state.top_procedure && state.top_procedure !== 'otro') return TREATMENTS[state.top_procedure];
    return own || (state.top_procedure ? TREATMENTS.otro : '');
  }

  function projectLine() {
    var parts = [];
    var t = treatmentText();
    if (t) parts.push('Tratamiento de mayor valor: ' + t);
    var place = [$('city').value.trim(), $('state').value.trim().toUpperCase()].filter(Boolean).join(', ');
    if (place) parts.push(place);
    return parts.join(' · ');
  }

  function draftMessage() {
    var t = [];
    var proc = treatmentText();
    if (proc) t.push('Nuestro tratamiento de mayor valor es ' + proc.toLowerCase() + '.');
    if (CHALLENGE[state.challenge]) t.push(CHALLENGE[state.challenge]);
    var own = $('own_words_2').value.trim();
    if (own && state.top_procedure && state.top_procedure !== 'otro') t.push(own);
    t.push('Quiero agendar mi diagnóstico de crecimiento gratuito.');
    return t.join(' ');
  }

  function next() {
    if (current === 'detail') {
      if (!state.top_procedure && !$('own_words_2').value.trim()) return;
      return show('challenge');
    }
    if (current === 'challenge') {
      if (!state.challenge) return;
      return show('location');
    }
    if (current === 'location') {
      if (!$('city').value.trim() || !/^[A-Za-z]{2}$/.test($('state').value.trim())) {
        $('locationErr').textContent = 'Escribe la ciudad y el estado de tu clínica (2 letras, por ejemplo FL).';
        return;
      }
      $('locationErr').textContent = '';
      $('projectLine').textContent = projectLine();
      return show('form');
    }
  }

  $('state').addEventListener('input', function () { this.value = this.value.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase(); });
  $('own_words_2').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); next(); } });
  form.querySelectorAll('[data-next]').forEach(function (b) { b.addEventListener('click', next); });
  form.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', back); });
  form.addEventListener('submit', function (e) { e.preventDefault(); next(); });

  // ---- GHL form ----
  // The form opens in a pop-up window (form-modal.js, data-origen="request") when the lead reaches the last step.

  // After a submission the GHL form posts ["set-sticky-contacts", "_ud", "<contact JSON>", ...] to this page
  // (the form's sticky-contact feature). That JSON carries the phone and email the lead just typed.
  function findValue(obj, test) {
    if (!obj || typeof obj !== 'object') return '';
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      if (typeof v === 'string' && v && test(keys[i].toLowerCase())) return v;
    }
    for (var j = 0; j < keys.length; j++) {
      var inner = obj[keys[j]];
      if (inner && typeof inner === 'object') { var r = findValue(inner, test); if (r) return r; }
    }
    return '';
  }

  function contactFromGhl(raw) {
    var data = raw;
    if (typeof raw === 'string') { try { data = JSON.parse(raw); } catch (e) { return null; } }
    if (!data || typeof data !== 'object') return null;
    var phone = findValue(data, function (k) { return k === 'phone' || k.indexOf('phone') >= 0; });
    var email = findValue(data, function (k) { return k === 'email' || k.indexOf('email') >= 0; });
    if (!phone && !email) return null;
    var first = findValue(data, function (k) { return k === 'first_name' || k === 'firstname'; });
    var last = findValue(data, function (k) { return k === 'last_name' || k === 'lastname'; });
    var full = findValue(data, function (k) { return k === 'full_name' || k === 'fullname' || k === 'name'; });
    if (!first && full) { var p = full.trim().split(/\s+/); first = p[0]; last = last || p.slice(1).join(' '); }
    var digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
    return {
      phone: digits.length === 10 ? '+1' + digits : phone,
      email: email,
      first_name: first || '',
      last_name: last || '',
      name: (full || ((first || '') + ' ' + (last || ''))).trim()
    };
  }

  function post(url, payload) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function () {
      return fetch(url, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(payload) });
    });
  }

  // Only the answers this page asked, plus who they belong to. Fields the GHL form owns
  // (clinic name, specialty, revenue, ZIP, language, consents) are not sent, so they are never overwritten with blanks.
  function sendAnswers(contact) {
    if (sent) return;
    sent = true;
    var payload = {
      name: contact.name,
      first_name: contact.first_name,
      last_name: contact.last_name,
      phone: contact.phone,
      email: contact.email,
      top_procedure: state.top_procedure,
      top_procedure_text: treatmentText(),
      challenge: state.challenge,
      project: projectLine(),
      website: $('website').value.trim(),
      city: $('city').value.trim(),
      state: $('state').value.trim().toUpperCase(),
      country: 'US',
      message: draftMessage(),
      lead_form: 'request_multistep',
      spam_trap: $('hp_x7k').value ? 'yes' : 'no',
      page_url: location.href,
      utm_source: utm('utm_source'),
      utm_medium: utm('utm_medium'),
      utm_campaign: utm('utm_campaign'),
      utm_content: utm('utm_content'),
      fbclid: utm('fbclid'),
      event_id: EVENT_ID,
      event_time: String(Math.floor(Date.now() / 1000)),
      fbp: cookie('_fbp'),
      fbc: cookie('_fbc') || (utm('fbclid') ? 'fb.1.' + Date.now() + '.' + utm('fbclid') : ''),
      client_user_agent: navigator.userAgent
    };
    if (window.fbq) fbq('track', 'Lead', { content_name: payload.top_procedure || 'diagnostico' }, { eventID: EVENT_ID });
    metaUserData(payload).catch(function () { return {}; }).then(function (hashed) {
      Object.keys(hashed).forEach(function (k) { payload[k] = hashed[k]; });
      if (CAPI_WEBHOOK_URL) post(CAPI_WEBHOOK_URL, payload);
      return post(WEBHOOK_URL, payload);
    }).finally(function () {
      setTimeout(function () { if (window.MasteryForm) MasteryForm.close(); show('thanks'); history = []; }, 2500);
    });
  }

  window.addEventListener('message', function (e) {
    if (current !== 'form' || sent) return;
    var d = e.data;
    if (!Array.isArray(d) || d[0] !== 'set-sticky-contacts') return;
    var contact = contactFromGhl(d[2]);
    if (contact) return sendAnswers(contact);
    // If the message carried no contact data, the embed script may have stored it under "_ud".
    setTimeout(function () {
      try { contact = contactFromGhl(localStorage.getItem('_ud')); } catch (err) { contact = null; }
      if (contact) sendAnswers(contact);
    }, 1000);
  });
})();
