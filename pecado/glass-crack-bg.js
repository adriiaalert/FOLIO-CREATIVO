/**
 * glass-crack-bg.js
 * Fondo procedural de grietas de cristal con pulso de brillo rojo.
 * Vanilla JS, sin dependencias. Uso:
 *
 *   <canvas data-glass-crack></canvas>
 *   <script defer src="glass-crack-bg.js"></script>
 *   <script defer>
 *     document.addEventListener("DOMContentLoaded", function () {
 *       window.PecadoGlassCrack.mount(document.querySelector("[data-glass-crack]"));
 *     });
 *   </script>
 *
 * Pensado para vivir como una única capa fija detrás de toda la página
 * (no solo detrás de una sección), por eso el canvas debe ir en position:fixed
 * cubriendo el viewport (ver .glass-crack-canvas en styles.css).
 */
(function () {
  "use strict";

  function PecadoGlassCrack(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.epicenters = opts.epicenters || 4;
    this.baseAlpha = opts.baseAlpha != null ? opts.baseAlpha : 0.07;
    this.pulseAlpha = opts.pulseAlpha != null ? opts.pulseAlpha : 0.5;
    this.pulseSpeed = opts.pulseSpeed != null ? opts.pulseSpeed : 0.00045;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.paths = [];
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.rafId = null;
    this.visible = true;

    this._onResize = this._debounce(this._handleResize.bind(this), 220);
    this._onVisibility = this._handleVisibility.bind(this);

    this._handleResize();
    window.addEventListener("resize", this._onResize);
    document.addEventListener("visibilitychange", this._onVisibility);

    if (this.reduced) {
      this._renderStatic();
    } else {
      this._loop(0);
    }
  }

  PecadoGlassCrack.prototype._debounce = function (fn, wait) {
    var t;
    return function () {
      var args = arguments;
      window.clearTimeout(t);
      t = window.setTimeout(function () { fn.apply(null, args); }, wait);
    };
  };

  PecadoGlassCrack.prototype._handleVisibility = function () {
    this.visible = document.visibilityState === "visible";
    if (this.visible && !this.reduced && this.rafId == null) this._loop(0);
  };

  PecadoGlassCrack.prototype._handleResize = function () {
    var w = window.innerWidth;
    var h = window.innerHeight;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = w;
    this.height = h;
    this._generatePaths();
    if (this.reduced) this._renderStatic();
  };

  /* Genera un patrón de grietas por fractura ramificada desde varios
     puntos de impacto — nunca un simple grid, para que se sienta orgánico. */
  PecadoGlassCrack.prototype._generatePaths = function () {
    var paths = [];
    var w = this.width;
    var h = this.height;
    var count = this.epicenters;

    for (var i = 0; i < count; i++) {
      var ox = w * (0.15 + Math.random() * 0.7);
      var oy = h * (0.1 + Math.random() * 0.8);
      var mainBranches = 4 + Math.floor(Math.random() * 3);

      for (var b = 0; b < mainBranches; b++) {
        var angle = (Math.PI * 2 * b) / mainBranches + (Math.random() - 0.5) * 0.6;
        this._fracture(paths, ox, oy, angle, 90 + Math.random() * 140, 0, i * 1.7 + b * 0.9);
      }
    }

    this.paths = paths;
  };

  PecadoGlassCrack.prototype._fracture = function (paths, x, y, angle, length, depth, phase) {
    if (depth > 4 || length < 14) return;

    var segments = 4 + Math.floor(Math.random() * 3);
    var pts = [{ x: x, y: y }];
    var a = angle;
    var segLen = length / segments;
    var cx = x, cy = y;

    for (var s = 0; s < segments; s++) {
      a += (Math.random() - 0.5) * 0.5; // drift irregular, como cristal real
      cx += Math.cos(a) * segLen;
      cy += Math.sin(a) * segLen;
      pts.push({ x: cx, y: cy });

      // posibilidad de rama secundaria, decreciente con la profundidad
      if (Math.random() < 0.28 - depth * 0.05 && depth < 3) {
        var branchAngle = a + (Math.random() < 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.8);
        this._fracture(paths, cx, cy, branchAngle, length * (0.45 + Math.random() * 0.2), depth + 1, phase + s * 0.6);
      }
    }

    paths.push({ points: pts, phase: phase });
  };

  PecadoGlassCrack.prototype._drawFrame = function (t) {
    var ctx = this.ctx;
    var w = this.width, h = this.height;
    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < this.paths.length; i++) {
      var path = this.paths[i];
      var pts = path.points;
      if (pts.length < 2) continue;

      // trazo base — cristal, casi invisible
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var p = 1; p < pts.length; p++) ctx.lineTo(pts[p].x, pts[p].y);
      ctx.strokeStyle = "rgba(244, 240, 236, " + this.baseAlpha + ")";
      ctx.lineWidth = 1;
      ctx.stroke();

      // pulso rojo — respira con fase propia por grieta
      var wave = this.reduced
        ? 0.55
        : 0.5 + 0.5 * Math.sin(t * this.pulseSpeed + path.phase);
      var glowAlpha = 0.05 + wave * this.pulseAlpha;

      ctx.save();
      ctx.shadowColor = "rgba(196, 30, 58, " + Math.min(glowAlpha * 1.4, 0.9) + ")";
      ctx.shadowBlur = 8 + wave * 10;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var q = 1; q < pts.length; q++) ctx.lineTo(pts[q].x, pts[q].y);
      ctx.strokeStyle = "rgba(196, 30, 58, " + glowAlpha + ")";
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();
    }
  };

  PecadoGlassCrack.prototype._renderStatic = function () {
    this._drawFrame(0);
  };

  PecadoGlassCrack.prototype._loop = function (t) {
    if (!this.visible) { this.rafId = null; return; }
    this._drawFrame(t);
    var self = this;
    this.rafId = window.requestAnimationFrame(function (nt) { self._loop(nt); });
  };

  window.PecadoGlassCrack = {
    mount: function (canvas, opts) {
      if (!canvas) return null;
      return new PecadoGlassCrack(canvas, opts);
    }
  };
})();
