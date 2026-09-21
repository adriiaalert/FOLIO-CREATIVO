/* ============================================================
   PECADO — glass-crack-bg.js
   Fondo procedural de grietas de cristal con pulso de brillo rojo.

   Uso:
     GlassCrackBG.init({ canvas: '#crack-bg' });
     GlassCrackBG.shatter(x, y);   // impacto puntual (px de viewport)
     GlassCrackBG.setIntensity(n); // 0..1, sube el brillo global
     GlassCrackBG.destroy();

   Respeta prefers-reduced-motion: dibuja el campo de grietas una
   sola vez, sin animacion ni pulso.
   ============================================================ */
(function (global) {
  'use strict';

  var PALETTE = {
    line: '190,196,204',   // filo frio del cristal
    glow: '193,18,31'      // rojo sangre
  };

  var state = {
    canvas: null,
    ctx: null,
    dpr: 1,
    w: 0,
    h: 0,
    shards: [],       // grietas "estaticas" del cristal
    impacts: [],      // impactos temporales (click / scroll)
    raf: null,
    t: 0,
    lastDraw: 0,
    glow: null,
    gctx: null,
    intensity: 0.55,
    targetIntensity: 0.55,
    pointer: { x: -9999, y: -9999, active: false },
    reduced: false,
    running: false,
    listeners: []
  };

  /* ---------- utilidades ---------- */

  function rand(a, b) { return a + Math.random() * (b - a); }

  /** El trazado se calcula una sola vez; cada frame solo lo vuelve a pintar. */
  function toPath(pts) {
    var path = new Path2D();
    path.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) path.lineTo(pts[i].x, pts[i].y);
    return path;
  }

  function on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts || false);
    state.listeners.push([target, type, fn, opts || false]);
  }

  /* ---------- generacion procedural ---------- */

  /**
   * Genera una grieta ramificada desde un origen.
   * Cada segmento hereda direccion con deriva, y puede bifurcarse.
   */
  function growCrack(x, y, angle, len, depth, seedPhase) {
    var pts = [{ x: x, y: y }];
    var branches = [];
    var steps = Math.max(3, Math.round(len / rand(34, 68)));
    var cx = x, cy = y, ca = angle;

    for (var i = 0; i < steps; i++) {
      var seg = len / steps;
      // tramo recto casi siempre, quiebro seco de vez en cuando
      ca += Math.random() < 0.28 ? rand(-0.62, 0.62) : rand(-0.045, 0.045);
      cx += Math.cos(ca) * seg;
      cy += Math.sin(ca) * seg;
      pts.push({ x: cx, y: cy });

      // bifurcacion: el cristal se abre en astillas
      if (depth > 0 && i > 0 && Math.random() < 0.24) {
        branches.push(
          growCrack(
            cx, cy,
            ca + (Math.random() < 0.5 ? 1 : -1) * rand(0.45, 1.15),
            len * rand(0.32, 0.6),
            depth - 1,
            seedPhase + rand(0, 1.6)
          )
        );
      }
    }

    return {
      pts: pts,
      branches: branches,
      mid: pts[Math.floor(pts.length / 2)],
      path: toPath(pts),
      width: 0.35 + depth * 0.42,
      phase: seedPhase,
      speed: rand(0.45, 1.05),
      // "energia" base: cuanto reacciona esta grieta al pulso rojo
      energy: rand(0.35, 1)
    };
  }

  function buildField() {
    state.shards = [];
    var area = state.w * state.h;
    // densidad estable entre movil y desktop
    var origins = Math.round(Math.min(6, Math.max(3, area / 330000)));
    var diag = Math.hypot(state.w, state.h);

    for (var i = 0; i < origins; i++) {
      // origenes pegados a los bordes: la rotura entra desde fuera del marco
      var edge = Math.floor(rand(0, 4));
      var ox, oy;
      if (edge === 0) { ox = rand(0, state.w); oy = rand(-40, state.h * 0.12); }
      else if (edge === 1) { ox = rand(state.w * 0.88, state.w + 40); oy = rand(0, state.h); }
      else if (edge === 2) { ox = rand(0, state.w); oy = rand(state.h * 0.88, state.h + 40); }
      else { ox = rand(-40, state.w * 0.12); oy = rand(0, state.h); }

      var rays = Math.round(rand(1.6, 3.2));
      for (var r = 0; r < rays; r++) {
        var toCenter = Math.atan2(state.h / 2 - oy, state.w / 2 - ox);
        var crack = growCrack(
          ox, oy,
          toCenter + rand(-0.85, 0.85),
          diag * rand(0.15, 0.34),
          2,
          rand(0, Math.PI * 2)
        );
        flatten(crack, state.shards);
      }
    }
  }

  /** Aplana el arbol de grietas (tronco + ramas) en una lista pintable. */
  function flatten(crack, out) {
    out.push(crack);
    for (var i = 0; i < crack.branches.length; i++) flatten(crack.branches[i], out);
    return out;
  }

  /* ---------- impactos ---------- */

  function shatter(x, y, power) {
    if (!state.ctx) return;
    power = power == null ? 1 : power;
    var cracks = [];
    var rays = Math.round(rand(5, 9));
    for (var i = 0; i < rays; i++) {
      var c = growCrack(
        x, y,
        (Math.PI * 2 / rays) * i + rand(-0.3, 0.3),
        rand(90, 260) * power,
        1,
        0
      );
      flatten(c, cracks);
    }
    state.impacts.push({ x: x, y: y, cracks: cracks, born: state.t, life: 2600 * power });
    if (state.impacts.length > 6) state.impacts.shift();
  }

  /* ---------- pintura ---------- */

  /* ------------------------------------------------------------
     Pintura

     Cada grieta por separado con shadowBlur costaba ~260 llamadas
     de sombra por frame y hundia el framerate en moviles. En su
     lugar agrupamos las grietas en cubos de calor: un Path2D por
     cubo, y el brillo se consigue trazando el mismo camino tres
     veces con grosores y alfas distintos bajo composicion
     'lighter'. Pasamos de ~260 trazos con sombra a ~24 sin sombra.
     ------------------------------------------------------------ */

  var HEAT_BUCKETS = 6;

  // El brillo se pinta en un lienzo auxiliar a media resolucion y se estira
  // al tamano final: cuesta ~4x menos relleno y el reescalado hace de
  // desenfoque gratuito, mejor que trazar halos anchos a resolucion completa.
  var GLOW_SCALE = 0.5;

  // El pulso es lento: por encima de esto no se percibe y solo gasta bateria.
  var MAX_FPS = 40;

  function strokePath(ctx, path, alpha, width, color) {
    ctx.strokeStyle = 'rgba(' + color + ',' + alpha.toFixed(3) + ')';
    ctx.lineWidth = width;
    ctx.stroke(path);
  }

  function heatOf(c, t, pulse) {
    var prox = 0;
    if (state.pointer.active) {
      var d = Math.hypot(c.mid.x - state.pointer.x, c.mid.y - state.pointer.y);
      prox = Math.max(0, 1 - d / 340);
      prox *= prox;
    }
    var own = state.reduced
      ? 0.5
      : (Math.sin(t / 1100 * c.speed + c.phase) * 0.5 + 0.5);
    return {
      heat: (pulse * 0.45 + own * 0.55) * c.energy * state.intensity + prox * 0.85,
      prox: prox
    };
  }

  function draw() {
    var ctx = state.ctx;
    var t = state.t;
    var i;

    ctx.clearRect(0, 0, state.w, state.h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    state.intensity += (state.targetIntensity - state.intensity) * 0.05;

    // pulso global lento: el cristal "respira" en rojo
    var pulse = state.reduced ? 0.5 : (Math.sin(t / 1850) * 0.5 + 0.5);

    // reparto de grietas en cubos segun su calor de este frame
    var buckets = [];
    for (i = 0; i < HEAT_BUCKETS; i++) buckets.push(null);
    var coldPath = new Path2D();
    var hotEdge = new Path2D();
    var hasHotEdge = false;

    for (i = 0; i < state.shards.length; i++) {
      var c = state.shards[i];
      var h = heatOf(c, t, pulse);

      // filo frio del cristal: un unico trazo para todo el campo
      if (h.prox > 0.02) { hotEdge.addPath(c.path); hasHotEdge = true; }
      else coldPath.addPath(c.path);

      if (h.heat > 0.05) {
        var b = Math.min(HEAT_BUCKETS - 1, Math.floor(h.heat * HEAT_BUCKETS));
        if (!buckets[b]) buckets[b] = new Path2D();
        buckets[b].addPath(c.path);
      }
    }

    // filo del cristal: nitido, a resolucion completa
    strokePath(ctx, coldPath, 0.05 + 0.05 * state.intensity, 0.7, PALETTE.line);
    if (hasHotEdge) strokePath(ctx, hotEdge, 0.2, 0.9, PALETTE.line);

    // brillo rojo: lienzo auxiliar a media resolucion
    var g = state.gctx;
    g.clearRect(0, 0, state.w, state.h);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.globalCompositeOperation = 'lighter';
    for (i = 0; i < HEAT_BUCKETS; i++) {
      if (!buckets[i]) continue;
      var heat = Math.min(1, (i + 0.5) / HEAT_BUCKETS);
      strokePath(g, buckets[i], heat * 0.10, 4.5, PALETTE.glow);
      strokePath(g, buckets[i], heat * 0.34, 1.4, PALETTE.glow);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(state.glow, 0, 0, state.w, state.h);
    ctx.restore();

    drawImpacts(t);
  }

  function drawImpacts(t) {
    var ctx = state.ctx;
    for (var k = state.impacts.length - 1; k >= 0; k--) {
      var im = state.impacts[k];
      var age = (t - im.born) / im.life;
      if (age >= 1) { state.impacts.splice(k, 1); continue; }

      var fade = Math.pow(1 - age, 1.8);
      var reveal = Math.min(1, age * 5);   // la grieta "crece" al nacer

      // los impactos son pocos y duran poco: aqui si compensa la sombra
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = 'rgba(' + PALETTE.glow + ',' + (0.8 * fade) + ')';
      ctx.shadowBlur = 14 * fade;

      var grown = new Path2D();
      for (var j = 0; j < im.cracks.length; j++) {
        var ic = im.cracks[j];
        var n = Math.max(2, Math.ceil(ic.pts.length * reveal));
        grown.addPath(n >= ic.pts.length ? ic.path : toPath(ic.pts.slice(0, n)));
      }
      strokePath(ctx, grown, 0.55 * fade, 1.2, PALETTE.glow);
      ctx.shadowBlur = 0;
      strokePath(ctx, grown, 0.30 * fade, 0.6, '255,236,236');
      ctx.restore();
    }
  }

  function loop(now) {
    state.raf = global.requestAnimationFrame(loop);
    if (now - state.lastDraw < 1000 / MAX_FPS) return;
    state.lastDraw = now;
    state.t = now;
    draw();
  }

  /* ---------- ciclo de vida ---------- */

  function resize() {
    if (!state.canvas) return;
    state.dpr = Math.min(global.devicePixelRatio || 1, 1.75);
    state.w = state.canvas.clientWidth || global.innerWidth;
    state.h = state.canvas.clientHeight || global.innerHeight;
    state.canvas.width = Math.round(state.w * state.dpr);
    state.canvas.height = Math.round(state.h * state.dpr);
    state.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    if (!state.glow) state.glow = document.createElement('canvas');
    state.glow.width = Math.max(1, Math.round(state.w * state.dpr * GLOW_SCALE));
    state.glow.height = Math.max(1, Math.round(state.h * state.dpr * GLOW_SCALE));
    state.gctx = state.glow.getContext('2d');
    // trabajamos siempre en px CSS: el lienzo auxiliar se encarga de la escala
    var gs = state.dpr * GLOW_SCALE;
    state.gctx.setTransform(gs, 0, 0, gs, 0, 0);

    buildField();
    if (state.reduced) draw();
  }

  function init(opts) {
    opts = opts || {};
    var el = typeof opts.canvas === 'string'
      ? document.querySelector(opts.canvas)
      : opts.canvas;
    if (!el || !el.getContext) return null;

    state.canvas = el;
    state.ctx = el.getContext('2d');
    state.reduced = global.matchMedia &&
      global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (opts.intensity != null) {
      state.intensity = state.targetIntensity = opts.intensity;
    }

    resize();

    var rt;
    on(global, 'resize', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 180);
    });

    // el puntero enciende las grietas cercanas (solo en dispositivos con hover)
    if (!state.reduced && global.matchMedia('(hover: hover)').matches) {
      on(global, 'pointermove', function (e) {
        state.pointer.x = e.clientX;
        state.pointer.y = e.clientY;
        state.pointer.active = true;
      }, { passive: true });
      on(global, 'pointerleave', function () { state.pointer.active = false; });
    }

    if (state.reduced) {
      draw();
    } else {
      state.running = true;
      state.raf = global.requestAnimationFrame(loop);
      // pausa cuando la pestana no esta visible: no quemamos bateria en movil
      on(document, 'visibilitychange', function () {
        if (document.hidden) pause(); else resume();
      });
    }

    return api;
  }

  function pause() {
    if (state.raf) global.cancelAnimationFrame(state.raf);
    state.raf = null;
  }

  function resume() {
    if (!state.running || state.reduced || state.raf) return;
    state.raf = global.requestAnimationFrame(loop);
  }

  function destroy() {
    pause();
    state.running = false;
    for (var i = 0; i < state.listeners.length; i++) {
      var l = state.listeners[i];
      l[0].removeEventListener(l[1], l[2], l[3]);
    }
    state.listeners = [];
    if (state.ctx) state.ctx.clearRect(0, 0, state.w, state.h);
  }

  var api = {
    init: init,
    destroy: destroy,
    pause: pause,
    resume: resume,
    shatter: function (x, y, power) { if (!state.reduced) shatter(x, y, power); },
    setIntensity: function (v) { state.targetIntensity = Math.max(0, Math.min(1.6, v)); },
    isReduced: function () { return state.reduced; }
  };

  global.GlassCrackBG = api;
})(window);
