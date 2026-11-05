// The glyph field, the decoding text, the copy button and the theme toggle.

const root = document.documentElement;
const motion = root.classList.contains("motion");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const systemDark = matchMedia("(prefers-color-scheme: dark)");

const GLYPHS = "01<>/\\|{}[]()+=-_*~:;.#$%&@!?";
const MONO = '"Geist Mono", ui-monospace, monospace';
const randomIndex = () => Math.floor(Math.random() * GLYPHS.length);
const randomGlyph = () => GLYPHS[randomIndex()];

// A grid of faint glyphs that light up around the pointer and fade out behind it.
// The quiet grid is drawn once to an offscreen canvas; each frame only repaints lit cells.
class GlyphField {
  constructor(canvas) {
    this.canvas = canvas;
    this.host = canvas.parentElement;
    this.ctx = canvas.getContext("2d");
    this.base = document.createElement("canvas");
    this.baseCtx = this.base.getContext("2d");
    this.active = new Set();
    this.visible = false;
    this.lit = false;
    this.cols = 0;
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
    this.cols = Math.ceil(width / this.cellW);
    this.rows = Math.ceil(height / this.cellH);
    const cells = this.cols * this.rows;
    this.glyph = new Uint8Array(cells);
    this.hot = new Uint8Array(cells);
    this.shade = new Float32Array(cells);
    this.heat = new Float32Array(cells);
    this.shield = new Float32Array(cells);
    for (let i = 0; i < cells; i++) {
      this.glyph[i] = this.hot[i] = randomIndex();
      this.shade[i] = 0.3 + Math.random() * 0.7;
    }
    this.active.clear();
    this.refresh();
  }

  // Glyphs behind text stay dim so the text is always readable.
  measureShield() {
    this.shield.fill(1);
    const origin = this.canvas.getBoundingClientRect();
    const range = document.createRange();
    const pad = 6;
    for (const element of document.querySelectorAll("[data-shield]")) {
      range.selectNodeContents(element);
      for (const rect of range.getClientRects()) {
        if (rect.bottom < origin.top || rect.top > origin.bottom) continue;
        const c0 = Math.max(0, Math.floor((rect.left - origin.left - pad) / this.cellW));
        const c1 = Math.min(this.cols - 1, Math.floor((rect.right - origin.left + pad) / this.cellW));
        const r0 = Math.max(0, Math.floor((rect.top - origin.top - pad) / this.cellH));
        const r1 = Math.min(this.rows - 1, Math.floor((rect.bottom - origin.top + pad) / this.cellH));
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
    this.glowColor = style.getPropertyValue("--glow").trim();
    const ctx = this.baseCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.font = `400 ${this.fontSize}px ${MONO}`;
    ctx.fillStyle = this.glyphColor;
    for (let row = 0, i = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++, i++) {
        ctx.globalAlpha = this.shade[i] * this.shield[i];
        ctx.fillText(GLYPHS[this.glyph[i]], (col + 0.5) * this.cellW, (row + 0.5) * this.cellH);
      }
    }
    ctx.globalAlpha = 1;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.base, 0, 0, this.width, this.height);
    for (const i of this.active) this.drawCell(i);
  }

  ignite(x, y, strength = 1) {
    const { radius, cellW, cellH, cols, rows } = this;
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
      if (this.shield[i] < 1) continue;
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
    const x = (i % this.cols) * cellW;
    const y = Math.floor(i / this.cols) * cellH;
    const heat = this.heat[i];
    ctx.clearRect(x, y, cellW, cellH);
    if (heat < 1) {
      ctx.globalAlpha = 1 - heat;
      ctx.drawImage(this.base, x * dpr, y * dpr, cellW * dpr, cellH * dpr, x, y, cellW, cellH);
    }
    if (heat > 0.01) {
      ctx.globalAlpha = Math.min(1, heat * 1.25) * (this.shield[i] < 1 ? 0.3 : 1);
      ctx.fillStyle = this.glowColor;
      ctx.font = `${heat > 0.6 ? 700 : heat > 0.3 ? 500 : 400} ${this.fontSize}px ${MONO}`;
      ctx.fillText(GLYPHS[this.hot[i]], x + cellW / 2, y + cellH / 2);
    }
    ctx.globalAlpha = 1;
  }
}

const fields = [...document.querySelectorAll("canvas.field")].map((canvas) => new GlyphField(canvas));
let pointer = null;
let raf = 0;
let last = 0;

function wake() {
  if (!raf && motion) raf = requestAnimationFrame(frame);
}

function frame(now) {
  raf = 0;
  const dt = last ? Math.min(64, now - last) : 16.7;
  let busy = false;
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
      field.host.style.setProperty("--mx", `${x}px`);
      field.host.style.setProperty("--my", `${y}px`);
    }
    if (inside !== field.lit) {
      field.lit = inside;
      field.host.classList.toggle("is-lit", inside);
    }
    busy = field.step(dt) || inside || busy;
  }
  last = busy ? now : 0;
  if (busy) wake();
}

let twinkleTimer = 0;

function setTwinkle(on) {
  if (on && motion && !twinkleTimer) {
    twinkleTimer = setInterval(() => {
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

if (motion) {
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
    const field = fields.find((candidate) => candidate.canvas === entry.target);
    if (field) field.visible = entry.isIntersecting;
  }
  wake();
});

let resizeFrame = 0;
const sizes = new ResizeObserver(() => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => fields.forEach((field) => field.resize()));
});

// Text resolves from random glyphs, left to right, like output arriving.
function decode(element, duration) {
  const text = element.dataset.text ?? element.textContent;
  element.dataset.text = text;
  element.style.opacity = "1";
  if (!motion) {
    element.textContent = text;
    return;
  }
  const chars = [...text];
  const settle = chars.map((_, i) => (i / chars.length) * 0.65 + Math.random() * 0.35);
  const start = performance.now();
  let tick = 0;
  const step = (now) => {
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
    { rootMargin: "0px 0px -12% 0px" },
  );
  reveals.forEach((element) => {
    revealer.observe(element);
    // The text slides into place as it appears; measure what the glyphs avoid once it lands.
    element.addEventListener("transitionend", (event) => {
      if (event.target !== element || event.propertyName !== "transform") return;
      for (const field of fields) if (field.host.contains(element)) field.refresh();
    });
  });
}

/* Copy the email address */

for (const button of document.querySelectorAll("[data-copy]")) {
  const label = button.querySelector("[data-copy-label]");
  let timer = 0;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
    } catch {
      location.href = `mailto:${button.dataset.copy}`;
      return;
    }
    button.dataset.copied = "";
    label.textContent = "Copied";
    clearTimeout(timer);
    timer = setTimeout(() => {
      delete button.dataset.copied;
      label.textContent = "Copy";
    }, 1800);
  });
}

/* Contact form: sends in place, without leaving the page. Without JavaScript it posts normally. */

const contactForm = document.querySelector("[data-contact]");

if (contactForm) {
  const status = contactForm.querySelector("[data-form-status]");
  const button = contactForm.querySelector('button[type="submit"]');
  const idleLabel = button.textContent;
  const fallback = "Your message couldn’t be sent. Please try again, or write to contact@mariohdz.com.";

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(contactForm);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    delete contactForm.dataset.state;
    status.textContent = "";
    button.disabled = true;
    button.textContent = "Sending…";
    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || fallback);
      contactForm.reset();
      contactForm.dataset.state = "sent";
      status.textContent = `Thanks, ${name.split(/\s+/)[0]}. Your message is on its way, and I’ll reply to ${email}.`;
    } catch (error) {
      contactForm.dataset.state = "error";
      status.textContent = error instanceof TypeError ? fallback : error.message;
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
  toggle?.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  const background = getComputedStyle(root).getPropertyValue("--bg").trim();
  themeMetas.forEach((meta, i) => {
    meta.content = root.dataset.theme ? background : themeDefaults[i];
  });
  if (repaint) fields.forEach((field) => field.refresh());
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
for (const field of fields) {
  visibility.observe(field.canvas);
  sizes.observe(field.canvas);
}
document.fonts?.ready.then(() => fields.forEach((field) => field.refresh()));

if (motion) {
  setTimeout(() => document.querySelectorAll(".hero [data-decode]").forEach((element) => decode(element, 1200)), 250);
  setTwinkle(!document.hidden);
} else {
  document.querySelectorAll("[data-decode]").forEach((element) => decode(element, 0));
}
