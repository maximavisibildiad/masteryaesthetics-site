// Evento Lead del píxel de Meta para el formulario de GHL "Form dco" (inicio y contacto).
// 1. Pone un event_id en la URL antes de que cargue el formulario: el formulario lo toma de la página
//    (igual que los utm_*) y lo guarda en su campo oculto event_id.
// 2. Cuando el formulario se envía (GHL avisa a la página con "set-sticky-contacts"), dispara el Lead
//    con ese mismo event_id, para que Meta lo pueda deduplicar con la API de Conversiones.
(function () {
  var params = new URLSearchParams(location.search);
  var EVENT_ID = params.get('event_id') || ('lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10));
  if (!params.get('event_id')) {
    params.set('event_id', EVENT_ID);
    try { window.history.replaceState(null, '', location.pathname + '?' + params.toString() + location.hash); } catch (e) {}
  }
  var fired = false;
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (fired || !Array.isArray(d) || d[0] !== 'set-sticky-contacts') return;
    fired = true;
    if (window.fbq) fbq('track', 'Lead', { content_name: 'diagnostico' }, { eventID: EVENT_ID });
  });
})();
