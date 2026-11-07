// The guided form at /start/ and /es/empezar/: four short steps instead of one long page, only the questions that
// fit the projects chosen, an estimate from the public prices and a confirmation with a reference to quote.
// Without JavaScript the whole form shows at once and posts normally. The Worker checks every answer again.

(() => {
  const form = document.querySelector("[data-start]");
  if (!form) return;

  const spanish = document.documentElement.lang.startsWith("es");
  const money = spanish ? (amount) => `${amount} USD` : (amount) => `$${amount.toLocaleString("en-US")}`;
  const TEXT = spanish
    ? {
        step: (n, total, name) => `Paso ${n} de ${total} · ${name}`,
        chooseProject: "Elige al menos una opción, o «Aún no lo sé».",
        missing: { name: "Escribe tu nombre.", email: "Revisa tu dirección de correo." },
        sending: "Enviando…",
        failed: "No se pudo enviar tu mensaje. Inténtalo de nuevo o escríbeme a contact@mariohdz.com.",
        estimate: "Tu estimación",
        from: "Desde",
        included: "Incluida",
        inPackage: "Ya forma parte del paquete de arranque",
        fixed: "El precio cerrado llega en tu plan, antes de empezar nada.",
        custom: "El precio cerrado llega en tu plan, cuando la idea esté clara.",
        plusCustom: "Lo hecho a tu medida se suma en tu plan, con su propio precio cerrado.",
        unsure: "Marca en el paso 2 qué está pasando y verás por dónde empezar.",
        checkUp: "La revisión técnica se descuenta del precio si sigues adelante.",
        mailboxes: (n) => `${n} ${n === 1 ? "dirección más" : "direcciones más"}`,
        extraPages: (amount) => `Más ${amount} por cada página a partir de la sexta.`,
        thanks: (name) => `Gracias, ${name}.`,
        reply: {
          email: "Te respondo en un día laborable, y todo seguirá por correo.",
          call: "Te respondo en un día laborable con dos o tres horarios para la llamada.",
          none: "Te respondo en un día laborable.",
        },
        writeTo: (email) => `Te escribiré a ${email}.`,
        reference: (ref) => `Referencia ${ref}`,
        fix: "¿No es tu dirección? Corrígela",
      }
    : {
        step: (n, total, name) => `Step ${n} of ${total} · ${name}`,
        chooseProject: "Choose at least one, or “Not sure yet”.",
        missing: { name: "Please add your name.", email: "Please check your email address." },
        sending: "Sending…",
        failed: "Your message couldn’t be sent. Please try again, or write to contact@mariohdz.com.",
        estimate: "Your estimate",
        from: "From",
        included: "Included",
        inPackage: "Already part of the launch package",
        fixed: "Your fixed price comes in your plan, before anything starts.",
        custom: "Your fixed price comes in your plan, once the idea is clear.",
        plusCustom: "Anything made for you is added in your plan, with its own fixed price.",
        unsure: "Choose what’s going on in step 2, and you’ll see where to start.",
        checkUp: "The tech check-up comes off the price if you go ahead.",
        mailboxes: (n) => `${n} more email ${n === 1 ? "address" : "addresses"}`,
        extraPages: (amount) => `Plus ${amount} for each page after five.`,
        thanks: (name) => `Thanks, ${name}.`,
        reply: {
          email: "I’ll reply within one business day, and everything stays by email.",
          call: "I’ll reply within one business day with two or three times for the call.",
          none: "I’ll reply within one business day.",
        },
        writeTo: (email) => `I’ll write to ${email}.`,
        reference: (ref) => `Reference ${ref}`,
        fix: "Not your address? Fix it",
      };

  const PRICES = JSON.parse(form.dataset.prices);
  // What can't be chosen together, as in src/start.mjs: one website at a time, business email is already part
  // of the launch package, and "not sure yet" stands alone.
  const SITES = ["launch-package", "website", "one-page"];
  const INCLUDED = { "launch-package": ["business-email"] };
  const ALONE = "unsure";
  // The address check main.js shares with the Worker, or a plain one if main.js isn't there.
  const ADDRESS = typeof EMAIL_PATTERN !== "undefined" ? EMAIL_PATTERN : /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const steps = [...form.querySelectorAll(".start-step")];
  const progress = document.querySelector("[data-start-progress]");
  const names = [...progress.querySelectorAll("li span:last-child")].map((span) => span.textContent);
  const count = form.querySelector("[data-start-count]");
  const line = form.querySelector("[data-start-line]");
  const back = form.querySelector("[data-start-back]");
  const next = form.querySelector("[data-start-next]");
  const send = form.querySelector('button[type="submit"]');
  const sendLabel = send.textContent;
  const status = form.querySelector("[data-form-status]");
  const projectError = form.querySelector('[data-start-error="project"]');
  const estimateBox = form.querySelector("[data-start-estimate]");
  const suggestBox = form.querySelector("[data-start-suggest]");
  const callBox = form.querySelector("[data-start-call]");
  const zone = form.querySelector("[data-start-zone]");
  const boxes = [...form.querySelectorAll('input[name="project"]')];

  let current = 1;
  let reached = 1;

  const projectBox = (key) => boxes.find((box) => box.value === key);
  const chosen = () => boxes.filter((box) => box.checked);
  const picked = (name) => form.querySelector(`input[name="${name}"]:checked:not(:disabled)`)?.value ?? null;
  const nameOf = (input) => input.closest("label").querySelector(".choice-name").textContent;

  // Shows and turns on what applies, hides and turns off the rest, so what's hidden is never sent.
  function toggle(element, on) {
    element.hidden = !on;
    if (element.matches("fieldset")) element.disabled = !on;
    else element.querySelectorAll("input, select, textarea").forEach((control) => (control.disabled = !on));
  }

  // What a second language or a Google Maps listing adds, for the website and its size (as in src/start.mjs).
  function extraPrice(extra, key, size) {
    const big = key === "website" || (key === "launch-package" && size === "five");
    if (extra === "languages") return big ? PRICES.secondLanguage.upToFive : PRICES.secondLanguage.onePage;
    if (extra === "listing") return key === "launch-package" ? 0 : PRICES.mapsListing;
    return 0;
  }

  // Keeps apart what can't go together, as each box is ticked.
  function settle(changed) {
    if (changed?.checked) {
      for (const box of boxes) {
        if (box === changed) continue;
        if (changed.value === ALONE || box.value === ALONE) box.checked = false;
        if (SITES.includes(changed.value) && SITES.includes(box.value)) box.checked = false;
      }
    }
    // What the launch package already includes waits, greyed, beside it.
    for (const [key, included] of Object.entries(INCLUDED)) {
      const on = projectBox(key).checked;
      for (const other of included) {
        const box = projectBox(other);
        const sub = box.closest("label").querySelector(".choice-sub");
        sub.dataset.text ??= sub.textContent;
        if (on) box.checked = false;
        box.disabled = on;
        sub.textContent = on ? TEXT.inPackage : sub.dataset.text;
      }
    }
  }

  // The questions that fit the projects chosen, in steps 2 and 3. Parents come before what they hold,
  // so a heading shows whenever one of its questions does.
  function applyProjects() {
    const keys = chosen().map((box) => box.value);
    const kinds = new Set(chosen().map((box) => box.dataset.kind));
    form.querySelectorAll(".start-step [data-kinds]").forEach((element) => toggle(element, element.dataset.kinds.split(" ").some((kind) => kinds.has(kind))));
    form.querySelectorAll("[data-only]").forEach((element) => toggle(element, element.dataset.only.split(" ").some((key) => keys.includes(key))));
    const site = keys.find((key) => SITES.includes(key));
    const size = picked("web_size");
    form.querySelectorAll("[data-extra]").forEach((sub) => {
      const amount = extraPrice(sub.dataset.extra, site, size);
      sub.textContent = amount ? `+${money(amount)}` : TEXT.included;
    });
    refresh();
  }

  // For "not sure yet": one worry points to its project, several to a check-up.
  function suggestion() {
    const worries = [...form.querySelectorAll('input[name="unsure_symptoms"]:checked:not(:disabled)')];
    if (!worries.length) return null;
    const box = projectBox(worries.length > 1 ? "check-up" : worries[0].dataset.suggests);
    return { key: box.value, name: nameOf(box), price: Number(box.dataset.price) };
  }

  // The estimate, from the same public prices as the Worker's: each project with where it starts and what its
  // extras add, then the total.
  function estimate() {
    const parts = [];
    let open = false;
    for (const box of chosen()) {
      const key = box.value;
      if (key === "custom") {
        open = true;
        continue;
      }
      if (key === ALONE) {
        const pick = suggestion();
        if (pick) parts.push({ name: pick.name, base: pick.price, lines: [], fixed: pick.key === "check-up" });
        else open = true;
        continue;
      }
      const part = { name: nameOf(box), base: Number(box.dataset.price), lines: [], fixed: key === "check-up" };
      if (box.dataset.kind === "web") {
        const size = picked("web_size");
        if (key === "launch-package" && size === "five") {
          part.lines.push([nameOf(form.querySelector('input[name="web_size"][value="five"]')), PRICES.upToFivePages]);
        }
        for (const extra of ["languages", "listing"]) {
          const feature = form.querySelector(`input[name="web_features"][value="${extra}"]`);
          const amount = extraPrice(extra, key, size);
          if (feature?.checked && amount) part.lines.push([nameOf(feature), amount]);
        }
      }
      const mailboxes = form.querySelector(`input[name="${box.dataset.kind}_mailboxes"]:not(:disabled)`);
      const wanted = Number(mailboxes?.value);
      if (Number.isInteger(wanted) && wanted > PRICES.includedMailboxes && wanted <= Number(mailboxes.max)) {
        const more = wanted - PRICES.includedMailboxes;
        part.lines.push([TEXT.mailboxes(more), more * PRICES.extraMailbox]);
      }
      parts.push(part);
    }
    if (!chosen().length) return null;
    const notes = [];
    if (picked("web_pages") === "more" && projectBox("website").checked) notes.push(TEXT.extraPages(money(PRICES.extraPage)));
    if (!parts.length) notes.push(chosen()[0].value === ALONE ? TEXT.unsure : TEXT.custom);
    else {
      if (open) notes.push(TEXT.plusCustom);
      if (parts.some((part) => part.fixed) && parts.length > 1) notes.push(TEXT.checkUp);
      notes.push(TEXT.fixed);
    }
    const total = parts.reduce((sum, part) => sum + part.base + part.lines.reduce((add, [, amount]) => add + amount, 0), 0);
    return { total: parts.length ? total : null, fixed: parts.length === 1 && parts[0].fixed && !open, parts, note: notes.join(" ") };
  }

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function showEstimate() {
    const result = estimate();
    estimateBox.hidden = !result;
    if (!result) return;
    estimateBox.replaceChildren(element("p", "start-estimate-label", TEXT.estimate));
    if (result.total !== null) {
      const total = element("p", "start-estimate-total");
      if (!result.fixed) total.append(element("span", "", `${TEXT.from} `));
      total.append(money(result.total));
      estimateBox.append(total);
      const rows = result.parts.flatMap((part) => [[part.name, money(part.base), false], ...part.lines.map(([name, amount]) => [name, `+${money(amount)}`, true])]);
      if (rows.length > 1) {
        const list = element("ul", "start-estimate-lines");
        for (const [name, amount, extra] of rows) {
          const row = element("li", extra ? "is-extra" : "");
          row.append(element("span", "", name), element("span", "", amount));
          list.append(row);
        }
        estimateBox.append(list);
      }
    }
    estimateBox.append(element("p", "start-estimate-note", result.note));
  }

  function refresh() {
    const pick = projectBox(ALONE).checked ? suggestion() : null;
    if (suggestBox) {
      suggestBox.hidden = !pick;
      if (pick) suggestBox.querySelector("[data-start-suggest-name]").textContent = `${pick.name} · ${pick.key === "check-up" ? money(pick.price) : `${TEXT.from} ${money(pick.price)}`}`;
    }
    if (callBox) toggle(callBox, picked("channel") === "call");
    showEstimate();
  }

  // The visitor's own time zone is chosen for them, and can be changed. A zone missing from the list joins it.
  const SAME_ZONE = {
    "America/Guatemala": "America/Tegucigalpa",
    "America/El_Salvador": "America/Tegucigalpa",
    "America/Managua": "America/Tegucigalpa",
    "America/Costa_Rica": "America/Tegucigalpa",
    "America/Lima": "America/Bogota",
    "America/Guayaquil": "America/Bogota",
    "America/Panama": "America/Bogota",
    "America/Detroit": "America/New_York",
    "America/Indiana/Indianapolis": "America/New_York",
    "America/Monterrey": "America/Mexico_City",
  };
  if (zone) {
    try {
      const own = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const value = SAME_ZONE[own] ?? own;
      if (value && ![...zone.options].some((choice) => choice.value === value) && /^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){1,2}$/.test(value)) {
        zone.add(new Option(value.replace(/_/g, " "), value));
      }
      if (value && !zone.value) zone.value = value;
    } catch {}
  }

  function showStep(n, { focus = true } = {}) {
    current = n;
    reached = Math.max(reached, n);
    steps.forEach((step) => (step.hidden = Number(step.dataset.step) !== n));
    back.hidden = n === 1;
    next.hidden = n === steps.length;
    send.hidden = n !== steps.length;
    count.textContent = TEXT.step(n, steps.length, names[n - 1]);
    line.style.transform = `scaleX(${n / steps.length})`;
    progress.querySelectorAll("li").forEach((item, i) => {
      const button = item.querySelector("button");
      item.dataset.state = i + 1 < n ? "done" : i + 1 === n ? "current" : "todo";
      button.disabled = i + 1 > reached;
      if (i + 1 === n) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    status.textContent = "";
    delete form.dataset.state;
    if (!focus) return;
    const title = [...steps[n - 1].querySelectorAll(".start-q")].find((heading) => !heading.closest("[hidden]"));
    title?.focus({ preventScroll: true });
    // The new step starts where the panel starts, below the header, if its top has gone out of view.
    const top = form.getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * 0.6) form.scrollIntoView({ block: "start" });
  }

  function forward() {
    if (current === 1 && !chosen().length) {
      projectError.textContent = TEXT.chooseProject;
      projectError.hidden = false;
      boxes[0].focus();
      return;
    }
    if (current < steps.length) showStep(current + 1);
  }

  next.addEventListener("click", forward);
  back.addEventListener("click", () => current > 1 && showStep(current - 1));
  progress.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-goto]");
    if (!button || button.disabled) return;
    const n = Number(button.dataset.goto);
    if (n > 1 && !chosen().length) return;
    showStep(n);
  });

  form.addEventListener("change", (event) => {
    const { name } = event.target;
    if (name === "project") {
      projectError.hidden = true;
      settle(event.target);
      applyProjects();
    } else if (name === "web_size") {
      applyProjects();
    } else {
      refresh();
    }
  });
  form.addEventListener("input", (event) => {
    if (event.target.type === "number") showEstimate();
  });

  // Name and address are the only answers needed; each note appears under its field, in the page's language.
  const checks = {
    name: (value) => value.trim() !== "",
    email: (value) => ADDRESS.test(value.trim()),
  };
  const controls = Object.keys(checks).map((name) => form.elements[name]);
  function flag(control, message) {
    const field = control.closest(".form-field");
    let note = field.querySelector(".field-error");
    if (!message) {
      note?.remove();
      delete field.dataset.invalid;
      control.removeAttribute("aria-invalid");
      control.removeAttribute("aria-describedby");
      return;
    }
    if (!note) {
      note = element("p", "field-error");
      note.id = `${control.id}-error`;
      field.append(note);
    }
    note.textContent = message;
    field.dataset.invalid = "";
    control.setAttribute("aria-invalid", "true");
    control.setAttribute("aria-describedby", note.id);
  }
  function check(control) {
    const ok = checks[control.name](control.value);
    flag(control, ok ? "" : TEXT.missing[control.name]);
    return ok;
  }
  form.addEventListener("input", (event) => {
    const control = event.target;
    if (controls.includes(control) && control.closest(".form-field").dataset.invalid !== undefined) check(control);
  });
  // A mistyped provider or ending (gmial.com, .con) gets a one-click fix under the field, from main.js.
  const address = form.elements.email;
  address.addEventListener("change", () => {
    if (typeof offerEmailFix === "function") offerEmailFix(address);
  });

  // Once it's sent, a confirmation takes the panel's place: who it's for, when the reply comes, where it goes
  // and the reference. "Fix it" goes back to the last step with every answer still there.
  let done = null;
  function confirmSent(name, email, ref) {
    if (!done) {
      done = element("div", "form-done start-done");
      done.innerHTML =
        '<span class="form-done-plate" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3 8.5 3.2 3L13 4.5"/></svg></span>' +
        '<h2 class="form-done-title" tabindex="-1"></h2><p class="form-done-text" data-reply></p><p class="form-done-text" data-to></p>' +
        '<p class="start-done-ref mono" data-ref></p>' +
        '<button class="form-done-again" type="button"><span></span><svg class="arrow-right" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5"/></svg></button>';
      done.querySelector(".form-done-again span").textContent = TEXT.fix;
      done.querySelector(".form-done-again").addEventListener("click", () => {
        done.hidden = true;
        delete form.dataset.state;
        showStep(steps.length, { focus: false });
        address.focus();
      });
      form.append(done);
    }
    done.querySelector(".form-done-title").textContent = TEXT.thanks(name);
    done.querySelector("[data-reply]").textContent = TEXT.reply[picked("channel") ?? "none"];
    done.querySelector("[data-to]").textContent = TEXT.writeTo(email);
    done.querySelector("[data-ref]").textContent = ref ? TEXT.reference(ref) : "";
    done.hidden = false;
    form.dataset.state = "sent";
    progress.querySelectorAll("li").forEach((item) => (item.dataset.state = "done"));
    if (form.getBoundingClientRect().top < 0) form.scrollIntoView({ block: "start" });
    done.querySelector(".form-done-title").focus({ preventScroll: true });
  }

  form.noValidate = true;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    // Enter in a field moves on a step; only the last step sends.
    if (current < steps.length) {
      forward();
      return;
    }
    const invalid = controls.filter((control) => !check(control));
    if (invalid.length) {
      invalid[0].focus();
      return;
    }
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    status.textContent = "";
    delete form.dataset.state;
    send.disabled = true;
    send.textContent = TEXT.sending;
    try {
      const response = await fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        // A problem with one field, like an address that can't receive mail, is shown under that field.
        const control = result.field ? form.elements[result.field] : null;
        if (control?.closest?.(".form-field") && result.message) {
          flag(control, result.message);
          control.focus();
          return;
        }
        throw new Error(result.message || TEXT.failed);
      }
      if (typeof celebrate === "function") celebrate(send);
      confirmSent(name.split(/\s+/)[0], email, result.ref);
    } catch (error) {
      form.dataset.state = "error";
      status.textContent = error instanceof TypeError ? TEXT.failed : error.message;
    } finally {
      send.disabled = false;
      send.textContent = sendLabel;
    }
  });

  // A "Start this project" button elsewhere arrives with its project chosen, straight at step 2.
  form.classList.add("is-wizard");
  const wanted = (new URLSearchParams(location.search).get("project") ?? "").split(",").filter((key) => /^[a-z-]+$/.test(key));
  const presets = wanted.map(projectBox).filter(Boolean);
  for (const box of presets) {
    box.checked = true;
    settle(box);
  }
  settle();
  applyProjects();
  showStep(presets.length && chosen().length ? 2 : 1, { focus: false });
})();
