(function () {
  "use strict";

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  /* ---------------------------------------------------------
     Reveal on scroll — fade-in con IntersectionObserver
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

    // red de seguridad: si algo se queda oculto por cualquier motivo, revelarlo a los 6s
    window.setTimeout(function () {
      els.forEach(function (el) {
        if (!el.classList.contains("is-visible") && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  /* ---------------------------------------------------------
     Parallax sutil del resplandor del hero
     --------------------------------------------------------- */
  function initParallax() {
    var glow = $(".hero-glow");
    var hero = $(".hero");
    if (!glow || !hero || reduced) return;

    var ticking = false;
    function update() {
      var y = window.scrollY || window.pageYOffset;
      var shift = Math.min(y * 0.06, 24); // desplazamiento muy contenido, nunca "juguetón"
      glow.style.transform = "translateY(" + shift + "px)";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  /* ---------------------------------------------------------
     Cifrado — efecto de caracteres decodificándose
     No revela nunca la fecha real: es puzzle visual, no la clave.
     --------------------------------------------------------- */
  var CIPHER_CHARS = "01#$%&ΔΞΨ¥§¤†‡•∆∇∞≡≠XVI";

  function randomChar() {
    return CIPHER_CHARS.charAt(Math.floor(Math.random() * CIPHER_CHARS.length));
  }

  function scrambleString(length) {
    var out = "";
    for (var i = 0; i < length; i++) {
      out += Math.random() < 0.16 ? " " : randomChar();
    }
    return out;
  }

  function runCipherRow(el) {
    var length = parseInt(el.getAttribute("data-cipher-length"), 10) || 18;
    var frame = 0;
    var settleAt = 10 + Math.floor(Math.random() * 6);

    var tick = window.setInterval(function () {
      frame++;
      el.textContent = scrambleString(length);
      if (frame >= settleAt) {
        window.clearInterval(tick);
        el.dataset.cipherTimer = "";
      }
    }, 90);

    el.dataset.cipherTimer = String(tick);
  }

  function initCipher() {
    var rows = $$("[data-cipher]");
    if (!rows.length) return;

    rows.forEach(function (row) { runCipherRow(row); });

    if (reduced) return; // el efecto continuo en bucle se considera intrusivo; una sola pasada basta

    // vuelve a "descifrarse" cada pocos segundos, como si algo intentara comunicarse
    window.setInterval(function () {
      rows.forEach(function (row) { runCipherRow(row); });
    }, 7000);
  }

  /* ---------------------------------------------------------
     Vídeo de bienvenida — placeholder si el archivo no existe
     --------------------------------------------------------- */
  function initVideo() {
    var frame = $("[data-video-frame]");
    var video = $("[data-video]");
    if (!frame || !video) return;

    video.addEventListener("loadeddata", function () {
      frame.classList.add("is-ready");
    });

    video.addEventListener("error", function () {
      frame.classList.remove("is-ready");
    }, true);

    // si a los 2.5s no ha cargado nada, asumimos que el archivo aún no existe
    window.setTimeout(function () {
      if (video.readyState === 0) frame.classList.remove("is-ready");
    }, 2500);
  }

  /* ---------------------------------------------------------
     Formulario de captura de email
     --------------------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function initCaptureForm() {
    var form = $("[data-capture-form]");
    if (!form) return;

    var input = $("#email", form);
    var errorEl = $("[data-capture-error]", form);
    var submitBtn = $(".capture-submit", form);
    var successEl = $("[data-capture-success]");

    function showError(message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
      input.setAttribute("aria-invalid", "true");
    }

    function clearError() {
      errorEl.hidden = true;
      input.removeAttribute("aria-invalid");
    }

    function showSuccess() {
      form.hidden = true;
      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    }

    // Simula el envío. Sustituir por una llamada real a un servicio
    // de email marketing (ver comentario extenso en index.html, sección 4).
    function simulateSubmit(email) {
      return new Promise(function (resolve) {
        window.setTimeout(resolve, 700);
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();

      var value = input.value.trim();
      if (!EMAIL_RE.test(value)) {
        showError("Introduce un email válido.");
        input.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "…";

      simulateSubmit(value)
        .then(showSuccess)
        .catch(function () {
          showError("Algo ha fallado. Inténtalo de nuevo.");
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Entra";
        });
    });

    input.addEventListener("input", clearError);
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
    safe(initReveals, "initReveals");
    safe(initParallax, "initParallax");
    safe(initCipher, "initCipher");
    safe(initVideo, "initVideo");
    safe(initCaptureForm, "initCaptureForm");
    safe(initFooterYear, "initFooterYear");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
