/* ============================================================
   PECADO — pecado.js
   Fondo, revelados y desbloqueo por codigo.
   ============================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------
     CONFIGURACION — lo unico que hay que tocar para cada evento
     ------------------------------------------------------------
     El codigo NO se guarda en claro: se guarda su huella. Aun asi,
     esto es validacion de cliente: sirve para crear el momento, no
     para proteger nada de valor. Cualquiera con las herramientas de
     desarrollo puede leer la URL de entradas del HTML. Si el enlace
     debe seguir siendo secreto de verdad, tiene que entregarlo un
     servidor tras comprobar el codigo.

     Para cambiar el codigo, en una terminal:
       printf 'MICODIGO' | shasum -a 256
     y pega el resultado en CODE_SHA256. Para regenerar el respaldo
     FNV (solo se usa al abrir el archivo sin servidor, en file://)
     ejecuta en la consola del navegador:  PECADO.fnv('MICODIGO')
     ------------------------------------------------------------ */
  var CONFIG = {
    // Codigo actual: SERPIENTE
    CODE_SHA256: 'e6b4835082a8ec6bcb6f470cfe0ae8ab72bd10954deb1dd7878a78e7a2a40db5',
    CODE_FNV: '5bd5990e',
    TICKETS_URL: 'https://www.fourvenues.com/',   // <- URL real del evento en Fourvenues
    EVENT_DATE: 'PRÓXIMAMENTE',                   // se muestra al desbloquear, en vez de "???"
    EVENT_LINE: 'La dirección llega por privado',
    STORAGE_KEY: 'pecado.unlocked'
  };

  var $ = function (sel) { return document.querySelector(sel); };

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     Fondo de grietas
     ============================================================ */

  if (window.GlassCrackBG) {
    window.GlassCrackBG.init({ canvas: '#crack-bg', intensity: 0.5 });
  }

  /* ============================================================
     Header: se compacta al salir del hero
     ============================================================ */

  var head = $('#site-head');
  if (head) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        head.classList.toggle('is-stuck', window.scrollY > 40);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ============================================================
     Revelado al entrar en pantalla
     ============================================================ */

  var reveals = document.querySelectorAll('.reveal');

  if (prefersReduced || !('IntersectionObserver' in window)) {
    for (var i = 0; i < reveals.length; i++) reveals[i].classList.add('is-in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

    for (var j = 0; j < reveals.length; j++) io.observe(reveals[j]);
  }

  /* ============================================================
     Animacion escalonada del wordmark
     ============================================================ */

  var letters = document.querySelectorAll('.wordmark span');
  for (var k = 0; k < letters.length; k++) {
    letters[k].style.animationDelay = (0.12 + k * 0.085) + 's';
  }

  /* ============================================================
     Huellas del codigo
     ============================================================ */

  function normalize(value) {
    return String(value)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
      // el teclado movil mete acentos con facilidad: los neutralizamos
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /** Respaldo no criptografico para contextos sin crypto.subtle (file://). */
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  function sha256Hex(str) {
    if (!(window.crypto && window.crypto.subtle)) return Promise.resolve(null);
    var bytes = new TextEncoder().encode(str);
    return window.crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
      var out = [];
      new Uint8Array(buf).forEach(function (b) {
        out.push(('0' + b.toString(16)).slice(-2));
      });
      return out.join('');
    }).catch(function () { return null; });
  }

  function check(value) {
    var clean = normalize(value);
    if (!clean) return Promise.resolve(false);
    return sha256Hex(clean).then(function (hex) {
      if (hex) return hex === CONFIG.CODE_SHA256;
      return fnv1a(clean) === CONFIG.CODE_FNV;   // solo sin subtle crypto
    });
  }

  /* ============================================================
     Desbloqueo
     ============================================================ */

  var form      = $('#code-form');
  var input     = $('#code-input');
  var box       = $('#code-box');
  var submit    = $('#code-submit');
  var feedback  = $('#code-feedback');
  var progress  = $('#code-progress');
  var card      = $('#event-card');
  var lockLabel = $('#lock-label');
  var dateEl    = $('#event-date');
  var lineEl    = $('#event-line');
  var tickets   = $('#tickets');
  var ticketsBtn= $('#tickets-btn');

  var unlocked = false;
  var attempts = 0;

  var MISSES = [
    'Ese no es. Vuelve a mirar.',
    'Casi. O no.',
    'Sigue sin abrirse.',
    'El código existe. Ese no.'
  ];

  function say(text, isError) {
    if (!feedback) return;
    feedback.textContent = text;
    feedback.classList.toggle('is-error', !!isError);
    feedback.classList.toggle('is-shown', !!text);
  }

  function unlock(instant) {
    if (unlocked || !card) return;
    unlocked = true;

    if (ticketsBtn && CONFIG.TICKETS_URL) ticketsBtn.href = CONFIG.TICKETS_URL;

    say('Acceso concedido', false);
    if (submit) {
      submit.textContent = 'Desbloqueado';
      submit.disabled = true;
    }
    if (input) {
      input.readOnly = true;
      input.blur();
    }

    // el cartel reacciona primero; las entradas llegan despues
    card.classList.add('is-open');
    if (lockLabel) lockLabel.textContent = 'Acceso concedido';
    if (dateEl) dateEl.textContent = CONFIG.EVENT_DATE;
    if (lineEl) lineEl.textContent = CONFIG.EVENT_LINE;

    // el cristal se rompe donde esta el cartel
    if (window.GlassCrackBG && !prefersReduced) {
      var r = card.getBoundingClientRect();
      window.GlassCrackBG.shatter(r.left + r.width / 2, r.top + r.height / 2, 1.25);
      window.GlassCrackBG.setIntensity(1);
    }

    var showTickets = function () {
      if (!tickets) return;
      tickets.classList.add('is-shown');
      tickets.setAttribute('aria-hidden', 'false');
      if (ticketsBtn) ticketsBtn.removeAttribute('tabindex');
    };

    if (instant || prefersReduced) {
      showTickets();
    } else {
      setTimeout(showTickets, 900);
      setTimeout(function () {
        tickets.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 1300);
    }

    try { sessionStorage.setItem(CONFIG.STORAGE_KEY, '1'); } catch (e) { /* modo privado */ }
  }

  function deny() {
    attempts++;
    if (box) {
      box.classList.remove('is-wrong');
      void box.offsetWidth;            // reinicia la animacion
      box.classList.add('is-wrong');
    }
    say(MISSES[Math.min(attempts - 1, MISSES.length - 1)], true);
    if (input) { input.select(); input.focus(); }
  }

  if (input) {
    input.addEventListener('input', function () {
      // mayusculas siempre, sin romper la posicion del cursor
      var pos = input.selectionStart;
      var up = input.value.toUpperCase();
      if (up !== input.value) {
        input.value = up;
        input.setSelectionRange(pos, pos);
      }
      if (submit) submit.disabled = !input.value.trim();
      if (progress) {
        var pct = Math.min(100, (input.value.trim().length / 9) * 100);
        progress.style.right = (100 - pct) + '%';
      }
      if (feedback && feedback.classList.contains("is-error")) say("", false);
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (unlocked || !input) return;
      var value = input.value;
      if (!value.trim()) return;
      if (submit) submit.disabled = true;

      check(value).then(function (ok) {
        if (ok) unlock(false);
        else {
          deny();
          if (submit) submit.disabled = !input.value.trim();
        }
      });
    });
  }

  // quien ya acerto en esta sesion no vuelve a teclear
  try {
    if (sessionStorage.getItem(CONFIG.STORAGE_KEY) === '1') unlock(true);
  } catch (e) { /* modo privado */ }

  /* ============================================================
     Microinteraccion: el cristal se rompe donde tocas
     ============================================================ */

  if (window.GlassCrackBG && !prefersReduced) {
    document.addEventListener('pointerdown', function (e) {
      if (e.target.closest('a, button, input, .event-card')) return;
      window.GlassCrackBG.shatter(e.clientX, e.clientY, 0.85);
    }, { passive: true });
  }

  /* utilidad para regenerar la huella de respaldo al cambiar de codigo */
  window.PECADO = { fnv: function (code) { return fnv1a(normalize(code)); } };
})();
