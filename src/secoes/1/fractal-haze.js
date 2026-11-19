import fragmentSource from './fractal-haze.frag?raw';

const vertexSource = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = vec2(a_position.x + 1.0, 1.0 - a_position.y) * 0.5;
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;

  gl.deleteShader(shader);
  return null;
}

function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    if (program) gl.deleteProgram(program);
    return null;
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  const buffer = gl.createBuffer();
  if (!buffer || !gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (buffer) gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    return null;
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const size = gl.getUniformLocation(program, 'u_size');
  const mobile = gl.getUniformLocation(program, 'u_mobile');
  const pointer = gl.getUniformLocation(program, 'u_pointer');
  const velocity = gl.getUniformLocation(program, 'u_velocity');
  const presence = gl.getUniformLocation(program, 'u_presence');
  const opening = gl.getUniformLocation(program, 'u_opening');

  return {
    resize(width, height, compact) {
      const scale = Math.min(window.devicePixelRatio, 1.5, Math.sqrt(1_650_000 / (width * height)));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(size, width, height);
      gl.uniform1f(mobile, compact ? 1 : 0);
    },
    draw(x, y, vx, vy, strength, progress) {
      gl.uniform2f(pointer, x, y);
      gl.uniform2f(velocity, vx, vy);
      gl.uniform1f(presence, strength);
      gl.uniform1f(opening, progress);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

const approach = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));

export function mountFractalHaze(canvas, hero) {
  const art = canvas.parentElement;
  let renderer = createRenderer(canvas);
  if (!renderer || !art) return;

  const compact = window.matchMedia('(max-width: 699px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const content = hero.querySelector('.hero-content');
  const opening = content?.getAnimations?.().find(animation => animation.animationName === 'hero-copy-arrive');
  const target = { x: 0, y: 0, vx: 0, vy: 0, strength: 0 };
  const lens = { ...target };
  let previousMove = 0;
  let lastFrame = 0;
  let frame = 0;
  let width = 0;
  let height = 0;

  function requestDraw() {
    if (!frame && renderer && width && height) frame = requestAnimationFrame(draw);
  }

  function draw(now) {
    frame = 0;
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 1 / 60;
    lastFrame = now;
    const moving = target.strength > 0 && now - previousMove < 55;
    const progress = reducedMotion.matches ? 1 : opening?.effect?.getComputedTiming().progress ?? 1;
    const sweep = progress * progress * (3 - 2 * progress);

    lens.x = approach(lens.x, target.x, 32, dt);
    lens.y = approach(lens.y, target.y, 32, dt);
    lens.strength = approach(lens.strength, target.strength, 16, dt);
    lens.vx = approach(lens.vx, moving ? target.vx : 0, moving ? 20 : 13, dt);
    lens.vy = approach(lens.vy, moving ? target.vy : 0, moving ? 20 : 13, dt);

    const active = moving || Math.abs(lens.strength - target.strength) > 0.001
      || Math.hypot(lens.vx, lens.vy) > 1
      || (target.strength > 0 && Math.hypot((target.x - lens.x) * width, (target.y - lens.y) * height) > 0.25);

    if (!active) Object.assign(lens, target, { vx: 0, vy: 0 });
    renderer.draw(lens.x, lens.y, lens.vx, lens.vy, lens.strength, sweep);
    if (!art.hasAttribute('data-haze-ready')) art.dataset.hazeReady = '';

    if (active || (progress < 1 && opening?.playState === 'running')) requestDraw();
    else lastFrame = 0;
  }

  function resize() {
    if (!renderer) return;
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    if (!width || !height) return;

    renderer.resize(width, height, compact.matches);
    requestDraw();
  }

  function releasePointer() {
    if (!target.strength) return;
    target.strength = 0;
    previousMove = 0;
    requestDraw();
  }

  hero.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || reducedMotion.matches) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      releasePointer();
      return;
    }

    const now = performance.now();
    const dt = Math.max((now - previousMove) / 1000, 0.008);
    const hasDirection = target.strength > 0 && dt < 0.095;

    if (!target.strength) {
      lens.x = x;
      lens.y = y;
    }

    const vx = hasDirection ? (x - target.x) * bounds.width / dt : 0;
    const vy = hasDirection ? (y - target.y) * bounds.height / dt : 0;
    const limit = Math.min(1, 2200 / Math.max(1, Math.hypot(vx, vy)));
    Object.assign(target, { x, y, vx: vx * limit, vy: vy * limit, strength: 1 });
    previousMove = now;
    requestDraw();
  }, { passive: true });

  hero.addEventListener('pointerleave', releasePointer);
  hero.addEventListener('pointercancel', releasePointer);
  window.addEventListener('blur', releasePointer);
  reducedMotion.addEventListener('change', () => {
    releasePointer();
    requestDraw();
  });
  compact.addEventListener('change', resize);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    renderer = null;
    delete art.dataset.hazeReady;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    renderer = createRenderer(canvas);
    resize();
  });

  new ResizeObserver(resize).observe(canvas);
  resize();
}
