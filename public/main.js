// The glyph field, the silk threads, the decoding text, the header and the section index,
// the copy button, the contact form and the theme toggle.

const root = document.documentElement;
const motion = root.classList.contains("motion");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const systemDark = matchMedia("(prefers-color-scheme: dark)");
const spanish = root.lang.startsWith("es");
const copyKeys = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘C" : "Ctrl+C";

const TEXT = spanish
  ? {
      copyHint: finePointer ? "Haz clic para copiar" : "Toca para copiar",
      copied: "Copiado al portapapeles",
      selected: finePointer ? `Seleccionado. Pulsa ${copyKeys} para copiarlo` : "Seleccionado. Toca Copiar en el menú",
      sending: "Enviando…",
      sent: (name, email) => `Gracias, ${name}. Tu mensaje va en camino y te responderé a ${email} en un día laborable.`,
      sentTitle: "Mensaje enviado.",
      writeAgain: "Escribir otro mensaje",
      missing: {
        name: "Escribe tu nombre.",
        email: "Revisa tu dirección de correo.",
        message: "Cuéntame qué necesitas.",
      },
      failed: "No se pudo enviar tu mensaje. Inténtalo de nuevo o escríbeme a contact@mariohdz.com.",
      toLight: "Cambiar al tema claro",
      toDark: "Cambiar al tema oscuro",
    }
  : {
      copyHint: finePointer ? "Click to copy" : "Tap to copy",
      copied: "Copied to clipboard",
      selected: finePointer ? `Selected. Press ${copyKeys} to copy it` : "Selected. Tap Copy in the menu",
      sending: "Sending…",
      sent: (name, email) => `Thanks, ${name}. Your message is on its way, and I’ll reply to ${email} within one business day.`,
      sentTitle: "Message sent.",
      writeAgain: "Write another message",
      missing: {
        name: "Please add your name.",
        email: "Please check your email address.",
        message: "Please tell me what you need.",
      },
      failed: "Your message couldn’t be sent. Please try again, or write to contact@mariohdz.com.",
      toLight: "Switch to light theme",
      toDark: "Switch to dark theme",
    };

const GLYPHS = "01<>/\\|{}[]()+=-_*~:;.#$%&@!?";
const MONO = '"Geist Mono", ui-monospace, monospace';
const randomIndex = () => Math.floor(Math.random() * GLYPHS.length);
const randomGlyph = () => GLYPHS[randomIndex()];

// How each glyph field fades out towards its edges, by height (0 at the top, 1 at the bottom). The fade is part
// of the drawing itself, so the browser never has to mask the whole canvas again on every frame.
const FADES = {
  hero: (y) => (y < 0.55 ? 1 : Math.max(0, 1 - (y - 0.55) / 0.45)),
  contact: (y) => Math.max(0, Math.min(1, y / 0.25, (1 - y) / 0.25)),
};

// While the page scrolls, the ambient motion waits, so every frame goes to the scroll itself.
const SETTLE = 150;
let scrolledAt = -Infinity;
const scrolling = (now = performance.now()) => now - scrolledAt < SETTLE;

// A grid of faint glyphs that light up around the pointer and fade out behind it.
// The quiet grid is drawn once to an offscreen canvas; each frame only repaints lit cells.
class GlyphField {
  constructor(canvas) {
    this.canvas = canvas;
    this.host = canvas.parentElement;
    this.ctx = canvas.getContext("2d");
    this.base = document.createElement("canvas");
    this.baseCtx = this.base.getContext("2d");
    this.fadeAt = canvas.closest(".contact") ? FADES.contact : canvas.closest(".hero") ? FADES.hero : () => 1;
    this.active = new Set();
    this.visible = false;
    this.lit = false;
    this.cols = 0;
    this.light = null;
  }

  // The soft light under the pointer is a layer of its own, moved with a transform, so following the pointer
  // never restyles or repaints the section. It's made the first time a mouse or a pen comes over the field.
  moveLight(x, y) {
    if (!this.light) {
      this.light = document.createElement("div");
      this.light.className = "field-light";
      this.light.setAttribute("aria-hidden", "true");
      this.host.insertBefore(this.light, this.canvas);
      // Its resting style is settled first, so the light fades in the first time too.
      getComputedStyle(this.light).opacity;
    }
    this.light.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const compact = width < 640;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.cellW = compact ? 15 : 18;
    this.cellH = compact ? 19 : 22;
    this.fontSize = compact ? 11 : 12;
    this.radius = compact ? 110 : 160;
    for (const canvas of [this.canvas, this.base]) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    for (const ctx of [this.ctx, this.baseCtx]) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
    }
    // Resizing a canvas resets its drawing state, so the cached font and colour are forgotten too.
    this.fonts = [400, 500, 700].map((weight) => `${weight} ${this.fontSize}px ${MONO}`);
    this.font = this.fill = "";
    const cols = Math.ceil(width / this.cellW);
    // When only the height changes, as when the message box grows, the glyphs already in place stay as they are.
    const kept = cols === this.cols ? { glyph: this.glyph, hot: this.hot, shade: this.shade, heat: this.heat } : null;
    this.cols = cols;
    this.rows = Math.ceil(height / this.cellH);
    this.fade = Float32Array.from({ length: this.rows }, (_, row) => this.fadeAt(((row + 0.5) * this.cellH) / height));
    const cells = this.cols * this.rows;
    this.glyph = new Uint8Array(cells);
    this.hot = new Uint8Array(cells);
    this.shade = new Float32Array(cells);
    this.heat = new Float32Array(cells);
    this.shield = new Float32Array(cells);
    for (let i = 0; i < cells; i++) {
      if (kept && i < kept.glyph.length) {
        this.glyph[i] = kept.glyph[i];
        this.hot[i] = kept.hot[i];
        this.shade[i] = kept.shade[i];
        this.heat[i] = kept.heat[i];
      } else {
        this.glyph[i] = this.hot[i] = randomIndex();
        this.shade[i] = 0.3 + Math.random() * 0.7;
      }
    }
    if (kept) {
      for (const i of this.active) if (i >= cells) this.active.delete(i);
    } else {
      this.active.clear();
    }
    this.refresh();
  }

  // Glyphs behind text stay dim so the text is always readable.
  measureShield() {
    this.shield.fill(1);
    const origin = this.canvas.getBoundingClientRect();
    const range = document.createRange();
    const pad = 6;
    for (const element of document.querySelectorAll("[data-shield]")) {
      // The header is fixed, so it's measured where it sits when the page is at the top, not where it floats now.
      const shift = element.closest(".bar") ? window.scrollY : 0;
      range.selectNodeContents(element);
      for (const rect of range.getClientRects()) {
        const top = rect.top - shift;
        const bottom = rect.bottom - shift;
        if (bottom < origin.top || top > origin.bottom) continue;
        const c0 = Math.max(0, Math.floor((rect.left - origin.left - pad) / this.cellW));
        const c1 = Math.min(this.cols - 1, Math.floor((rect.right - origin.left + pad) / this.cellW));
        const r0 = Math.max(0, Math.floor((top - origin.top - pad) / this.cellH));
        const r1 = Math.min(this.rows - 1, Math.floor((bottom - origin.top + pad) / this.cellH));
        for (let row = r0; row <= r1; row++) {
          this.shield.fill(0.15, row * this.cols + c0, row * this.cols + c1 + 1);
        }
      }
    }
  }

  refresh() {
    if (!this.cols) return;
    this.measureShield();
    const style = getComputedStyle(this.host);
    this.glyphColor = style.getPropertyValue("--glyph").trim();
    this.glowColor = (style.getPropertyValue("--glyph-lit") || style.getPropertyValue("--glow")).trim();
    const ctx = this.baseCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.font = this.fonts[0];
    ctx.fillStyle = this.glyphColor;
    for (let row = 0, i = 0; row < this.rows; row++) {
      const fade = this.fade[row];
      if (fade <= 0) {
        i += this.cols;
        continue;
      }
      for (let col = 0; col < this.cols; col++, i++) {
        ctx.globalAlpha = this.shade[i] * this.shield[i] * fade;
        ctx.fillText(GLYPHS[this.glyph[i]], (col + 0.5) * this.cellW, (row + 0.5) * this.cellH);
      }
    }
    ctx.globalAlpha = 1;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.base, 0, 0, this.width, this.height);
    for (const i of this.active) this.drawCell(i);
  }

  ignite(x, y, strength = 1, radius = this.radius) {
    const { cellW, cellH, cols, rows } = this;
    const c0 = Math.max(0, Math.floor((x - radius) / cellW));
    const c1 = Math.min(cols - 1, Math.floor((x + radius) / cellW));
    const r0 = Math.max(0, Math.floor((y - radius) / cellH));
    const r1 = Math.min(rows - 1, Math.floor((y + radius) / cellH));
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const distance = Math.hypot((col + 0.5) * cellW - x, (row + 0.5) * cellH - y);
        if (distance >= radius) continue;
        const i = row * cols + col;
        const heat = strength * (1 - distance / radius) ** 2;
        if (heat > this.heat[i]) this.heat[i] = heat;
        if (Math.random() < 0.06 * heat) this.hot[i] = randomIndex();
        this.active.add(i);
      }
    }
  }

  twinkle(count) {
    for (let k = 0; k < count; k++) {
      const i = Math.floor(Math.random() * this.glyph.length);
      // Glyphs behind text, or where the field has faded out, would twinkle unseen.
      if (this.shield[i] < 1 || this.fade[Math.floor(i / this.cols)] < 0.05) continue;
      this.heat[i] = Math.max(this.heat[i], 0.25 + Math.random() * 0.45);
      this.hot[i] = randomIndex();
      this.active.add(i);
    }
  }

  step(dt) {
    const decay = 0.94 ** (dt / 16.7);
    for (const i of this.active) {
      const heat = (this.heat[i] *= decay);
      if (heat < 0.3) this.hot[i] = this.glyph[i];
      if (heat < 0.02) {
        this.heat[i] = 0;
        this.active.delete(i);
      }
      this.drawCell(i);
    }
    return this.active.size > 0;
  }

  drawCell(i) {
    const { ctx, cellW, cellH, dpr } = this;
    const row = Math.floor(i / this.cols);
    const x = (i % this.cols) * cellW;
    const y = row * cellH;
    const heat = this.heat[i];
    ctx.clearRect(x, y, cellW, cellH);
    if (heat < 1) {
      ctx.globalAlpha = 1 - heat;
      ctx.drawImage(this.base, x * dpr, y * dpr, cellW * dpr, cellH * dpr, x, y, cellW, cellH);
    }
    if (heat > 0.01) {
      ctx.globalAlpha = Math.min(1, heat * 1.25) * (this.shield[i] < 1 ? 0.3 : 1) * this.fade[row];
      // Setting a font or a colour means parsing it, so each is only set when it changes.
      if (this.fill !== this.glowColor) ctx.fillStyle = this.fill = this.glowColor;
      const font = this.fonts[heat > 0.6 ? 2 : heat > 0.3 ? 1 : 0];
      if (this.font !== font) ctx.font = this.font = font;
      ctx.fillText(GLYPHS[this.hot[i]], x + cellW / 2, y + cellH / 2);
    }
    ctx.globalAlpha = 1;
  }
}

const fields = [...document.querySelectorAll("canvas.field")].map((canvas) => new GlyphField(canvas));

// Silk: in the sections without glyphs, a ribbon of fine threads drifts slowly, folds like fabric
// and parts under the pointer. Each canvas picks the path of its ribbon with data-silk.
const TAU = Math.PI * 2;
const SILK_PATHS = {
  rise: (u) => 0.9 - 0.58 * u, // About: from the bottom left up behind the principle
  flow: (u) => 0.3 + 0.36 * u, // Services: across the band, behind the cards
  low: (u) => 0.9 - 0.1 * u, // Process: along the foot of the section, under the steps
};
// The drift moves each thread less than a pixel per frame, so 20 frames a second look as smooth as 60.
const DRIFT = 50;
const THREAD = 0.8;
// Scales the alpha of an rgba() colour, so a finer line can carry the weight of a wider one.
const strengthen = (rgba, factor) => rgba.trim().replace(/([\d.]+)\)$/, (_, alpha) => `${Math.min(1, alpha * factor).toFixed(3)})`);

class SilkField {
  constructor(canvas) {
    this.canvas = canvas;
    this.host = canvas.parentElement;
    this.ctx = canvas.getContext("2d");
    this.path = SILK_PATHS[canvas.dataset.silk] ?? SILK_PATHS.flow;
    this.visible = false;
    this.width = 0;
    this.time = 0;
    this.drawn = 0;
    // Where the threads part, eased so they open and close smoothly.
    this.px = 0;
    this.py = 0;
    this.force = 0;
  }

  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const compact = width < 640;
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dpr = dpr;
    // A line no wider than a device pixel is drawn as a hairline, which costs the GPU almost nothing; a wider one
    // goes through the full stroker, which on high-density screens cost a hundred times more on every frame.
    // So each thread stays just under a device pixel, and its colour carries the weight of the line it replaces.
    const device = THREAD * dpr;
    this.lineWidth = device < 1 ? THREAD : 0.98 / dpr;
    this.ink = device < 1 ? 1 : device / 0.98;
    this.threads = compact ? 18 : 28;
    this.gap = compact ? 5.5 : 7;
    this.spacing = compact ? 8 : 10;
    this.radius = compact ? 110 : 170;
    this.measure();
    this.refresh();
  }

  // The threads fade out behind text, so it always reads cleanly, and towards the sides of the section.
  // The mask is drawn at an eighth of the size, blurred once and stretched over the threads, which softens it
  // further. Blurring every box at full size, as before, held up the page for most of a second.
  measure() {
    if (!this.width) return;
    const scale = 1 / 8;
    const origin = this.canvas.getBoundingClientRect();
    this.mask ??= document.createElement("canvas");
    const mask = this.mask;
    mask.width = Math.max(1, Math.ceil(this.width * scale));
    mask.height = Math.max(1, Math.ceil(this.height * scale));
    const ctx = mask.getContext("2d");
    const boxes = new Path2D();
    const range = document.createRange();
    for (const element of this.host.querySelectorAll("h2, h3, p, li, dt, dd, .area-icon, .btn")) {
      range.selectNodeContents(element);
      for (const rect of range.getClientRects()) {
        boxes.rect((rect.left - origin.left - 14) * scale, (rect.top - origin.top - 10) * scale, (rect.width + 28) * scale, (rect.height + 20) * scale);
      }
    }
    ctx.filter = "blur(0.75px)";
    ctx.globalAlpha = 0.92;
    ctx.fill(boxes);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    const sides = ctx.createLinearGradient(0, 0, mask.width, 0);
    sides.addColorStop(0, "#000");
    sides.addColorStop(0.12, "rgba(0, 0, 0, 0)");
    sides.addColorStop(0.88, "rgba(0, 0, 0, 0)");
    sides.addColorStop(1, "#000");
    ctx.fillStyle = sides;
    ctx.fillRect(0, 0, mask.width, mask.height);
    if (this.color) this.draw();
  }

  refresh() {
    if (!this.width) return;
    const style = getComputedStyle(this.host);
    this.color = strengthen(style.getPropertyValue("--thread"), this.ink);
    this.lit = strengthen(style.getPropertyValue("--thread-lit"), this.ink);
    // The same colour, fully transparent, so gradients fade without going grey.
    this.clear = this.lit.replace(/[\d.]+\)$/, "0)");
    this.draw();
  }

  pluck(x, y) {
    this.px = x;
    this.py = y;
    this.force = 1;
  }

  // Runs while the section is in view. The drift redraws 20 times a second, and waits while the page scrolls;
  // the pointer redraws at full rate, so the threads follow it closely. Returns whether the pointer still
  // moves the threads, which needs the next frame.
  step(now, x, y) {
    const inside = x !== null;
    if (inside && this.force < 0.02) {
      this.px = x;
      this.py = y;
    } else if (inside) {
      this.px += (x - this.px) * 0.25;
      this.py += (y - this.py) * 0.25;
    }
    this.force += ((inside ? 1 : 0) - this.force) * 0.1;
    const moving = this.force >= 0.002;
    if (!moving && (now - this.drawn < DRIFT - 5 || scrolling(now))) return false;
    this.drawn = now;
    this.time = now / 1000;
    this.draw();
    return moving;
  }

  draw() {
    const { ctx, width: w, height: h, threads, gap, spacing, radius, force, px, py, time: t } = this;
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    const main = new Path2D();
    const accent = new Path2D();
    const half = (threads - 1) / 2;
    for (let i = 0; i < threads; i++) {
      const path = i % 4 === 1 ? accent : main;
      for (let x = -spacing; x <= w + spacing; x += spacing) {
        const u = x / w;
        // The ribbon bends, its threads gather and spread like folds, and each one ripples a little.
        const bend = Math.sin(TAU * (u * 0.8 + t * 0.012)) * h * 0.04;
        const fold = 0.62 + 0.38 * Math.sin(TAU * (u * 1.3 + t * 0.03) + 0.7);
        const ripple = 3 * Math.sin(TAU * (u * 2.4 - t * 0.045) + i * 0.32);
        let y = this.path(u) * h + bend + (i - half) * gap * fold + ripple;
        if (force > 0.002) {
          const dx = x - px;
          const dy = y - py;
          const distance = Math.hypot(dx, dy);
          if (distance < radius) y += force * (1 - distance / radius) ** 2 * 28 * (dy / (Math.abs(dy) + 12));
        }
        if (x === -spacing) path.moveTo(x, y);
        else path.lineTo(x, y);
      }
    }
    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.color;
    ctx.stroke(main);
    // One thread in four is drawn twice, so the ribbon has the uneven sheen of real silk.
    ctx.stroke(accent);
    ctx.stroke(accent);

    // A slow sheen runs along the ribbon, like light across silk.
    if (motion) {
      const sx = ((t * 0.06) % 1.4 - 0.2) * w;
      const sheen = ctx.createLinearGradient(sx - 240, 0, sx + 240, 0);
      sheen.addColorStop(0, this.clear);
      sheen.addColorStop(0.5, this.lit);
      sheen.addColorStop(1, this.clear);
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = sheen;
      ctx.stroke(main);
      ctx.stroke(accent);
    }

    // Under the pointer the parted threads catch the light.
    if (force > 0.01) {
      const glow = ctx.createRadialGradient(px, py, 0, px, py, radius * 1.1);
      glow.addColorStop(0, this.lit);
      glow.addColorStop(1, this.clear);
      ctx.globalAlpha = force;
      ctx.strokeStyle = glow;
      ctx.stroke(main);
      ctx.stroke(accent);
    }

    if (this.mask) {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(this.mask, 0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.globalAlpha = 1;
  }
}

const silks = [...document.querySelectorAll("canvas.silk-field")].map((canvas) => new SilkField(canvas));
let pointer = null;
let raf = 0;
let later = 0;
let last = 0;

function wake() {
  if (!raf && motion) raf = requestAnimationFrame(frame);
}

// Between frames of ambient motion the loop sleeps, instead of waking up on every refresh of the display.
function wakeLater(delay) {
  if (!later && motion) {
    later = setTimeout(() => {
      later = 0;
      wake();
    }, delay);
  }
}

function frame(now) {
  raf = 0;
  const dt = last ? Math.min(64, now - last) : 16.7;
  // Under the pointer everything follows at full rate. Twinkles fading out run at about 30 frames a second
  // and the silk drift at 20, which look the same at a fraction of the work.
  let busy = false;
  let fading = false;
  let drifting = false;
  for (const field of fields) {
    if (!field.visible || !field.cols) continue;
    const rect = field.canvas.getBoundingClientRect();
    const inside =
      pointer !== null &&
      pointer.x >= rect.left &&
      pointer.x < rect.right &&
      pointer.y >= rect.top &&
      pointer.y < rect.bottom;
    if (inside) {
      const x = pointer.x - rect.left;
      const y = pointer.y - rect.top;
      field.ignite(x, y);
      field.moveLight(x, y);
    }
    if (inside !== field.lit) {
      field.lit = inside;
      field.host.classList.toggle("is-lit", inside);
    }
    if (field.step(dt)) fading = true;
    if (inside) busy = true;
  }
  for (const silk of silks) {
    if (!silk.visible || !silk.width) continue;
    const rect = silk.canvas.getBoundingClientRect();
    const inside =
      pointer !== null &&
      pointer.x >= rect.left &&
      pointer.x < rect.right &&
      pointer.y >= rect.top &&
      pointer.y < rect.bottom;
    if (silk.step(now, inside ? pointer.x - rect.left : null, inside ? pointer.y - rect.top : null)) busy = true;
    else drifting = true;
  }
  last = busy || fading ? now : 0;
  if (busy) wake();
  else if (fading) wakeLater(33);
  else if (drifting) wakeLater(DRIFT);
}

let twinkleTimer = 0;

function setTwinkle(on) {
  if (on && motion && !twinkleTimer && fields.length) {
    twinkleTimer = setInterval(() => {
      if (scrolling()) return;
      for (const field of fields) {
        if (field.visible && field.cols) field.twinkle(finePointer ? 2 : 4);
      }
      wake();
    }, 160);
  } else if (!on && twinkleTimer) {
    clearInterval(twinkleTimer);
    twinkleTimer = 0;
  }
}

if (motion && (fields.length || silks.length)) {
  addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
      wake();
    },
    { passive: true },
  );

  // Touch has no hover, so a tap lights the glyphs once where the finger lands.
  addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType !== "touch") return;
      for (const field of fields) {
        const rect = field.canvas.getBoundingClientRect();
        const { clientX: x, clientY: y } = event;
        if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) continue;
        field.ignite(x - rect.left, y - rect.top, 0.9);
      }
      for (const silk of silks) {
        const rect = silk.canvas.getBoundingClientRect();
        const { clientX: x, clientY: y } = event;
        if (x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom) silk.pluck(x - rect.left, y - rect.top);
      }
      wake();
    },
    { passive: true },
  );

  const forgetPointer = () => {
    pointer = null;
    wake();
  };
  root.addEventListener("mouseleave", forgetPointer);
  addEventListener("blur", forgetPointer);
  document.addEventListener("visibilitychange", () => setTwinkle(!document.hidden));
}

const visibility = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const field = [...fields, ...silks].find((candidate) => candidate.canvas === entry.target);
    if (field) field.visible = entry.isIntersecting;
    // Text slides in as a section is revealed, so the silk measures it again once it has settled.
    if (field instanceof SilkField && entry.isIntersecting) {
      field.measure();
      setTimeout(() => field.measure(), 800);
    }
  }
  wake();
});

// Only the canvases whose size changed are redrawn, as when a service folds open on a phone.
let resizeFrame = 0;
const resized = new Set();
const sizes = new ResizeObserver((entries) => {
  for (const entry of entries) resized.add(entry.target);
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    for (const field of [...fields, ...silks]) if (resized.has(field.canvas)) field.resize();
    resized.clear();
  });
});

// Text resolves from random glyphs, left to right, like output arriving.
// A new call on the same element takes over from one still running.
const decoding = new WeakMap();

function decode(element, duration, text = element.dataset.text ?? element.textContent) {
  element.dataset.text = text;
  element.style.opacity = "1";
  const run = {};
  decoding.set(element, run);
  if (!motion || !duration) {
    element.textContent = text;
    return;
  }
  const chars = [...text];
  const settle = chars.map((_, i) => (i / chars.length) * 0.65 + Math.random() * 0.35);
  const start = performance.now();
  let tick = 0;
  const step = (now) => {
    if (decoding.get(element) !== run) return;
    const progress = (now - start) / duration;
    if (progress >= 1) {
      element.textContent = text;
      return;
    }
    if (tick++ % 2 === 0) {
      element.textContent = chars.map((c, i) => (c === " " || progress >= settle[i] ? c : randomGlyph())).join("");
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const reveals = document.querySelectorAll(".reveal");

if (motion) {
  const revealer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        revealer.unobserve(entry.target);
        entry.target.classList.add("is-in");
        entry.target.querySelectorAll("[data-decode]").forEach((element) => decode(element, 700));
      }
    },
    { rootMargin: "0px 0px -5% 0px" },
  );
  reveals.forEach((element) => {
    revealer.observe(element);
    // The text slides into place as it appears; measure what the glyphs avoid once it lands.
    element.addEventListener("transitionend", (event) => {
      if (event.target !== element || event.propertyName !== "transform") return;
      for (const field of fields) if (field.host.contains(element)) field.refresh();
    });
  });
} else {
  reveals.forEach((element) => element.classList.add("is-in"));
}

/* Header: transparent over the hero, solid once the page moves */

const bar = document.querySelector(".bar");
const hero = document.querySelector(".hero");

function updateBar() {
  bar?.classList.toggle("is-solid", !hero || window.scrollY > 8);
}

addEventListener(
  "scroll",
  () => {
    scrolledAt = performance.now();
    updateBar();
  },
  { passive: true },
);
updateBar();

/* Section index: the header links and the margin index follow the section being read */

const spyLinks = [...document.querySelectorAll("[data-spy]")];
const spied = [...new Set(spyLinks.map((link) => link.hash))]
  .map((hash) => document.getElementById(hash.slice(1)))
  .filter(Boolean);

if (spied.length) {
  let current = "";
  const mark = () => {
    for (const link of spyLinks) {
      if (link.hash === current) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  };
  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const hash = `#${entry.target.id}`;
        if (entry.isIntersecting) current = hash;
        else if (current === hash) current = "";
      }
      mark();
    },
    { rootMargin: "-40% 0px -55% 0px" },
  );
  spied.forEach((section) => spy.observe(section));
}

/* Services: what's included folds away on phones and stays open on wider screens */

const wideScreen = matchMedia("(min-width: 40rem)");
const syncFolds = () => {
  for (const details of document.querySelectorAll(".area-more")) details.open = wideScreen.matches;
};
wideScreen.addEventListener("change", syncFolds);
syncFolds();

/* Service cards: a card's icon resolves again on the way in */

if (motion && finePointer) {
  for (const card of document.querySelectorAll(".area")) {
    const icon = card.querySelector(".area-icon");
    card.addEventListener("pointerenter", (event) => {
      if (icon && event.pointerType === "mouse") decode(icon, 450);
    });
  }
}

/* Copy the email address. Without JavaScript the link opens the mail app; without clipboard access the address
   gets selected so it can be copied by hand. */

document.querySelectorAll("[data-copy]").forEach((chip, index) => {
  const address = chip.querySelector("span") || chip;
  const hint = chip.parentElement.querySelector("[data-copy-hint]");
  if (hint) {
    hint.textContent = TEXT.copyHint;
    hint.dataset.text = TEXT.copyHint;
    hint.id ||= `copy-hint-${index}`;
    chip.setAttribute("aria-describedby", hint.id);
  }
  let timer = 0;
  chip.addEventListener("click", async (event) => {
    event.preventDefault();
    let copied = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(chip.dataset.copy);
        copied = true;
      } catch {}
    }
    if (copied) chip.dataset.copied = "";
    else getSelection()?.selectAllChildren(address);
    if (hint) {
      hint.dataset.copied = "";
      decode(hint, 450, copied ? TEXT.copied : TEXT.selected);
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      delete chip.dataset.copied;
      if (hint) {
        delete hint.dataset.copied;
        decode(hint, 450, TEXT.copyHint);
      }
    }, copied ? 2200 : 6000);
  });
});

/* Contact form: checks the fields and sends in place, without leaving the page.
   Without JavaScript the browser checks the fields and posts the form normally. */

const contactForm = document.querySelector("[data-contact]");
// The same check the Worker makes, so an address is never accepted here and turned away there.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Once a message is on its way, the glyphs around the button light up in a wide burst behind the glass.
function celebrate(element) {
  const field = fields.find((candidate) => candidate.host.contains(element));
  if (!field || !motion || !field.cols) return;
  const box = field.canvas.getBoundingClientRect();
  const spot = element.getBoundingClientRect();
  field.ignite(spot.left + spot.width / 2 - box.left, spot.top + spot.height / 2 - box.top, 1, field.radius * 2.4);
  wake();
}

if (contactForm) {
  const status = contactForm.querySelector("[data-form-status]");
  const button = contactForm.querySelector('button[type="submit"]');
  const idleLabel = button.textContent;
  const topic = contactForm.querySelector('select[name="topic"]');
  const message = contactForm.querySelector('textarea[name="message"]');

  // The chosen topic's sign resolves on a platinum plate at the start of the field, like the text across the site.
  const topicBox = topic?.closest(".select");
  const sign = topicBox?.querySelector(".select-glyph")?.appendChild(document.createElement("span"));
  const showTopic = (animate) => {
    if (!sign) return;
    const glyph = topic.selectedOptions[0]?.dataset.glyph;
    if (!glyph) {
      delete topicBox.dataset.glyph;
      return;
    }
    topicBox.dataset.glyph = glyph;
    decode(sign, animate ? 450 : 0, glyph);
  };
  topic?.addEventListener("change", () => showTopic(true));
  // A topic the browser kept from an earlier visit shows its sign too.
  addEventListener("pageshow", () => showTopic(false));
  showTopic(false);

  // The message box grows as it's written. Browsers that can't size it on their own get the same from here.
  const growsHere = message && !CSS.supports("field-sizing", "content");
  const fitMessage = () => {
    if (!growsHere) return;
    message.style.height = "auto";
    message.style.height = `${message.scrollHeight + 2}px`;
  };
  if (growsHere) {
    message.dataset.grows = "";
    message.addEventListener("input", fitMessage);
  }

  // The page checks the fields itself, so each note appears under its field, in the page's language and style,
  // instead of the browser's own bubble.
  contactForm.noValidate = true;
  const checks = {
    name: (value) => value.trim() !== "",
    email: (value) => EMAIL_PATTERN.test(value.trim()),
    message: (value) => value.trim() !== "",
  };
  const controls = [...contactForm.elements].filter((control) => Object.hasOwn(checks, control.name));

  function check(control) {
    const field = control.closest(".form-field");
    let note = field.querySelector(".field-error");
    if (checks[control.name](control.value)) {
      note?.remove();
      delete field.dataset.invalid;
      control.removeAttribute("aria-invalid");
      control.removeAttribute("aria-describedby");
      return true;
    }
    if (!note) {
      note = document.createElement("p");
      note.className = "field-error";
      note.id = `${control.id}-error`;
      field.append(note);
    }
    note.textContent = TEXT.missing[control.name];
    field.dataset.invalid = "";
    control.setAttribute("aria-invalid", "true");
    control.setAttribute("aria-describedby", note.id);
    return false;
  }

  // A field that was flagged is checked again as it's corrected.
  contactForm.addEventListener("input", (event) => {
    const control = event.target;
    if (controls.includes(control) && control.closest(".form-field").dataset.invalid !== undefined) check(control);
  });

  // Once the message is on its way, a confirmation takes the place of the fields, and the title takes focus
  // so screen readers announce it.
  let done = null;
  function confirmSent(name, email) {
    if (!done) {
      done = document.createElement("div");
      done.className = "form-done";
      done.innerHTML =
        '<span class="form-done-plate" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3 8.5 3.2 3L13 4.5"/></svg></span>' +
        '<h3 class="form-done-title" tabindex="-1" aria-describedby="form-done-text"></h3>' +
        '<p class="form-done-text" id="form-done-text"></p>' +
        '<button class="form-done-again" type="button"><span></span><svg class="arrow-right" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5"/></svg></button>';
      done.querySelector(".form-done-title").textContent = TEXT.sentTitle;
      done.querySelector(".form-done-again span").textContent = TEXT.writeAgain;
      done.querySelector(".form-done-again").addEventListener("click", () => {
        done.hidden = true;
        delete contactForm.dataset.state;
        controls[0]?.focus();
      });
      contactForm.append(done);
    }
    done.querySelector(".form-done-text").textContent = TEXT.sent(name, email);
    done.hidden = false;
    contactForm.dataset.state = "sent";
    done.querySelector(".form-done-title").focus({ preventScroll: true });
  }

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const invalid = controls.filter((control) => !check(control));
    if (invalid.length) {
      invalid[0].focus();
      return;
    }
    const data = new FormData(contactForm);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    delete contactForm.dataset.state;
    status.textContent = "";
    button.disabled = true;
    button.textContent = TEXT.sending;
    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || TEXT.failed);
      contactForm.reset();
      showTopic(false);
      fitMessage();
      confirmSent(name.split(/\s+/)[0], email);
      celebrate(button);
    } catch (error) {
      contactForm.dataset.state = "error";
      status.textContent = error instanceof TypeError ? TEXT.failed : error.message;
    } finally {
      button.disabled = false;
      button.textContent = idleLabel;
    }
  });
}

/* Theme */

const toggle = document.querySelector("[data-theme-toggle]");
const themeMetas = [...document.querySelectorAll('meta[name="theme-color"]')];
const themeDefaults = themeMetas.map((meta) => meta.content);
const currentTheme = () => root.dataset.theme || (systemDark.matches ? "dark" : "light");

function applyTheme(repaint = true) {
  const dark = currentTheme() === "dark";
  toggle?.setAttribute("aria-label", dark ? TEXT.toLight : TEXT.toDark);
  const background = getComputedStyle(root).getPropertyValue("--bg").trim();
  themeMetas.forEach((meta, i) => {
    meta.content = root.dataset.theme ? background : themeDefaults[i];
  });
  if (repaint) [...fields, ...silks].forEach((field) => field.refresh());
}

toggle?.addEventListener("click", () => {
  root.dataset.theme = currentTheme() === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("theme", root.dataset.theme);
  } catch {}
  applyTheme();
});

systemDark.addEventListener("change", () => {
  if (!root.dataset.theme) applyTheme();
});

/* Start */

root.classList.add("ready");
applyTheme(false);
for (const field of [...fields, ...silks]) {
  visibility.observe(field.canvas);
  sizes.observe(field.canvas);
}
document.fonts?.ready.then(() => {
  fields.forEach((field) => field.refresh());
  silks.forEach((silk) => silk.measure());
});

if (motion) {
  setTimeout(() => document.querySelectorAll(".hero [data-decode]").forEach((element) => decode(element, 1200)), 250);
  setTwinkle(!document.hidden);
} else {
  document.querySelectorAll("[data-decode]").forEach((element) => decode(element, 0));
}
