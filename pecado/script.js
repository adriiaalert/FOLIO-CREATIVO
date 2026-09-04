(function () {
  "use strict";

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
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
     Shader del cifrado — WebGL a mano (sin Three.js: este proyecto no tiene
     build step, y Three.js sería mucho peso para un efecto de fondo).
     Bandas de glitch horizontal + aberración cromática muy sutiles, en tonos
     rojo/negro de marca, detrás del bloque de texto cifrado.

     Se desactiva por completo (nunca se crea el contexto WebGL) si:
       — prefers-reduced-motion: es un loop continuo, así que cuenta como
         "intrusivo" según el mismo criterio que ya usa initCipher().
       — viewport < 720px: en vez de intentar "aligerar" el shader en móvil,
         directamente no corre ahí. Cero coste = cero riesgo de rendimiento.
       — el navegador no soporta WebGL.
     En cualquiera de esos casos la sección se queda con el fondo --bg-soft
     de siempre: no hay hueco visual ni contenido que dependa de esto.
     --------------------------------------------------------- */
  function initCipherShader() {
    if (reduced) return;
    if (window.innerWidth < 720) return;

    var canvas = $("[data-cipher-canvas]");
    var section = canvas ? canvas.closest(".cipher-section") : null;
    if (!canvas || !section) return;

    var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return;

    var VERT = "attribute vec2 aPos;varying vec2 vUv;" +
      "void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}";

    // Bandas de "slice" horizontal + ruido con aberración cromática roja.
    // fract/sin como hash pseudo-aleatorio: patrón estándar y barato en GLSL.
    // Constantes deliberadamente bajas: es un fondo atmosférico, no debe competir
    // con el texto que va encima. sliceY/scan usan cifras fijas (no uResolution)
    // para que la densidad de líneas no dependa del DPR del dispositivo.
    var FRAG = "precision mediump float;" +
      "uniform float uTime;uniform vec2 uResolution;varying vec2 vUv;" +
      "float hash(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453);}" +
      "void main(){" +
      "vec2 uv=vUv;float t=uTime;" +
      "float sliceY=floor(uv.y*22.0);" +
      "float seed=hash(vec2(sliceY,floor(t*2.5)));" +
      "float shift=(seed-0.5)*0.01*step(0.95,seed);" +
      "float ab=0.0014+0.0009*sin(t*0.5);" +
      "vec2 uvR=vec2(uv.x+shift+ab,uv.y);" +
      "vec2 uvG=vec2(uv.x+shift,uv.y);" +
      "vec2 uvB=vec2(uv.x+shift-ab,uv.y);" +
      "float scan=0.92+0.08*sin(uv.y*140.0-t*2.2);" +
      "float flicker=0.92+0.08*hash(vec2(floor(t*12.0),1.0));" +
      "float nR=hash(uvR*36.0+t*0.4);" +
      "float nG=hash(uvG*36.0+t*0.4+7.0);" +
      "float nB=hash(uvB*36.0+t*0.4+13.0);" +
      "vec3 col=vec3(0.34*nR,0.01*nG,0.03*nB)*scan*flicker;" +
      "float edge=smoothstep(0.0,0.3,uv.y)*smoothstep(1.0,0.65,uv.y);" +
      "col*=edge;" +
      "gl_FragColor=vec4(col,edge*0.16);" +
      "}";

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("[initCipherShader] shader error:", gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }

    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("[initCipherShader] program link error:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // Triángulo único que cubre toda la pantalla — más barato que un quad de 2 triángulos.
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var uTime = gl.getUniformLocation(program, "uTime");
    var uResolution = gl.getUniformLocation(program, "uResolution");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var width = 0, height = 0;

    function resize() {
      var rect = section.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    resize();

    var resizeTimer;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 200);
    }, { passive: true });

    // Pausa el rAF fuera de viewport y con la pestaña oculta — no gasta batería
    // en un efecto de fondo que nadie está mirando.
    var running = false;
    var rafId = null;
    var startTime = performance.now();

    function frame(now) {
      if (!running) return;
      gl.uniform1f(uTime, (now - startTime) / 1000);
      gl.uniform2f(uResolution, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      rafId = window.requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      canvas.classList.add("is-active");
      rafId = window.requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) start(); else stop();
        });
      }, { threshold: 0.01 });
      io.observe(section);
    } else {
      start();
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (section.getBoundingClientRect().top < window.innerHeight) start();
    });
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

    // Micro-interacción "magnética": el botón sigue un poco al cursor.
    // Solo en dispositivos con puntero fino (nunca en touch) y nunca gateado
    // por reduced-motion — es un hover funcional, no un efecto intrusivo.
    // Se desactiva mientras se envía para no confundir (ver gotcha C.2).
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

    safe(initHeroLogo, "initHeroLogo");
    safe(initReveals, "initReveals");
    safe(initParallax, "initParallax");
    safe(initCipher, "initCipher");
    safe(initCipherShader, "initCipherShader");
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
