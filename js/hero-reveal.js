/* ==========================================================================
   Crossover Marketing — hero material reveal
   Move the pointer across the hero and a liquid-edged mask opens over the logo,
   showing the same logo rendered in changing materials (videos/hero-materials.mp4).

   How it works
   - A small GPU fluid simulation (advection → divergence → pressure solve →
     gradient subtraction) runs on two low-res float textures: velocity and "dye".
   - Pointer movement injects velocity and dye. Dye slowly dissipates.
   - The display pass thresholds the dye into a crisp-edged mask and draws the
     video only inside it. Everywhere else the canvas is transparent, so the real
     SVG logo and page show through and keep all their own animation.
   - Each frame the video quad is re-aligned to the live position of .hero-svg,
     so the materials stay locked to the letters during the intro and the
     scroll parallax.
   Plain WebGL2, no libraries. Skips itself on reduced motion or without float
   render targets.
   ========================================================================== */
(() => {
  const hero = document.querySelector('.hero');
  const logo = document.querySelector('.hero-svg');
  const src = hero && hero.dataset.revealVideo;
  if (!hero || !logo || !src) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Where the logo sits inside the video frame (measured from the 1280×720 render):
  // left / top / width as fractions of the frame, plus the frame's aspect ratio.
  const FRAME = { left: 0.0609, top: 0.3208, width: 0.8563, aspect: 1280 / 720 };

  const S = {
    simRes: 256, dyeRes: 512,
    velocityDissipation: 0.962, dyeDissipation: 0.988,
    pressureIterations: 20,
    splatRadius: 1.4e-4, splatForce: 5900,
    revealSize: 3.9, edgeSoftness: 0.5, edgeWidth: 0.01,
    idleAfter: 4500, // ms without movement before the sim sleeps
  };

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-reveal';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl || !(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'))) return;
  hero.appendChild(canvas);

  /* ---------- video source ---------- */
  const video = document.createElement('video');
  // mp4 (H.264) for Safari/Chrome/Edge; WebM (VP9) fallback for browsers without H.264
  const webm = src.replace(/\.mp4$/, '.webm');
  const pick = video.canPlayType('video/mp4; codecs="avc1.640028"') ? src : (video.canPlayType('video/webm; codecs="vp9"') ? webm : src);
  Object.assign(video, { src: pick, muted: true, loop: true, playsInline: true, preload: 'auto' });
  video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
  video.className = 'hero-reveal-video';
  hero.appendChild(video);
  const play = () => { const p = video.play(); p && p.catch(() => {}); };

  /* ---------- GL helpers ---------- */
  const VS = `#version 300 es
  in vec2 aPos; out vec2 vUv; out vec2 vL; out vec2 vR; out vec2 vT; out vec2 vB; uniform vec2 uTexel;
  void main(){ vUv = aPos*0.5+0.5; vL = vUv-vec2(uTexel.x,0.); vR = vUv+vec2(uTexel.x,0.); vT = vUv+vec2(0.,uTexel.y); vB = vUv-vec2(0.,uTexel.y); gl_Position = vec4(aPos,0.,1.); }`;
  const FS = {
    splat: `#version 300 es
    precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uTarget; uniform float uAspect; uniform vec2 uPoint; uniform vec3 uColor; uniform float uRadius;
    void main(){ vec2 p = vUv-uPoint; p.x *= uAspect; o = vec4(texture(uTarget,vUv).xyz + exp(-dot(p,p)/uRadius)*uColor, 1.); }`,
    advect: `#version 300 es
    precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 uSimTexel; uniform float uDissipation;
    void main(){ vec2 c = vUv - texture(uVelocity,vUv).xy*uSimTexel; o = uDissipation*texture(uSource,c); }`,
    divergence: `#version 300 es
    precision highp float; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o; uniform sampler2D uVelocity;
    void main(){ float L=texture(uVelocity,vL).x, R=texture(uVelocity,vR).x, T=texture(uVelocity,vT).y, B=texture(uVelocity,vB).y; o = vec4(0.5*(R-L+T-B),0.,0.,1.); }`,
    pressure: `#version 300 es
    precision highp float; in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o; uniform sampler2D uPressure; uniform sampler2D uDivergence;
    void main(){ float L=texture(uPressure,vL).x, R=texture(uPressure,vR).x, T=texture(uPressure,vT).x, B=texture(uPressure,vB).x; o = vec4((L+R+B+T-texture(uDivergence,vUv).x)*0.25,0.,0.,1.); }`,
    gradient: `#version 300 es
    precision highp float; in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o; uniform sampler2D uPressure; uniform sampler2D uVelocity;
    void main(){ float L=texture(uPressure,vL).x, R=texture(uPressure,vR).x, T=texture(uPressure,vT).x, B=texture(uPressure,vB).x; o = vec4(texture(uVelocity,vUv).xy - 0.5*vec2(R-L,T-B),0.,1.); }`,
    display: `#version 300 es
    precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uDye; uniform sampler2D uVideo; uniform vec4 uRect; uniform float uReveal; uniform float uSoft; uniform float uEdge; uniform float uDebug;
    void main(){
      float m = max(uDebug, clamp(smoothstep(uSoft, uSoft+uEdge, texture(uDye,vUv).r*uReveal), 0., 1.));
      vec2 v = (vUv - uRect.xy) / uRect.zw;
      vec3 c = (v.x<0.||v.x>1.||v.y<0.||v.y>1.) ? vec3(0.) : texture(uVideo, v).rgb;
      o = vec4(c*m, m);
    }`,
  };

  function compile(type, srcCode) {
    const s = gl.createShader(type); gl.shaderSource(s, srcCode); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, VS);
  function program(fsSrc) {
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  }
  let P;
  try { P = Object.fromEntries(Object.entries(FS).map(([k, v]) => [k, program(v)])); }
  catch (e) { canvas.remove(); video.remove(); return; }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function target(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h };
  }
  const double = (w, h) => ({ read: target(w, h), write: target(w, h), swap() { [this.read, this.write] = [this.write, this.read]; } });

  const velocity = double(S.simRes, S.simRes);
  const pressure = double(S.simRes, S.simRes);
  const dye = double(S.dyeRes, S.dyeRes);
  const divergence = target(S.simRes, S.simRes);
  const simTexel = [1 / S.simRes, 1 / S.simRes];

  const videoTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, videoTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

  function run(prog, out, uniforms) {
    gl.useProgram(prog.p);
    let unit = 0;
    for (const [k, v] of Object.entries(uniforms)) {
      const loc = prog.u[k]; if (loc == null) continue;
      if (v && v.tex) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.tex); gl.uniform1i(loc, unit++); }
      else if (v instanceof WebGLTexture) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v); gl.uniform1i(loc, unit++); }
      else if (typeof v === 'number') gl.uniform1f(loc, v);
      else if (v.length === 2) gl.uniform2fv(loc, v);
      else if (v.length === 3) gl.uniform3fv(loc, v);
      else if (v.length === 4) gl.uniform4fv(loc, v);
    }
    if (out) { gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb); gl.viewport(0, 0, out.w, out.h); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /* ---------- sizing + pointer ---------- */
  let cw = 1, ch = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    cw = Math.max(1, r.width); ch = Math.max(1, r.height);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  }
  resize();
  addEventListener('resize', resize);

  const DEBUG = /[?&]reveal-debug/.test(location.search) ? 0.55 : 0; // ?reveal-debug overlays the whole video to check alignment
  const mouse = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, moved: false };
  let lastMove = -1e9;
  function onMove(x, y) {
    const r = canvas.getBoundingClientRect();
    if (y < r.top || y > r.bottom) return;
    mouse.x = (x - r.left) / r.width; mouse.y = 1 - (y - r.top) / r.height;
    if (!mouse.moved) { mouse.px = mouse.x; mouse.py = mouse.y; }
    mouse.moved = true; lastMove = performance.now();
    wake();
  }
  addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', (e) => e.touches[0] && onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

  /* ---------- frame loop (sleeps when idle or off-screen) ---------- */
  let visible = true, raf = 0, cleared = true;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) { play(); wake(); } else video.pause();
  }).observe(hero);
  play();
  addEventListener('pointerdown', play, { once: true, passive: true });

  function wake() { if (!raf && visible) raf = requestAnimationFrame(frame); }

  function videoRect() {
    const c = canvas.getBoundingClientRect(), s = logo.getBoundingClientRect();
    const vw = s.width / FRAME.width, vh = vw / FRAME.aspect;
    const vx = s.left - FRAME.left * vw, vy = s.top - FRAME.top * vh;
    return [(vx - c.left) / c.width, 1 - (vy + vh - c.top) / c.height, vw / c.width, vh / c.height];
  }

  function step(fade) {
    const aspect = cw / ch;
    if (mouse.moved) {
      const dx = mouse.x - mouse.px, dy = mouse.y - mouse.py;
      if ((dx || dy) && fade > 0.001) {
        // fill the path between frames so the trail stays continuous on slow frames / fast flicks
        const n = Math.min(16, Math.max(1, Math.ceil(Math.hypot(dx * aspect, dy) / 0.012)));
        for (let k = 1; k <= n; k++) {
          const pt = [mouse.px + (dx * k) / n, mouse.py + (dy * k) / n];
          run(P.splat, velocity.write, { uTarget: velocity.read, uAspect: aspect, uPoint: pt, uColor: [(dx / n) * S.splatForce * fade, (dy / n) * S.splatForce * fade, 0], uRadius: S.splatRadius });
          velocity.swap();
          run(P.splat, dye.write, { uTarget: dye.read, uAspect: aspect, uPoint: pt, uColor: [fade, fade, fade], uRadius: S.splatRadius });
          dye.swap();
        }
      }
      mouse.px = mouse.x; mouse.py = mouse.y;
    }
    run(P.advect, velocity.write, { uTexel: simTexel, uVelocity: velocity.read, uSource: velocity.read, uSimTexel: simTexel, uDissipation: S.velocityDissipation });
    velocity.swap();
    run(P.advect, dye.write, { uTexel: simTexel, uVelocity: velocity.read, uSource: dye.read, uSimTexel: simTexel, uDissipation: S.dyeDissipation });
    dye.swap();
    run(P.divergence, divergence, { uTexel: simTexel, uVelocity: velocity.read });
    gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.read.fb); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    for (let i = 0; i < S.pressureIterations; i++) {
      run(P.pressure, pressure.write, { uTexel: simTexel, uPressure: pressure.read, uDivergence: divergence });
      pressure.swap();
    }
    run(P.gradient, velocity.write, { uTexel: simTexel, uPressure: pressure.read, uVelocity: velocity.read });
    velocity.swap();
  }

  function frame() {
    raf = 0;
    if (!visible) return;
    const idle = !DEBUG && performance.now() - lastMove > S.idleAfter;
    if (idle) {
      if (!cleared) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); cleared = true; }
      return; // sleep until the pointer moves again
    }
    cleared = false;
    // the effect fades out as the hero scrolls away
    const r = canvas.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height || 1)));
    step(1 - p * p);
    if (video.readyState >= 2) {
      gl.bindTexture(gl.TEXTURE_2D, videoTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    run(P.display, null, { uDye: dye.read, uVideo: videoTex, uRect: videoRect(), uReveal: S.revealSize, uSoft: S.edgeSoftness, uEdge: S.edgeWidth, uDebug: DEBUG });
    raf = requestAnimationFrame(frame);
  }
})();
