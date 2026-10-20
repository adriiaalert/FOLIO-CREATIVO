/* =========================================================
   EcoFesta - interaccions i animacions de scroll
   ========================================================= */
(function () {
  'use strict';

  // ---------- Dades ----------
  var PACKS = [
    { id: 'petit', name: 'Pack Petit', max: 12, price: 39, cleaning: 8 },
    { id: 'mitja', name: 'Pack Mitjà', max: 25, price: 69, cleaning: 14, featured: true },
    { id: 'gran',  name: 'Pack Gran',  max: 50, price: 119, cleaning: 24 }
  ];

  var TYPES = {
    familiar: {
      label: 'Familiar',
      items: function (n) {
        return [
          n + ' plats plans i ' + n + ' de postres de ceràmica',
          n + ' jocs de coberts d\'acer inoxidable',
          n + ' gots de vidre i ' + Math.ceil(n / 6) + ' gerres',
          Math.ceil(n / 8) + ' estovalles de lli i tovallons de cotó',
          'Garlanda de roba i ' + Math.ceil(n / 6) + ' gerros per a flors'
        ];
      }
    },
    infantil: {
      label: 'Infantil',
      items: function (n) {
        return [
          n + ' plats de bambú de colors, irrompibles',
          n + ' gots amb tapa i canyeta d\'acer',
          n + ' jocs de coberts petits',
          'Garlandes de banderetes i ' + Math.ceil(n / 4) + ' barrets de tela',
          'Joc de pastís: safata, pala i espelmes de cera'
        ];
      }
    },
    jardi: {
      label: 'Jardí i exterior',
      items: function (n) {
        return [
          n + ' plats d\'esmalt i ' + n + ' bols per a amanida',
          n + ' gots irrompibles de policarbonat',
          n + ' jocs de coberts d\'acer',
          Math.ceil(n / 5) + ' mantes de pícnic i coixins',
          'Guirnalda de llums (10 m) i ' + Math.ceil(n / 10) + ' fanals'
        ];
      }
    }
  };

  var EXTRAS = [
    { id: 'garlanda', name: 'Garlanda de roba extra', price: 6 },
    { id: 'llums', name: 'Llums de guirnalda', price: 9 },
    { id: 'estovalles', name: 'Estovalles de lli', price: 5 },
    { id: 'pastis', name: 'Kit de pastís', price: 7 }
  ];

  var DELIVERY_PRICE = 18;
  var PIECES_PER_GUEST = 7;   // plat gran, plat postres, got, 3 coberts, tovalló
  var KG_PER_PIECE = 0.009;   // pes mitjà d'una peça d'un sol ús

  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };
  var euro = function (n) { return n.toLocaleString('ca-ES') + ' €'; };
  var euro2 = function (n) { return n.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Navegació ----------
  var nav = $('#nav');
  var menu = $('#menu');
  var toggle = $('#menuToggle');

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      nav.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }).observe($('#navSentinel'));
  }

  toggle.addEventListener('click', function () {
    var open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Tanca el menú' : 'Obre el menú');
  });
  $$('a', menu).forEach(function (a) {
    a.addEventListener('click', function () {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // ---------- Packs ----------
  var grid = $('#packsGrid');

  function renderPacks(type) {
    var t = TYPES[type];
    grid.innerHTML = PACKS.map(function (p) {
      return '' +
        '<article class="pack' + (p.featured ? ' pack--featured' : '') + '">' +
          (p.featured ? '<span class="pack__badge">El més demanat</span>' : '') +
          '<h3 class="pack__name">' + p.name + '</h3>' +
          '<p class="pack__guests">Fins a ' + p.max + ' convidats, ' + t.label.toLowerCase() + '</p>' +
          '<p class="pack__price">' + p.price + ' €<small>/ 48 h</small></p>' +
          '<p class="pack__per">' + euro2(p.price / p.max) + ' per convidat</p>' +
          '<ul>' + t.items(p.max).map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' +
          '<a href="#reserva" class="btn" data-pick="' + p.id + '">Tria aquest pack</a>' +
        '</article>';
    }).join('');
  }

  $$('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      $$('.tab').forEach(function (t) {
        t.classList.toggle('is-active', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
      grid.classList.add('is-swapping');
      setTimeout(function () {
        renderPacks(tab.dataset.type);
        requestAnimationFrame(function () { grid.classList.remove('is-swapping'); });
      }, 220);
    });
  });

  grid.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-pick]');
    if (!btn) return;
    var pack = PACKS.filter(function (p) { return p.id === btn.dataset.pick; })[0];
    $('#fPack').value = pack.id;
    $('#fGuests').value = pack.max;
  });

  renderPacks('familiar');

  // ---------- Calculadora ----------
  var guests = $('#guests');
  var guestsOut = $('#guestsOut');
  var delivery = $('#delivery');
  var cleaning = $('#cleaning');
  var extrasBox = $('#extras');

  extrasBox.innerHTML = EXTRAS.map(function (x) {
    return '<label class="extra"><input type="checkbox" value="' + x.id + '"><span>' + x.name + ' <em>+' + x.price + ' €</em></span></label>';
  }).join('');

  var state = {};

  function pickPack(n) {
    for (var i = 0; i < PACKS.length; i++) if (n <= PACKS[i].max) return PACKS[i];
    return PACKS[PACKS.length - 1];
  }

  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  function updateCalc() {
    var n = parseInt(guests.value, 10);
    var type = $('input[name="type"]:checked').value;
    var pack = pickPack(n);
    var chosen = $$('input:checked', extrasBox).map(function (i) {
      return EXTRAS.filter(function (x) { return x.id === i.value; })[0];
    });

    guestsOut.textContent = n;
    guests.style.setProperty('--p', ((n - guests.min) / (guests.max - guests.min) * 100) + '%');

    var lines = [{ k: pack.name + ' (' + TYPES[type].label.toLowerCase() + ')', v: pack.price }];
    lines.push(delivery.checked
      ? { k: 'Entrega i recollida', v: DELIVERY_PRICE }
      : { k: 'Recollida al magatzem', v: 0 });
    if (cleaning.checked) lines.push({ k: 'Neteja i desinfecció', v: pack.cleaning });
    chosen.forEach(function (x) { lines.push({ k: x.name, v: x.price }); });

    var total = lines.reduce(function (s, l) { return s + l.v; }, 0);
    var pieces = n * PIECES_PER_GUEST;

    $('#tPack').textContent = pack.name;
    $('#tMeta').textContent = 'Fins a ' + pack.max + ' convidats, ' + TYPES[type].label.toLowerCase();
    $('#tLines').innerHTML = lines.map(function (l) {
      return '<li><span>' + l.k + '</span><span>' + (l.v === 0 ? 'Gratis' : euro(l.v)) + '</span></li>';
    }).join('');
    $('#tTotal').textContent = euro(total);
    $('#tPer').textContent = euro2(total / n) + ' per convidat';
    $('#tPieces').textContent = pieces.toLocaleString('ca-ES');
    $('#tKg').textContent = (pieces * KG_PER_PIECE).toLocaleString('ca-ES', { maximumFractionDigits: 1 });

    if (state.total !== undefined && state.total !== total) bump($('#tTotal'));
    if (state.pack && state.pack !== pack.id) bump($('#tPack'));

    state = { n: n, type: type, pack: pack.id, total: total, delivery: delivery.checked, cleaning: cleaning.checked, extras: chosen };
  }

  $('#calcForm').addEventListener('input', updateCalc);
  $('#calcForm').addEventListener('change', updateCalc);
  updateCalc();

  $('#toBooking').addEventListener('click', function () {
    $('#fGuests').value = state.n;
    $('#fPack').value = state.pack;
    var notes = ['Festa ' + TYPES[state.type].label.toLowerCase() + '.'];
    notes.push(state.delivery ? 'Amb entrega i recollida.' : 'Recolliré al magatzem.');
    notes.push(state.cleaning ? 'Amb neteja inclosa.' : 'Sense neteja.');
    if (state.extras.length) notes.push('Extres: ' + state.extras.map(function (x) { return x.name.toLowerCase(); }).join(', ') + '.');
    notes.push('Total estimat: ' + euro(state.total) + '.');
    $('#fMsg').value = notes.join(' ');
    $('#reserva').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    setTimeout(function () { $('#fName').focus({ preventScroll: true }); }, 700);
  });

  // ---------- Formulari de reserva ----------
  var form = $('#bookingForm');
  var status = $('#formStatus');
  var dateInput = $('#fDate');
  var minDate = new Date();
  minDate.setDate(minDate.getDate() + 2);
  dateInput.min = minDate.toISOString().slice(0, 10);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var firstBad = null;
    $$('input[required]', form).forEach(function (f) {
      var ok = f.checkValidity();
      f.closest('.field').classList.toggle('is-invalid', !ok);
      f.setAttribute('aria-invalid', String(!ok));
      if (!ok && !firstBad) firstBad = f;
    });
    status.className = 'form__status';
    if (firstBad) {
      status.classList.add('is-err');
      status.textContent = 'Falten dades o n\'hi ha alguna amb un format incorrecte.';
      firstBad.focus();
      return;
    }
    var name = $('#fName').value.trim().split(' ')[0];
    var date = new Date(dateInput.value + 'T12:00:00').toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    var packSel = $('#fPack');
    var body = [
      'Nom: ' + $('#fName').value.trim(),
      'Correu: ' + $('#fEmail').value.trim(),
      'Data de la festa: ' + date,
      'Codi postal: ' + $('#fZip').value.trim(),
      'Convidats: ' + $('#fGuests').value,
      'Pack: ' + packSel.options[packSel.selectedIndex].text,
      '',
      $('#fMsg').value.trim()
    ].join('\n');
    window.location.href = 'mailto:hola@ecofesta.cat?subject=' + encodeURIComponent('Reserva EcoFesta, ' + date) + '&body=' + encodeURIComponent(body);
    status.classList.add('is-ok');
    status.textContent = 'Gràcies, ' + name + '! S\'ha obert el teu correu amb la sol·licitud per al ' + date + '. Envia-la i et confirmarem la disponibilitat en menys de 24 hores.';
  });

  $$('input', form).forEach(function (f) {
    f.addEventListener('input', function () {
      f.closest('.field').classList.remove('is-invalid');
      f.removeAttribute('aria-invalid');
    });
  });

  // ---------- Revelat en entrar a la pantalla ----------
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  // ---------- Història: la foto fixa canvia amb cada dia ----------
  var storyImgs = $$('.story__frame img');
  var storySteps = $$('.story__step');
  var storyBar = $('#storyBar');
  if ('IntersectionObserver' in window) {
    var storyIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var i = en.target.dataset.step;
        storySteps.forEach(function (s) { s.classList.toggle('is-active', s === en.target); });
        storyImgs.forEach(function (img) { img.classList.toggle('is-active', img.dataset.step === i); });
        storyBar.style.width = ((+i + 1) / storySteps.length * 100) + '%';
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    storySteps.forEach(function (s) { storyIo.observe(s); });
  }

  $('#year').textContent = new Date().getFullYear();

  // ---------- Animacions de scroll amb GSAP ----------
  var turn = $('.turn');
  var turnMedia = $('.turn__media');
  var turnImg = $('.turn__media img');

  function showTurnStatic() {
    turnMedia.style.clipPath = 'none';
    turnImg.style.transform = 'none';
    turn.style.setProperty('--shade', 1);
    turn.style.setProperty('--copy', 1);
  }

  document.documentElement.classList.add('is-loaded');

  if (!window.gsap || !window.ScrollTrigger || reduceMotion) {
    showTurnStatic();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  var clamp01 = function (v) { return Math.min(1, Math.max(0, v)); };

  // Entrada del titular: cada línia puja des de sota la seva màscara
  gsap.from('.hero__title .line > span', { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.12, delay: 0.1 });
  gsap.from('.hero .lead, .hero__ctas, .hero .eyebrow', { opacity: 0, y: 18, duration: 0.9, ease: 'expo.out', stagger: 0.08, delay: 0.35 });
  gsap.from('.hero__media', { opacity: 0, scale: 0.96, duration: 1.2, ease: 'expo.out', delay: 0.2 });

  var mm = gsap.matchMedia();

  mm.add('(min-width: 768px)', function () {
    // Paral·laxi suau de la foto del hero
    gsap.to('.hero__media img', {
      yPercent: -12, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    // Gir: la foto del sofà s'obre fins a omplir la pantalla i apareix el text
    ScrollTrigger.create({
      trigger: turn, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: function (self) {
        var p = self.progress;
        var open = clamp01(p / 0.55);
        var e = 1 - Math.pow(1 - open, 3);
        var y = 18 * (1 - e), x = 22 * (1 - e), r = 28 * (1 - e);
        turnMedia.style.clipPath = 'inset(' + y + '% ' + x + '% round ' + r + 'px)';
        turnImg.style.transform = 'scale(' + (1.15 - 0.15 * e) + ')';
        turn.style.setProperty('--shade', clamp01((p - 0.35) / 0.3));
        turn.style.setProperty('--copy', clamp01((p - 0.5) / 0.25));
      }
    });

    // Beneficis: el scroll vertical desplaça les targetes en horitzontal
    var track = $('#benefitsTrack');
    var distance = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    gsap.to(track, {
      x: function () { return -distance(); },
      ease: 'none',
      scrollTrigger: {
        trigger: '.benefits', start: 'top top',
        end: function () { return '+=' + distance(); },
        pin: true, scrub: 1, invalidateOnRefresh: true
      }
    });

    // Com funciona: la línia es dibuixa a mesura que avances
    gsap.to('#timelineFill', {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '#timeline', start: 'top 60%', end: 'bottom 60%', scrub: true }
    });
  });

  mm.add('(max-width: 767px)', function () {
    showTurnStatic();
    gsap.set('#timelineFill', { scaleY: 1 });
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
