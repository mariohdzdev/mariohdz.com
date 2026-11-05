// The glyph field, the decoding text, the header and the section index,
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
      failed: "Your message couldn’t be sent. Please try again, or write to contact@mariohdz.com.",
      toLight: "Switch to light theme",
      toDark: "Switch to dark theme",
    };

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
  if (on && motion && !twinkleTimer && fields.length) {
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

if (motion && fields.length) {
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
} else {
  reveals.forEach((element) => element.classList.add("is-in"));
}

/* Header: transparent over the hero, solid once the page moves */

const bar = document.querySelector(".bar");
const hero = document.querySelector(".hero");

function updateBar() {
  bar?.classList.toggle("is-solid", !hero || window.scrollY > 8);
}

addEventListener("scroll", updateBar, { passive: true });
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

/* Service cards and the contact form: a light follows the pointer inside them, and a card's icon resolves again on the way in */

if (motion && finePointer) {
  for (const card of document.querySelectorAll("[data-spot]")) {
    const icon = card.querySelector(".area-icon");
    card.addEventListener(
      "pointermove",
      (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--sx", `${event.clientX - rect.left}px`);
        card.style.setProperty("--sy", `${event.clientY - rect.top}px`);
      },
      { passive: true },
    );
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

/* Contact form: sends in place, without leaving the page. Without JavaScript it posts normally. */

const contactForm = document.querySelector("[data-contact]");

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

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
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
      contactForm.dataset.state = "sent";
      status.textContent = TEXT.sent(name.split(/\s+/)[0], email);
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
