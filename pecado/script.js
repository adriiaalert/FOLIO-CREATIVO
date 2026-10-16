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
     — Con GSAP + ScrollTrigger disponibles: cada elemento anima con su propio
       timing (varía el ritmo entre kicker/lead/título/vídeo en vez de un único
       fade genérico igual en todas partes).
     — Sin GSAP: IntersectionObserver + clase .is-visible (el comportamiento
       original), para que la página siga funcionando si el CDN/lib falla.
     Ambos caminos marcan data-revealed en el elemento: lo usa el subrayado
     del kicker en CSS, y es un hook común que no depende de cuál de los dos
     motores reveló el elemento.
     --------------------------------------------------------- */
  function initReveals() {
    var els = $$(".reveal");
    if (!els.length) return;

    function markRevealed(el) { el.setAttribute("data-revealed", "1"); }

    if (window.gsap && window.ScrollTrigger) {
      gsap.set(els, { opacity: 0, y: 28 });

      els.forEach(function (el) {
        var isVideo = el.classList.contains("video-frame");
        var isKicker = el.classList.contains("kicker");

        if (isVideo) gsap.set(el, { scale: 0.97, transformOrigin: "50% 50%" });

        gsap.to(el, {
          opacity: 1,
          y: 0,
          scale: isVideo ? 1 : undefined,
          duration: isKicker ? 0.6 : (isVideo ? 1 : 0.9),
          ease: "power3.out",
          onStart: function () { markRevealed(el); },
          scrollTrigger: { trigger: el, start: "top 90%", once: true }
        });
      });
    } else if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            markRevealed(entry.target);
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05, rootMargin: "0px 0px -2% 0px" });

      els.forEach(function (el) { io.observe(el); });
    } else {
      els.forEach(function (el) { el.classList.add("is-visible"); markRevealed(el); });
    }

    // red de seguridad: si algo se queda oculto por cualquier motivo (ScrollTrigger
    // no se refrescó, IO no soportado del todo, etc.), revelarlo igualmente a los 6s
    window.setTimeout(function () {
      els.forEach(function (el) {
        var stillHidden = parseFloat(getComputedStyle(el).opacity) < 0.99;
        if (stillHidden && el.getBoundingClientRect().top < window.innerHeight) {
          if (window.gsap) gsap.to(el, { opacity: 1, y: 0, scale: 1, duration: 0.4 });
          el.classList.add("is-visible");
          markRevealed(el);
        }
      });
    }, 6000);
  }

  /* ---------------------------------------------------------
     Logo del hero — la serpiente se dibuja trazo a trazo con GSAP
     (stroke-dashoffset) en vez del fundido CSS que había antes. Requiere
     GSAP: si no está disponible, el SVG queda visible y estático tal cual
     lo define styles.css (ver comentario en el <svg> de index.html).
     --------------------------------------------------------- */
  function initHeroLogo() {
    if (!window.gsap) return;

    var mark = $("[data-hero-mark]");
    if (!mark) return;

    var snakePaths = $$("[data-snake-path]", mark);
    var apple = $(".hero-mark__apple", mark);
    if (!apple || !snakePaths.length) return;

    var stem = $(".hero-mark__stem", mark);
    var leaf = $(".hero-mark__leaf", mark);
    var reflection = $(".hero-mark__reflection", mark);
    var head = $(".hero-mark__snake-head", mark);
    var bite = $(".hero-mark__bite", mark);
    var letters = $$(".hero-title__letter");

    // Prepara cada trazo de la serpiente para "dibujarse" con dashoffset.
    // getTotalLength() es la API estándar del DOM para paths SVG.
    snakePaths.forEach(function (p) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = String(len);
      p.style.strokeDashoffset = String(len);
    });

    gsap.set(apple, { opacity: 0, scale: 0.92, transformOrigin: "50% 55%" });
    gsap.set(head, { opacity: 0, scale: 0.5, transformOrigin: "50% 50%" });
    gsap.set(bite, { opacity: 0, scale: 0, transformOrigin: "50% 50%" });
    if (stem) gsap.set(stem, { opacity: 0 });
    if (leaf) gsap.set(leaf, { opacity: 0 });
    if (reflection) gsap.set(reflection, { opacity: 0 });
    if (letters.length) gsap.set(letters, { opacity: 0, y: 10 });

    // Es una intro que se reproduce una sola vez al cargar, no un loop continuo,
    // así que con reduced-motion no se desactiva (no es "intrusiva" según el
    // criterio de 04-critical-gotchas.md) — solo se acorta para sentirse ágil.
    var quick = reduced;

    var tl = gsap.timeline({ delay: quick ? 0.15 : 0.3 });

    tl.to(apple, { opacity: 1, scale: 1, duration: quick ? 0.5 : 0.9, ease: "power3.out" });

    if (stem && leaf) {
      tl.to([stem, leaf], { opacity: 1, duration: quick ? 0.3 : 0.5, ease: "power2.out" }, "-=0.5");
    }
    if (reflection) {
      tl.to(reflection, { opacity: 0.1, duration: quick ? 0.3 : 0.6 }, "<");
    }

    tl.to(snakePaths, {
      strokeDashoffset: 0,
      duration: quick ? 0.7 : 1.3,
      ease: "power2.inOut"
    }, quick ? "-=0.1" : "-=0.2");

    tl.to(head, { opacity: 1, scale: 1, duration: quick ? 0.2 : 0.35, ease: "back.out(2.2)" }, "-=0.15");
    tl.to(bite, { opacity: 1, scale: 1, duration: quick ? 0.25 : 0.4, ease: "back.out(1.7)" }, "+=0.05");

    if (letters.length) {
      tl.to(letters, {
        opacity: 1, y: 0,
        duration: quick ? 0.35 : 0.6,
        ease: "power3.out",
        stagger: quick ? 0.03 : 0.06
      }, quick ? "-=0.05" : "+=0.05");
    }
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

    // Micro-interacción "magnética": el botón sigue un poco al cursor.
    // Solo en dispositivos con puntero fino (nunca en touch) y nunca gateado
    // por reduced-motion — es un hover funcional, no un efecto intrusivo.
    // Se desactiva mientras se envía/deshabilitado para no confundir (gotcha C.2).
    var fineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (fineHover && window.gsap) {
      submitBtn.addEventListener("mousemove", function (e) {
        if (submitBtn.disabled) return;
        var rect = submitBtn.getBoundingClientRect();
        var relX = e.clientX - (rect.left + rect.width / 2);
        var relY = e.clientY - (rect.top + rect.height / 2);
        gsap.to(submitBtn, { x: relX * 0.3, y: relY * 0.4, duration: 0.4, ease: "power2.out" });
      });
      submitBtn.addEventListener("mouseout", function (e) {
        if (submitBtn.contains(e.relatedTarget)) return;
        gsap.to(submitBtn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
      });
    }
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
    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (e) { console.warn("[boot] ScrollTrigger", e); }
    }

    safe(initGlassCrack, "initGlassCrack");
    safe(initHeroLogo, "initHeroLogo");
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
