// Multi-step request flow (request.html) for clinic owners anywhere in the United States.
// Sends the lead to the GoHighLevel Inbound Webhook of the "Aesthetics Mastery" sub-account.
// The two A2P consent checkboxes keep the exact site text, start unchecked and are optional.
(function () {
  // GoHighLevel workflow "MASTERY - Entrada sitio" (Inbound Webhook).
  var WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/CDWMBDDuWrhpV6P6QdqP/webhook-trigger/8a89e9bb-32a8-4d52-b423-2fb03d8fd698';
  // Conversions API: GoHighLevel workflow "MASTERY - CAPI - Lead sitio" (empty until the Meta dataset exists).
  var CAPI_WEBHOOK_URL = '';

  var DETAIL = {
    odontologia: { q: '¿Cuál es el tratamiento de mayor valor de tu clínica?', label: 'clínica de odontología', opts: [
      ['implantes', 'Implantes / All-on-4'], ['diseno_sonrisa', 'Diseño de sonrisa / carillas'],
      ['ortodoncia', 'Ortodoncia invisible'], ['otro', 'Otro tratamiento']] },
    armonizacion_facial: { q: '¿Cuál es el procedimiento de mayor valor de tu clínica?', label: 'clínica de armonización facial', opts: [
      ['rellenos', 'Rellenos con ácido hialurónico'], ['toxina', 'Toxina botulínica'],
      ['perfilado', 'Perfilado / rinomodelación'], ['otro', 'Otro procedimiento']] },
    cirugia_plastica: { q: '¿Cuál es la cirugía de mayor valor de tu clínica?', label: 'clínica de cirugía plástica', opts: [
      ['lipo_bbl', 'Lipoescultura / BBL'], ['mamoplastia', 'Mamoplastia'],
      ['rinoplastia', 'Rinoplastia'], ['abdominoplastia', 'Abdominoplastia'], ['otro', 'Otra cirugía']] }
  };
  var REVENUE = {
    menos_10k: 'menos de $10,000', '10k_25k': 'entre $10,000 y $25,000',
    '25k_50k': 'entre $25,000 y $50,000', mas_50k: 'más de $50,000'
  };
  var CHALLENGE = {
    sin_sistema: 'No tengo un sistema para captar pacientes nuevos de forma constante.',
    pauta_no_rinde: 'Invierto en anuncios y no veo los resultados que espero.',
    leads_sin_atender: 'Me llegan mensajes de pacientes y no se atienden a tiempo.',
    pacientes_no_vuelven: 'Los pacientes no vuelven después del primer tratamiento.',
    no_seguro: 'No tengo claro qué está frenando el crecimiento y quiero un diagnóstico.'
  };
  var PROGRESS = { zip: 10, service: 22, detail: 34, revenue: 46, challenge: 58, building: 66, message: 74, clinic: 86, contact: 95, thanks: 100 };

  var form = document.getElementById('flow');
  var state = { clinic_type: '', top_procedure: '', monthly_revenue: '', challenge: '', zipOk: false, city: '', state: '' };
  var history = [];
  var current = 'zip';

  function $(id) { return document.getElementById(id); }
  function utm(name) { return new URLSearchParams(location.search).get(name) || ''; }

  function cookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  // SHA-256 hex of a value normalized as Meta requires; empty input stays empty.
  function sha256(value) {
    if (!value || !window.crypto || !crypto.subtle) return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }

  function metaUserData(p) {
    var digits = p.phone.replace(/\D/g, '');
    if (digits.length === 10) digits = '1' + digits;
    var fields = {
      em: p.email.toLowerCase(),
      ph: digits,
      fn: p.first_name.toLowerCase(),
      ln: p.last_name.toLowerCase(),
      ct: p.city.toLowerCase().normalize('NFD').replace(/[^a-z]/g, ''),
      st: (p.state || '').toLowerCase(),
      zp: (p.zip || '').slice(0, 5),
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
    if (push !== false && current !== 'building') history.push(current);
    form.querySelectorAll('.step').forEach(function (s) { s.classList.toggle('on', s.dataset.step === step); });
    current = step;
    $('bar').style.width = (PROGRESS[step] || 10) + '%';
    window.scrollTo(0, 0);
    var first = form.querySelector('.step.on input:not([type=checkbox]), .step.on textarea');
    if (first && step !== 'service') setTimeout(function () { first.focus(); }, 50);
  }
  function back() {
    var prev = history.pop();
    if (prev) show(prev, false);
  }

  // ---- ZIP check: any valid U.S. ZIP code ----
  function checkZip(zip, done) {
    var field = $('zipField'), out = $('zipCity');
    state.zipOk = false;
    field.classList.remove('valid');
    out.classList.remove('bad');
    out.textContent = '';
    if (!/^\d{5}$/.test(zip)) { if (done) done(false); return; }
    fetch('https://api.zippopotam.us/us/' + zip).then(function (r) {
      if (!r.ok) throw new Error('not found');
      return r.json();
    }).then(function (d) {
      var p = d.places[0];
      state.zipOk = true; state.city = p['place name']; state.state = p['state abbreviation'];
      field.classList.add('valid');
      out.textContent = state.city + ', ' + state.state;
      if (done) done(true);
    }).catch(function () {
      // Lookup unavailable or unknown ZIP: accept any 5-digit ZIP so no lead is lost; city and state are asked later.
      state.zipOk = true; state.city = ''; state.state = '';
      field.classList.add('valid');
      out.textContent = 'Estados Unidos';
      if (done) done(true);
    });
  }
  $('zip').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 5);
    if (this.value.length === 5) checkZip(this.value);
    else { state.zipOk = false; $('zipField').classList.remove('valid'); $('zipCity').textContent = ''; }
  });

  // ---- Option lists ----
  function bindOpts(group) {
    group.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        group.querySelectorAll('.opt').forEach(function (o) { o.classList.remove('sel'); });
        b.classList.add('sel');
        state[group.dataset.group] = b.dataset.value;
        if (group.dataset.group === 'clinic_type') $('otherBox').classList.toggle('on', b.dataset.value === 'otra');
        if (group.dataset.mode === 'auto') setTimeout(function () { next(); }, 180);
      });
    });
  }
  bindOpts(form.querySelector('[data-group="clinic_type"]'));
  bindOpts(form.querySelector('[data-group="monthly_revenue"]'));
  bindOpts(form.querySelector('[data-group="challenge"]'));

  function buildDetail() {
    var d = DETAIL[state.clinic_type];
    $('detailQ').textContent = d.q;
    var box = $('detailOpts');
    box.innerHTML = '';
    d.opts.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'opt'; b.dataset.value = o[0];
      b.innerHTML = o[1] + '<span class="chev">›</span>';
      box.appendChild(b);
    });
    state.top_procedure = '';
    bindOpts(box);
  }

  function detailText() {
    var d = DETAIL[state.clinic_type];
    if (!d) return '';
    var o = d.opts.filter(function (x) { return x[0] === state.top_procedure; })[0];
    return o ? o[1] : '';
  }

  function clinicLabel() {
    if (state.clinic_type === 'otra') return 'clínica de ' + ($('other_text').value.trim() || 'estética');
    return DETAIL[state.clinic_type] ? DETAIL[state.clinic_type].label : 'clínica';
  }

  function projectLine() {
    var line = clinicLabel().charAt(0).toUpperCase() + clinicLabel().slice(1);
    var proc = detailText();
    if (proc && state.top_procedure !== 'otro') line += ' · ' + proc;
    if (REVENUE[state.monthly_revenue]) line += ' · factura ' + REVENUE[state.monthly_revenue] + ' al mes';
    return line;
  }

  function draftMessage() {
    var t = [];
    t.push('Tengo una ' + clinicLabel() + '.');
    var proc = detailText();
    if (proc && state.top_procedure !== 'otro') t.push('Nuestro tratamiento de mayor valor es ' + proc.toLowerCase() + '.');
    if (REVENUE[state.monthly_revenue]) t.push('Hoy facturamos ' + REVENUE[state.monthly_revenue] + ' al mes.');
    if (CHALLENGE[state.challenge]) t.push(CHALLENGE[state.challenge]);
    var own = [$('own_words').value.trim(), $('own_words_2').value.trim()].filter(Boolean).join(' ');
    if (own) t.push(own);
    t.push('Quiero agendar mi diagnóstico de crecimiento gratuito.');
    return t.join(' ');
  }

  function runBuilding() {
    show('building');
    var bar = $('buildBar'), w = 0;
    var iv = setInterval(function () {
      w += 4; bar.style.width = Math.min(w, 100) + '%';
      if (w >= 100) {
        clearInterval(iv);
        $('message').value = draftMessage();
        $('msgCount').textContent = $('message').value.length;
        show('message');
      }
    }, 80);
  }
  $('message').addEventListener('input', function () { $('msgCount').textContent = this.value.length; });

  function next() {
    if (current === 'zip') {
      if (state.zipOk) return show('service');
      checkZip($('zip').value, function (ok) {
        if (ok) show('service');
        else { $('zipCity').classList.add('bad'); $('zipCity').textContent = 'Escribe el código postal de 5 dígitos de tu clínica.'; }
      });
      return;
    }
    if (current === 'service') {
      if (!state.clinic_type) return;
      if (state.clinic_type === 'otra') return show('revenue');
      buildDetail();
      return show('detail');
    }
    if (current === 'detail') return show('revenue');
    if (current === 'revenue') return show('challenge');
    if (current === 'challenge') return runBuilding();
    if (current === 'message') {
      $('city').value = $('city').value || state.city;
      $('state').value = $('state').value || state.state;
      return show('clinic');
    }
    if (current === 'clinic') {
      if (!$('clinic_name').value.trim() || !$('city').value.trim() || !/^[A-Za-z]{2}$/.test($('state').value.trim())) {
        $('clinicErr').textContent = 'Escribe el nombre de la clínica, la ciudad y el estado (2 letras, por ejemplo FL).';
        return;
      }
      $('clinicErr').textContent = '';
      $('projectLine').textContent = projectLine();
      return show('contact');
    }
  }

  $('state').addEventListener('input', function () { this.value = this.value.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase(); });
  form.querySelectorAll('[data-next]').forEach(function (b) { b.addEventListener('click', next); });
  form.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', back); });
  $('zip').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); next(); } });

  function consentText(input) {
    var p = input.parentNode.querySelector('p');
    return p ? p.textContent.trim() : '';
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

  function send(payload) {
    if (CAPI_WEBHOOK_URL) post(CAPI_WEBHOOK_URL, payload);
    return post(WEBHOOK_URL, payload);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (current !== 'contact') return next();
    if ($('company_website').value) return;
    var first = $('first_name').value.trim(), last = $('last_name').value.trim();
    var phone = $('phone').value.trim();
    if (!first || phone.replace(/\D/g, '').length < 10) {
      $('contactErr').textContent = 'Escribe tu nombre y un teléfono de 10 dígitos.';
      return;
    }
    $('contactErr').textContent = '';
    var nonMkt = $('consent_nonmarketing'), mkt = $('consent_marketing');
    var payload = {
      name: (first + ' ' + last).trim(),
      first_name: first,
      last_name: last,
      phone: phone,
      email: $('email').value.trim(),
      clinic_name: $('clinic_name').value.trim(),
      clinic_type: state.clinic_type === 'otra' ? 'otra: ' + ($('other_text').value.trim() || 'sin especificar') : state.clinic_type,
      top_procedure: state.top_procedure,
      top_procedure_text: detailText(),
      monthly_revenue: state.monthly_revenue,
      qualifies_10k: state.monthly_revenue && state.monthly_revenue !== 'menos_10k' ? 'yes' : 'no',
      challenge: state.challenge,
      project: projectLine(),
      website: $('website').value.trim(),
      city: $('city').value.trim(),
      state: $('state').value.trim().toUpperCase(),
      zip: $('zip').value,
      country: 'US',
      message: $('message').value.trim(),
      consent_nonmarketing: nonMkt.checked ? 'yes' : 'no',
      consent_marketing: mkt.checked ? 'yes' : 'no',
      consent_timestamp: new Date().toISOString(),
      consent_text_nonmarketing: consentText(nonMkt),
      consent_text_marketing: consentText(mkt),
      lead_form: 'request_multistep',
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
    var btn = $('submitBtn');
    btn.disabled = true; btn.textContent = 'Enviando...';
    if (window.fbq) fbq('track', 'Lead', { content_name: payload.clinic_type }, { eventID: payload.event_id });
    metaUserData(payload).catch(function () { return {}; }).then(function (hashed) {
      Object.keys(hashed).forEach(function (k) { payload[k] = hashed[k]; });
      return send(payload);
    }).finally(function () { show('thanks'); history = []; });
  });
})();
