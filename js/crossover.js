/* ==========================================================================
   Crossover Marketing — motion system
   GSAP 3.13 + ScrollTrigger + SplitText + Lenis
   Attribute grammar (same idea as the reference build):
     [line]      split into masked lines, lines rise in
     [opacity]   fade + lift in
     [scale]     scale from 0
     [delay]     seconds of delay for any of the above
     [no-scroll] plays with the intro instead of on scroll
     [parallax] [parallax-y]            element drift (yPercent)
     [parallax-img] [parallax-img-y]    image drift inside its mask
     [data-cursor="label"]              big cursor with label
     [data-magnetic]                    magnetic hover
     [data-roll]                        text roll on hover
   ========================================================================== */
(() => {
  const html = document.documentElement;
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) {
    html.classList.replace('js', 'no-js');
    return;
  }
  gsap.registerPlugin(ScrollTrigger, SplitText);

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const num = (el, attr, d = 0) => (el.hasAttribute(attr) ? parseFloat(el.getAttribute(attr)) || d : d);
  const EASE = 'expo.out';

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const lockScroll = (on) => {
    if (lenis) on ? lenis.stop() : lenis.start();
    document.body.style.overflow = on ? 'hidden' : '';
  };

  function scrollToHash(hash) {
    const target = hash === '#top' ? 0 : $(hash);
    if (target === null) return;
    if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else (target === 0 ? window : target).scrollIntoView?.({ behavior: 'smooth' }) || window.scrollTo(0, 0);
  }
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const h = a.getAttribute('href');
      if (h.length < 2) return;
      e.preventDefault();
      if (html.classList.contains('menu-open')) toggleMenu(false);
      scrollToHash(h);
    })
  );

  /* ---------- Text roll ---------- */
  $$('[data-roll]').forEach((el) => {
    const txt = el.textContent.trim();
    el.innerHTML = `<span class="roll-in" data-txt="${txt}">${txt}</span>`;
  });

  /* ---------- Menu ---------- */
  const menu = $('.menu');
  const menuBtn = $('.menu-btn');
  let menuTl = null;
  function toggleMenu(open) {
    const isOpen = open ?? !html.classList.contains('menu-open');
    html.classList.toggle('menu-open', isOpen);
    menuBtn.setAttribute('aria-expanded', isOpen);
    menu.setAttribute('aria-hidden', !isOpen);
    $('.menu-btn-txt').textContent = isOpen ? 'close' : 'menu';
    menuTl?.kill();
    if (isOpen) {
      lockScroll(true);
      menuTl = gsap.timeline()
        .set(menu, { visibility: 'visible' })
        .to(menu, { clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'expo.inOut' })
        .fromTo($$('.menu-link span'), { yPercent: 110 }, { yPercent: 0, duration: 1, ease: EASE, stagger: 0.06 }, '-=0.45')
        .fromTo('.menu-foot', { opacity: 0 }, { opacity: 1, duration: 0.6 }, '-=0.6');
    } else {
      lockScroll(false);
      menuTl = gsap.timeline()
        .to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.8, ease: 'expo.inOut' })
        .set(menu, { visibility: 'hidden' });
    }
  }
  menuBtn.addEventListener('click', () => toggleMenu());
  addEventListener('keydown', (e) => e.key === 'Escape' && html.classList.contains('menu-open') && toggleMenu(false));

  /* ---------- Cursor + magnetic ---------- */
  function initCursor() {
    if (touch) return;
    const cursor = $('.cursor');
    const label = $('.cursor-label');
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.5, ease: 'power3' });
    addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); });
    document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));
    document.addEventListener('pointerover', (e) => {
      const big = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button');
      cursor.classList.toggle('is-active', !!big);
      cursor.classList.toggle('is-link', !big && !!link);
      if (big) label.textContent = big.dataset.cursor;
    });

    $$('[data-magnetic]').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'expo.out' });
      const my = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'expo.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.3);
        my((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
  }

  /* ---------- Reveal grammar ---------- */
  const introQueue = []; // tweens held until the loader finishes
  let introDone = false;
  const played = new WeakSet();

  function reveal(el, fromVars, toVars) {
    const delay = num(el, 'delay');
    const noScroll = el.hasAttribute('no-scroll');
    if (reduce) return gsap.set(el, { ...toVars, opacity: 1 });
    const tw = gsap.fromTo(el, fromVars, {
      ...toVars, delay, paused: noScroll && !introDone,
      scrollTrigger: noScroll ? undefined : { trigger: el, start: 'top 92%', once: true },
    });
    if (noScroll && !introDone) introQueue.push(tw);
    return tw;
  }

  function initLines() {
    $$('[line]').forEach((el) => {
      const delay = num(el, 'delay');
      const noScroll = el.hasAttribute('no-scroll');
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'line-child', autoSplit: true,
        onSplit(self) {
          gsap.set(el, { opacity: 1 });
          if (reduce || played.has(el) || (noScroll && introDone)) return;
          const tw = gsap.from(self.lines, {
            yPercent: 115, rotate: 2, transformOrigin: '0 0', duration: 1.4, ease: EASE, stagger: 0.09, delay,
            paused: noScroll,
            onComplete: () => played.add(el),
            scrollTrigger: noScroll ? undefined : { trigger: el, start: 'top 92%', once: true },
          });
          if (noScroll) introQueue.push(tw);
          return tw;
        },
      });
    });
    // SVG presentation attributes (e.g. the logo shards' opacity="0.55") share these names — skip them.
    const notSvg = (el) => !(el instanceof SVGElement);
    $$('[opacity]').filter(notSvg).forEach((el) => reveal(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.4, ease: EASE }));
    $$('[scale]').filter(notSvg).forEach((el) => reveal(el, { scale: 0 }, { scale: 1, duration: 1.2, ease: EASE }));
  }

  /* ---------- Loader ---------- */
  function runLoader() {
    const loader = $('.loader');
    let skip = false;
    try { skip = sessionStorage.getItem('crossover-marketing:loader-played') === '1'; } catch (e) {}
    if (skip || reduce) { loader.remove(); return Promise.resolve(); }
    try { sessionStorage.setItem('crossover-marketing:loader-played', '1'); } catch (e) {}
    lockScroll(true);

    // Timeline authored and approved in HyperFrames (videos/crossover-loader-motion).
    return new Promise((resolve) => {
      const nbr = $('.loader-nbr-txt');
      const svg = $('.loader-svg', loader);
      const markO = $('.loader-mark', svg);
      const shards = $$('.loader-shard', svg);
      const O = { x: 204, y: 47.4 };   // centre of the first "o" (viewBox units)
      const C = { x: 387.5, y: 83.3 }; // centre of the lockup
      const centreX = (el) => { const b = el.getBBox(); return b.x + b.width / 2; };
      const letters = $$('.loader-lw', svg).sort((a, b) => Math.abs(centreX(a) - O.x) - Math.abs(centreX(b) - O.x));
      const brand = $$('.loader-lb', svg).sort((a, b) => centreX(a) - centreX(b));
      const mid = (brand.length - 1) / 2;
      const meta = $$('.loader-meta-txt', loader);
      const count = { v: 0 };

      gsap.set(markO, { x: C.x - O.x, y: C.y - O.y, scale: 2.7, svgOrigin: `${O.x} ${O.y}` });
      gsap.set(letters, { y: 112 });
      gsap.set(brand, { y: 64, x: (i) => (mid - i) * 22 });
      gsap.set(['.loader-logo', '.loader-meta'], { visibility: 'visible' });

      const tl = gsap.timeline({ onComplete: () => { loader.remove(); lockScroll(false); } });
      // the cross
      tl.fromTo('.loader-line--h', { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.inOut' }, 0)
        .fromTo('.loader-line--v', { scaleY: 0 }, { scaleY: 1, duration: 1.1, ease: 'expo.inOut' }, 0.08)
      // shards travel in along the cross and lock into the mark
        .fromTo(shards,
          { x: (i) => [-150, 20, 150][i], y: (i) => [10, -150, 110][i], rotation: (i) => [-28, 22, 34][i], autoAlpha: 0, svgOrigin: `${O.x} ${O.y}` },
          { x: 0, y: 0, rotation: 0, autoAlpha: 1, duration: 1.05, ease: 'expo.out', stagger: 0.09 }, 0.22)
      // lock: bloom, the cross retracts
        .fromTo('.loader-bloom', { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, 1.1)
        .to('.loader-bloom', { autoAlpha: 0, scale: 1.25, duration: 1, ease: 'power2.in' }, 1.6)
        .to('.loader-line--h', { scaleX: 0, duration: 0.8, ease: 'expo.inOut' }, 1.2)
        .to('.loader-line--v', { scaleY: 0, duration: 0.8, ease: 'expo.inOut' }, 1.24)
      // the mark travels home as the first "o" and settles into the brand's two-tone
        .to(markO, { x: 0, y: 0, scale: 1, duration: 0.95, ease: 'power4.inOut' }, 1.45)
        .to(shards, { autoAlpha: (i) => [1, 0.55, 0.75][i], duration: 0.7, ease: 'power2.inOut' }, 1.65)
      // CROSSOVER rises outward from the mark, MARKETING tracks out from the centre
        .to(letters, { y: 0, duration: 1.1, ease: EASE, stagger: 0.045 }, 1.98)
        .to(brand, { y: 0, x: 0, duration: 1.1, ease: EASE, stagger: { each: 0.035, from: 'center' } }, 2.2)
      // meta, counter, progress
        .fromTo(meta, { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: EASE, stagger: 0.06 }, 0.35)
        .to(count, {
          v: 100, duration: 3.1, ease: 'power2.inOut',
          onUpdate: () => (nbr.textContent = String(Math.round(count.v)).padStart(3, '0')),
        }, 0.3)
        .fromTo('.loader-bar i', { scaleX: 0 }, { scaleX: 1, duration: 3.1, ease: 'power2.inOut' }, 0.3)
      // out: the page's hero intro starts as the panel wipes up
        .to(meta, { yPercent: -110, duration: 0.6, ease: 'expo.in', stagger: 0.04 }, 3.45)
        .to('.loader-logo', { yPercent: -112, duration: 0.85, ease: 'expo.in' }, 3.55)
        .add(resolve, 3.55)
        .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.85, ease: 'expo.inOut' }, 3.55);
    });
  }

  /* ---------- Logo path animation (hero + footer) ---------- */
  function logoIn(svg, opts = {}) {
    const byX = (a, b) => a.getBBox().x - b.getBBox().x;
    const word = $$('.lp[data-row="word"]', svg).sort(byX);
    const brand = $$('.lp[data-row="brand"]', svg).sort(byX);
    const tl = gsap.timeline(opts);
    tl.from(word, { y: 110, duration: 1.6, ease: EASE, stagger: 0.055 })
      .from(brand, { y: 70, duration: 1.3, ease: EASE, stagger: 0.04 }, 0.35);
    return tl;
  }

  /* ---------- Hero ---------- */
  function heroIntro() {
    introDone = true;
    const svg = $('.hero-svg');
    if (!reduce) logoIn(svg);
    introQueue.forEach((tw) => tw.play());
    introQueue.length = 0;
  }

  function heroScroll() {
    // fold the desktop nav links into the menu button once the hero has scrolled away
    ScrollTrigger.create({ trigger: '.hero', start: '70% top', onEnter: () => html.classList.add('is-scrolled'), onLeaveBack: () => html.classList.remove('is-scrolled') });
    if (reduce) return;
    const st = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero-svg', { yPercent: 38, scale: 0.94, transformOrigin: '50% 100%', ease: 'none', scrollTrigger: st });
    gsap.to('.hero-top, .hero-bottom', { opacity: 0, y: -60, ease: 'none', scrollTrigger: { ...st, end: '60% top' } });
  }

  /* ---------- Believe reel ---------- */
  function reel() {
    if (reduce) return;
    const st = { trigger: '.reel', start: 'top 95%', end: 'bottom 75%', scrub: 1 };
    gsap.fromTo('.reel-media', { clipPath: 'inset(22% 36% 0% 0% round .4rem)' }, { clipPath: 'inset(0% 0% 0% 0% round .4rem)', ease: 'none', scrollTrigger: st });
    gsap.fromTo('.reel-img', { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: st });
  }

  /* ---------- Services ---------- */
  function services() {
    const letters = $$('.services-word span');
    if (!reduce) {
      gsap.from(letters, {
        yPercent: 105, duration: 1.6, ease: EASE, stagger: { each: 0.05, from: 'random' },
        scrollTrigger: { trigger: '.services-word', start: 'top 85%', once: true },
      });
    }

    $$('.service-media').forEach((m) => {
      if (reduce) return gsap.set(m, { clipPath: 'none' });
      const st = { trigger: m, start: 'top 98%', end: 'center 55%', scrub: 1 };
      gsap.fromTo(m, { clipPath: 'inset(12% 8% 12% 8% round .4rem)' }, { clipPath: 'inset(0% 0% 0% 0% round .4rem)', ease: 'none', scrollTrigger: st });
      gsap.fromTo($('img', m), { scale: 1.3, yPercent: -4 }, { scale: 1, yPercent: 4, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    const idx = $('.services-idx');
    let current = '01';
    const setIdx = (v) => {
      if (v === current) return;
      current = v;
      gsap.timeline()
        .to(idx, { yPercent: -100, opacity: 0, duration: 0.25, ease: 'power2.in' })
        .add(() => (idx.textContent = v))
        .fromTo(idx, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: EASE });
    };
    $$('.service-item').forEach((it) =>
      ScrollTrigger.create({ trigger: it, start: 'top 60%', end: 'bottom 40%', onToggle: (s) => s.isActive && setIdx(it.dataset.idx) })
    );

    // count-up in the footer total
    const total = $('.services-total span:nth-child(2)');
    ScrollTrigger.create({
      trigger: '.services-foot', start: 'top 90%', once: true,
      onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, { v: 8, duration: 1.4, ease: 'power2.out', onUpdate: () => (total.textContent = String(Math.round(o.v)).padStart(2, '0')) });
      },
    });
  }

  /* ---------- Selected work ---------- */
  function work() {
    $$('.work-media').forEach((m) => {
      if (reduce) return gsap.set(m, { clipPath: 'none' });
      gsap.fromTo(m, { clipPath: 'inset(10% 10% 10% 10% round .4rem)' }, { clipPath: 'inset(0% 0% 0% 0% round .4rem)', ease: 'none', scrollTrigger: { trigger: m, start: 'top 95%', end: 'center 60%', scrub: 1 } });
      gsap.fromTo($('img', m), { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------- Philosophy pinned frame ---------- */
  function philosophy() {
    const frame = $('.philo-frame');
    const title = $('.philo-title');
    const split = SplitText.create(title, { type: 'lines,chars', mask: 'lines', linesClass: 'line-child' });
    if (reduce) {
      gsap.set(frame, { width: '100vw', height: '100vh', borderRadius: 0 });
      gsap.set('.philo-scrim', { opacity: 1 });
      return;
    }
    const startW = () => (innerWidth < 768 ? innerWidth * 0.72 : innerWidth * 0.38);
    gsap.set(frame, { width: startW, height: () => startW() * 0.625 });

    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.philo-pin', start: 'top top', end: '+=230%', pin: true, scrub: 1, invalidateOnRefresh: true },
    })
      .to('.philo-caption', { opacity: 0, y: 30, duration: 0.15 }, 0)
      .fromTo(frame, { width: startW, height: () => startW() * 0.625, borderRadius: 4, boxShadow: '0 0 0 1.2rem #EFE7DB, 0 0 0 1.3rem rgba(100,67,44,.25), 0 3rem 6rem rgba(23,19,15,.25)' },
        { width: () => innerWidth, height: () => innerHeight, borderRadius: 0, boxShadow: '0 0 0 0rem #EFE7DB, 0 0 0 0rem rgba(100,67,44,0), 0 0 0 rgba(23,19,15,0)', duration: 0.5, ease: 'power2.inOut' }, 0)
      .fromTo('.philo-img', { scale: 1.15 }, { scale: 1, duration: 0.7 }, 0)
      .to('.philo-scrim', { opacity: 1, duration: 0.2 }, 0.4)
      .fromTo('.philo-label', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.1 }, 0.5)
      .from(split.chars, { yPercent: 110, stagger: 0.012, duration: 0.2, ease: 'power3.out' }, 0.52)
      .fromTo('.philo-copy', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.15 }, 0.68)
      .to({}, { duration: 0.2 });
  }

  /* ---------- Parallax ---------- */
  function parallax() {
    if (reduce) return;
    $$('[parallax]').forEach((el) =>
      gsap.fromTo(el, { yPercent: 0 }, { yPercent: num(el, 'parallax-y', -10), ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
    );
    $$('[parallax-img]').forEach((img) => {
      const y = num(img, 'parallax-img-y', -8);
      gsap.fromTo(img, { yPercent: y < 0 ? 0 : -y }, {
        yPercent: y < 0 ? y : 0, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
    // floating brand marks — each drifts, rotates and splits apart slightly
    $$('.forme').forEach((f, i) => {
      const s = [1, -1.6, 0.7, -2, 1.3][i] || 1;
      const st = { trigger: '.formes', start: 'top bottom', end: 'bottom top', scrub: 1.2 };
      gsap.fromTo(f, { y: 140 * s, rotation: -30 * s }, { y: -140 * s, rotation: 50 * s, ease: 'none', scrollTrigger: st });
      gsap.fromTo($$('.mk', f), { x: (k) => [-14, 6, 16][k], y: (k) => [8, -16, 10][k] }, { x: 0, y: 0, ease: 'none', scrollTrigger: { ...st, end: 'center center' } });
    });
  }

  /* ---------- How we work: the Crossover Loop ----------
     Three steps (Plan / Make / Run). The text column is sticky; scrolling through it
     lights one step at a time, swaps the explanatory line and fills the progress bar.
     State changes only when the step changes, so nothing jitters while scrolling. */
  function loop() {
    const words = $$('.loop-word');
    const steps = $$('.loop-step');
    const bar = $('.loop-progress i');
    let current = -1;
    const setStep = (n) => {
      if (n === current) return;
      current = n;
      words.forEach((w, k) => { w.classList.toggle('is-active', k === n); w.classList.toggle('is-done', k < n); });
      steps.forEach((p, k) => p.classList.toggle('is-active', k === n));
    };
    setStep(0);
    if (!reduce) {
      gsap.from($$('.loop-word > *'), {
        yPercent: 60, opacity: 0, duration: 1.2, ease: EASE, stagger: 0.08,
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: '.glitch-text-w', start: 'top 70%', once: true },
      });
    }
    ScrollTrigger.create({
      trigger: '.glitch-text-w', start: 'top top', end: 'bottom bottom',
      onUpdate(self) {
        const p = self.progress;
        setStep(Math.min(words.length - 1, Math.floor(p * words.length * 0.999)));
        gsap.set(bar, { scaleX: p });
      },
      onLeaveBack: () => { setStep(0); gsap.set(bar, { scaleX: 0 }); },
    });
  }

  /* ---------- Shift rows ---------- */
  function shift() {
    $$('.shift-row').forEach((row) => {
      const from = $('.shift-from', row), to = $('.shift-to', row), arrow = $('.shift-arrow', row);
      if (reduce) return gsap.set(from, { '--strike': 1 });
      gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 88%', end: 'top 50%', scrub: 1 } })
        .fromTo(from, { '--strike': 0, opacity: 1 }, { '--strike': 1, opacity: 0.45, ease: 'none', duration: 0.5 })
        .fromTo(arrow, { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 0.3 }, 0.3)
        .fromTo(to, { xPercent: -30, opacity: 0 }, { xPercent: 0, opacity: 1, ease: 'power2.out', duration: 0.4 }, 0.5);
    });
  }

  /* ---------- Marquee (scroll-velocity aware) ---------- */
  function marquee() {
    const track = $('.marquee-track');
    if (reduce) return;
    const loop = gsap.to(track, { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
    let dir = 1;
    if (lenis) {
      lenis.on('scroll', ({ velocity, direction }) => {
        if (direction) dir = direction;
        gsap.to(loop, { timeScale: dir * (1 + Math.min(Math.abs(velocity) * 0.25, 6)), duration: 0.2, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1.2, delay: 0.2, ease: 'power2.out' });
      });
    }
    gsap.fromTo('.marquee-item', { skewX: 0 }, { skewX: -6, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ---------- Footer ---------- */
  function footer() {
    const svg = $('.footer-svg');
    if (reduce) return;
    logoIn(svg, { scrollTrigger: { trigger: '.footer-logo', start: 'top 92%', once: true } });
  }

  /* ---------- Boot ---------- */
  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  ready.then(() => {
    initLines();
    initCursor();
    heroScroll();
    reel();
    services();
    work();
    philosophy();
    parallax();
    loop();
    shift();
    marquee();
    footer();
    runLoader().then(heroIntro);
    // Triggers were created in feature order, not page order. Sort them by position so the
    // pinned Philosophy section's spacer is accounted for before anything below it is measured.
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    addEventListener('load', () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); });
  });
})();
