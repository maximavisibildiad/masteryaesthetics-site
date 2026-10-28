// Ventana emergente con el formulario de GHL "Form dco" (Mastery Aesthetics).
// Uso: <script src="form-modal.js" data-origen="inicio"></script>
//  - Abre con cualquier enlace a "#diagnostico", con .cta-mini y con [data-open-form].
//  - Si la página carga con #diagnostico en la URL, se abre sola.
//  - Otras páginas pueden llamar MasteryForm.open() / MasteryForm.close() y escuchar MasteryForm.onClose.
(function () {
  var FORM_ID = 'IeYVdcvEOoF5aGSecvaQ';
  var EMBED_SCRIPT = 'https://link.msgsndr.com/js/form_embed.js';
  var me = document.currentScript;
  var ORIGEN = (me && me.dataset.origen) || 'inicio';

  var css = [
    '@property --mf-a{syntax:"<angle>";initial-value:0deg;inherits:false}',
    '.mf-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-start;justify-content:center;',
    '  padding:clamp(16px,4vh,48px) 16px;background:rgba(10,7,16,.72);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);',
    '  overflow-y:auto;opacity:0;visibility:hidden;transition:opacity .3s ease,visibility .3s ease}',
    '.mf-overlay.open{opacity:1;visibility:visible}',
    '.mf-dialog{position:relative;width:min(1120px,100%);margin:auto 0;border-radius:22px;padding:2px;isolation:isolate;',
    '  transform:translateY(14px) scale(.985);transition:transform .35s cubic-bezier(.22,.61,.36,1)}',
    '.mf-overlay.open .mf-dialog{transform:none}',
    /* Luz que recorre el borde: un degradado cónico que gira detrás del contenido */
    '.mf-dialog::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;',
    '  background:conic-gradient(from var(--mf-a),rgba(122,35,148,.25) 0deg,rgba(122,35,148,.25) 200deg,#9B30E8 250deg,#FF6347 290deg,#FFA51F 315deg,rgba(122,35,148,.25) 340deg);',
    '  animation:mf-spin 4.5s linear infinite}',
    '.mf-dialog::after{content:"";position:absolute;inset:-14px;z-index:-2;border-radius:30px;',
    '  background:conic-gradient(from var(--mf-a),transparent 0deg,transparent 220deg,rgba(155,48,232,.55) 260deg,rgba(255,99,71,.45) 295deg,rgba(255,165,31,.35) 315deg,transparent 345deg);',
    '  filter:blur(22px);opacity:.75;animation:mf-spin 4.5s linear infinite}',
    '@keyframes mf-spin{to{--mf-a:360deg}}',
    '.mf-inner{position:relative;border-radius:20px;overflow:hidden;padding:clamp(18px,2.4vw,30px);',
    '  background:radial-gradient(540px circle at 88% -12%,rgba(123,47,209,.40),transparent 58%),radial-gradient(440px circle at 2% 108%,rgba(180,91,216,.14),transparent 68%),#0A0710;color:#fff}',
    '.mf-head{text-align:center;margin:0 34px 18px}',
    '.mf-head h3{margin:0 0 6px;font-family:"Nunito",sans-serif;font-weight:800;font-size:clamp(20px,2.4vw,26px);color:#fff;letter-spacing:-.01em}',
    '.mf-head p{margin:0;font-size:14.5px;color:#A7A0B6}',
    '.mf-close{position:absolute;top:14px;right:14px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.14);',
    '  background:rgba(255,255,255,.06);color:#fff;font-size:22px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2}',
    '.mf-close:hover{background:rgba(255,255,255,.14)}',
    '.mf-close:focus-visible{outline:2px solid #B45BD8;outline-offset:2px}',
    '.mf-body iframe{display:block;width:100%;border:0;border-radius:10px;overflow:hidden;min-height:600px}',
    'html.mf-lock,html.mf-lock body{overflow:hidden}',
    '@media (prefers-reduced-motion:reduce){.mf-dialog::before,.mf-dialog::after{animation:none}.mf-overlay,.mf-dialog{transition:none}}'
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.className = 'mf-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML =
    '<div class="mf-dialog" role="dialog" aria-modal="true" aria-labelledby="mf-title">' +
      '<div class="mf-inner">' +
        '<button type="button" class="mf-close" aria-label="Cerrar">&times;</button>' +
        '<div class="mf-head"><h3 id="mf-title">Solicita tu diagnóstico de crecimiento</h3>' +
        '<p>Cuéntanos de tu clínica y te escribimos o te llamamos para coordinar la sesión.</p></div>' +
        '<div class="mf-body"></div>' +
      '</div>' +
    '</div>';

  function ready(fn) { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }

  var loaded = false, lastFocus = null;
  var api = window.MasteryForm = { onClose: null, isOpen: false };

  function loadForm() {
    if (loaded) return;
    loaded = true;
    overlay.querySelector('.mf-body').innerHTML =
      '<iframe src="https://api.leadconnectorhq.com/widget/form/' + FORM_ID + '?origen_formulario=' + encodeURIComponent(ORIGEN) + '"' +
      ' scrolling="no" style="width:100%;height:100%;border:none;border-radius:8px;overflow:hidden"' +
      ' id="inline-' + FORM_ID + '"' +
      ' data-layout="{\'id\':\'INLINE\'}"' +
      ' data-trigger-type="alwaysShow" data-trigger-value=""' +
      ' data-activation-type="alwaysActivated" data-activation-value=""' +
      ' data-deactivation-type="neverDeactivate" data-deactivation-value=""' +
      ' data-form-name="Form dco" data-height="1928"' +
      ' data-layout-iframe-id="inline-' + FORM_ID + '"' +
      ' data-form-id="' + FORM_ID + '"' +
      ' data-cookie-consent="true" data-cookie-consent-provider="auto"' +
      ' title="Form dco"></iframe>';
    var s = document.createElement('script');
    s.src = EMBED_SCRIPT;
    document.body.appendChild(s);
  }

  api.open = function () {
    lastFocus = document.activeElement;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('mf-lock');
    api.isOpen = true;
    loadForm();
    overlay.scrollTop = 0;
    setTimeout(function () { overlay.querySelector('.mf-close').focus(); }, 60);
  };

  api.close = function () {
    if (!api.isOpen) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('mf-lock');
    api.isOpen = false;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    if (typeof api.onClose === 'function') api.onClose();
  };

  ready(function () {
    document.body.appendChild(overlay);
    overlay.querySelector('.mf-close').addEventListener('click', api.close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) api.close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && api.isOpen) api.close(); });

    // Enlaces que abren la ventana en lugar de navegar.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href="#diagnostico"], a.cta-mini, [data-open-form]');
      if (!a) return;
      e.preventDefault();
      api.open();
    });

    if (location.hash === '#diagnostico') api.open();
  });
})();
