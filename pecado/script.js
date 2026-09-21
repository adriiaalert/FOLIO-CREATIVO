(function () {
  "use strict";

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  /* ---------------------------------------------------------
     Fondo de grietas de cristal (glass-crack-bg.js)
     --------------------------------------------------------- */
  function initGlassCrack() {
    var canvas = $("[data-glass-crack]");
    if (!canvas || !window.PecadoGlassCrack) return;
    window.PecadoGlassCrack.mount(canvas);
  }

  /* ---------------------------------------------------------
     Reveal on scroll
     --------------------------------------------------------- */
  function initReveals() {
    var els = $$(".reveal");
    if (!els.length) return;

    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -2% 0px" });

    els.forEach(function (el) { io.observe(el); });

    window.setTimeout(function () {
      els.forEach(function (el) {
        if (!el.classList.contains("is-visible") && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  /* ---------------------------------------------------------
     Vídeo — placeholder "Próximamente" si el archivo no existe
     --------------------------------------------------------- */
  function initVideo() {
    var frame = $("[data-video-frame]");
    var video = $("[data-video]");
    if (!frame || !video) return;

    video.addEventListener("loadeddata", function () { frame.classList.add("is-ready"); });
    video.addEventListener("error", function () { frame.classList.remove("is-ready"); }, true);

    window.setTimeout(function () {
      if (video.readyState === 0) frame.classList.remove("is-ready");
    }, 2500);
  }

  /* ---------------------------------------------------------
     Glitch sutil en el póster del evento bloqueado
     --------------------------------------------------------- */
  function initPosterGlitch() {
    if (reduced) return;
    var poster = $("[data-lock-poster]");
    var card = $("[data-lock-card]");
    if (!poster || !card) return;

    window.setInterval(function () {
      if (card.classList.contains("is-unlocked")) return;
      poster.classList.remove("is-glitching");
      // fuerza reflow para poder relanzar la animación
      void poster.offsetWidth;
      poster.classList.add("is-glitching");
    }, 4200 + Math.random() * 2600);
  }

  /* ---------------------------------------------------------
     Desbloqueo por código — el código nunca se guarda en claro,
     solo se compara su hash SHA-256 (Web Crypto API).
     --------------------------------------------------------- */

  // sha256("MANZANA") — código de demostración. Ver comentario en index.html
  // para generar el hash del código real sin exponerlo en el fuente.
  var UNLOCK_HASH = "121261926c6a671bfc49145e472ccb1f04e15f8addacf59870aaef4560bc9d5a";

  function sha256Hex(text) {
    var enc = new TextEncoder().encode(text);
    return window.crypto.subtle.digest("SHA-256", enc).then(function (buf) {
      var bytes = Array.from(new Uint8Array(buf));
      return bytes.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }

  // Helper de consola para generar el hash de un código nuevo sin
  // tener que escribirlo nunca en texto plano dentro del repositorio.
  window.PECADO_HASH = function (code) {
    return sha256Hex(String(code || "").trim().toUpperCase());
  };

  function initUnlock() {
    var form = $("[data-unlock-form]");
    if (!form) return;

    var input = $("[data-unlock-input]", form);
    var submitBtn = $(".unlock-submit", form);
    var feedback = $("[data-unlock-feedback]");
    var card = $("[data-lock-card]");
    var sub = $("[data-lock-sub]");
    var ticket = $("[data-ticket-link]");

    if (!window.crypto || !window.crypto.subtle) {
      feedback.textContent = "Tu navegador no soporta esta comprobación.";
      feedback.classList.add("is-visible");
      submitBtn.disabled = true;
      return;
    }

    function setFeedback(text, success) {
      feedback.textContent = text;
      feedback.classList.add("is-visible");
      feedback.classList.toggle("is-success", !!success);
    }

    function unlock() {
      card.classList.add("is-unlocked");
      sub.textContent = "Acceso concedido";
      setFeedback("Correcto. Bienvenido al pecado.", true);
      ticket.hidden = false;
      window.setTimeout(function () {
        ticket.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
        ticket.focus({ preventScroll: true });
      }, reduced ? 0 : 700);
    }

    function reject() {
      setFeedback("Ese no es. Sigue buscando.", false);
      input.classList.remove("is-error");
      void input.offsetWidth;
      input.classList.add("is-error");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = input.value.trim().toUpperCase();
      if (!value) return;

      submitBtn.disabled = true;
      sha256Hex(value)
        .then(function (hash) {
          if (hash === UNLOCK_HASH) unlock();
          else reject();
        })
        .catch(function () {
          setFeedback("Algo ha fallado. Inténtalo de nuevo.", false);
        })
        .finally(function () {
          submitBtn.disabled = false;
        });
    });

    input.addEventListener("input", function () {
      input.value = input.value.toUpperCase();
      input.classList.remove("is-error");
    });
  }

  /* ---------------------------------------------------------
     Año del footer
     --------------------------------------------------------- */
  function initFooterYear() {
    var el = $("[data-year]");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  function boot() {
    safe(initGlassCrack, "initGlassCrack");
    safe(initReveals, "initReveals");
    safe(initVideo, "initVideo");
    safe(initPosterGlitch, "initPosterGlitch");
    safe(initUnlock, "initUnlock");
    safe(initFooterYear, "initFooterYear");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
