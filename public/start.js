// The guided form at /start/ and /es/empezar/: four short steps instead of one long page, only the questions that
// fit the projects chosen, a live estimate from the public prices and a confirmation with a reference to quote.
// What can't go together is kept apart, and a quiet line says so with a way to undo it. Answers are kept in the
// tab until they're sent, the browser's Back goes back a step, and while there's something to lose, links that
// leave the form open in a new tab. Without JavaScript the whole form shows at once and posts normally.
// The Worker checks every answer again.

(() => {
  const form = document.querySelector("[data-start]");
  if (!form) return;

  const root = document.documentElement;
  const spanish = root.lang.startsWith("es");
  const motion = root.classList.contains("motion");
  const money = spanish ? (amount) => `${amount} USD` : (amount) => `$${amount.toLocaleString("en-US")}`;
  const TEXT = spanish
    ? {
        step: (n, total, name) => `Paso ${n} de ${total} · ${name}`,
        chooseProject: "Elige al menos una opción, o «Aún no lo sé».",
        missing: { name: "Escribe tu nombre.", email: "Revisa tu dirección de correo." },
        range: (min, max) => `Escribe un número del ${min} al ${max}. Si son más, dímelo en tu mensaje.`,
        sending: "Enviando…",
        failed: "No se pudo enviar tu solicitud. Inténtalo de nuevo o escríbeme a contact@mariohdz.com.",
        estimate: "Tu estimación",
        from: "Desde",
        included: "Incluida",
        inPlan: "Precio en tu plan",
        whereToStart: "Te diré por dónde empezar",
        suggested: "sugerida",
        free: "No pagas nada ahora: el precio cerrado llega en tu plan, y nada empieza hasta que lo apruebes.",
        freeShort: "No pagas nada ahora: nada empieza hasta que lo apruebes.",
        custom: "El precio cerrado de lo hecho a tu medida llega en tu plan, cuando la idea esté clara.",
        plusCustom: "Lo hecho a tu medida se suma en tu plan, con su propio precio cerrado.",
        unsure: "Marca en el paso 2 qué está pasando y verás por dónde empezar.",
        checkUp: (amount) => `La revisión técnica se paga aparte. Si encuentra algo que arreglar y sigues adelante, sus ${amount} se descuentan de ese arreglo.`,
        checkUpAlone: (amount) => `Si la revisión encuentra algo que arreglar y sigues adelante, sus ${amount} se descuentan de ese arreglo.`,
        dollars: "",
        mailboxes: (n) => `${n} ${n === 1 ? "dirección más" : "direcciones más"}`,
        extraPages: (amount) => `Más ${amount} por cada página a partir de la sexta.`,
        sitesSwitched: (name) => `Solo una web a la vez: cambié a «${name}».`,
        unsureCleared: "«Aún no lo sé» va solo, así que quité tus otras elecciones.",
        undone: "Deshecho.",
        nudge: {
          "one-page": "Por el mismo precio, el paquete de arranque incluye la web de una página y el correo profesional, y además tu ficha de Google.",
          website: "Por el mismo precio, el paquete de arranque con hasta cinco páginas incluye la web y el correo profesional, y además tu ficha de Google.",
        },
        switched: "Cambié al paquete de arranque.",
        total: (amount, fixed) => (fixed ? `Estimación: ${amount}.` : `Estimación: desde ${amount}.`),
        thanks: (name) => `Gracias, ${name}.`,
        reply: {
          email: "Te respondo en un día laborable, y todo seguirá por correo.",
          call: "Te respondo en un día laborable con dos o tres horarios y el enlace de la videollamada.",
          none: "Te respondo en un día laborable.",
        },
        writeTo: (email) => `Te escribiré a ${email}.`,
        reference: (ref) => `Referencia ${ref}`,
        spam: "Si en un día laborable no ves mi respuesta, mira en spam o escríbeme a contact@mariohdz.com.",
        fix: "¿No es tu dirección? Corrígela",
      }
    : {
        step: (n, total, name) => `Step ${n} of ${total} · ${name}`,
        chooseProject: "Choose at least one, or “Not sure yet”.",
        missing: { name: "Please add your name.", email: "Please check your email address." },
        range: (min, max) => `Please enter a number from ${min} to ${max}. If it’s more, tell me in your message.`,
        sending: "Sending…",
        failed: "Your request couldn’t be sent. Please try again, or write to contact@mariohdz.com.",
        estimate: "Your estimate",
        from: "From",
        included: "Included",
        inPlan: "Price in your plan",
        whereToStart: "I’ll suggest where to start",
        suggested: "suggested",
        free: "Nothing to pay now: your fixed price comes in your plan, and nothing starts until you approve it.",
        freeShort: "Nothing to pay now: nothing starts until you approve it.",
        custom: "The fixed price for what’s made for you comes in your plan, once the idea is clear.",
        plusCustom: "Anything made for you is added in your plan, with its own fixed price.",
        unsure: "Choose what’s going on in step 2, and you’ll see where to start.",
        checkUp: (amount) => `The tech check-up is paid separately. If it finds something to fix and you go ahead, its ${amount} comes off that fix.`,
        checkUpAlone: (amount) => `If the check-up finds something to fix and you go ahead, its ${amount} comes off that fix.`,
        dollars: "Prices in US dollars.",
        mailboxes: (n) => `${n} more email ${n === 1 ? "address" : "addresses"}`,
        extraPages: (amount) => `Plus ${amount} for each page after five.`,
        sitesSwitched: (name) => `One website at a time: switched to “${name}”.`,
        unsureCleared: "“Not sure yet” goes on its own, so your other choices were cleared.",
        undone: "Undone.",
        nudge: {
          "one-page": "For the same price, the launch package includes the one-page site and business email, plus your Google listing.",
          website: "For the same price, the launch package with up to five pages includes the site and business email, plus your Google listing.",
        },
        switched: "Switched to the launch package.",
        total: (amount, fixed) => (fixed ? `Estimate: ${amount}.` : `Estimate: from ${amount}.`),
        thanks: (name) => `Thanks, ${name}.`,
        reply: {
          email: "I’ll reply within one business day, and everything stays by email.",
          call: "I’ll reply within one business day with two or three times and the link for the video call.",
          none: "I’ll reply within one business day.",
        },
        writeTo: (email) => `I’ll write to ${email}.`,
        reference: (ref) => `Reference ${ref}`,
        spam: "If my reply isn’t in your inbox within one business day, check your spam folder or write to contact@mariohdz.com.",
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
  // Where the answers wait in this tab until they're sent. The same key on both languages, so switching
  // language carries them over.
  const DRAFT = "start-draft";

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
  const live = form.querySelector("[data-start-live]");
  const projectError = form.querySelector('[data-start-error="project"]');
  const estimateBox = form.querySelector("[data-start-estimate]");
  const suggestBox = form.querySelector("[data-start-suggest]");
  const summary = document.querySelector("[data-start-summary]");
  const bar = form.querySelector("[data-start-bar]");
  const change = form.querySelector("[data-start-change]");
  const zone = form.querySelector("[data-start-zone]");
  const boxes = [...form.querySelectorAll('input[name="project"]')];
  const folds = (name) => form.querySelector(`[data-fold="${name}"]`);

  let current = 1;
  let reached = 1;
  // This page's place in the browser's history, counted from the entry it arrived on.
  let index = 0;
  let sent = false;
  // Set once the page has settled, so loading and restoring announce nothing.
  let ready = false;

  const projectBox = (key) => boxes.find((box) => box.value === key);
  const chosen = () => boxes.filter((box) => box.checked);
  const picked = (name) => form.querySelector(`input[name="${name}"]:checked:not(:disabled)`)?.value ?? null;
  const nameOf = (input) => input.closest("label").querySelector(".choice-name").textContent;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // Says something to screen readers, once, even when it's the same words as last time.
  function announce(text) {
    live.textContent = "";
    requestAnimationFrame(() => (live.textContent = text));
  }

  // Shows and turns on what applies, hides and turns off the rest, so what's hidden is never sent.
  function toggle(element, on) {
    element.hidden = !on;
    if (element.matches("fieldset")) element.disabled = !on;
    else element.querySelectorAll("input, select, textarea").forEach((control) => (control.disabled = !on));
  }

  // Opens or closes a fold in place; the stylesheet animates it. What's folded can't be reached and, unless
  // `keep` says otherwise, isn't sent either.
  function setFold(fold, open, keep = false) {
    if (!fold) return;
    fold.toggleAttribute("data-folded", !open);
    fold.inert = !open;
    if (keep) return;
    // A question the projects chosen don't ask stays off; a step out of view doesn't count.
    fold.querySelectorAll("input, select, textarea").forEach((control) => (control.disabled = !open || Boolean(control.closest("[data-kinds][hidden], [data-only][hidden]"))));
  }

  // What a second language or a Google Maps listing adds, for the website and its size (as in src/start.mjs).
  function extraPrice(extra, key, size) {
    const big = key === "website" || (key === "launch-package" && size === "five");
    if (extra === "languages") return big ? PRICES.secondLanguage.upToFive : PRICES.secondLanguage.onePage;
    if (extra === "listing") return key === "launch-package" ? 0 : PRICES.mapsListing;
    return 0;
  }

  // Keeps apart what can't go together, as each choice is made. When a choice changes another one, a line
  // under it says so, with a way to undo it; the next change folds the line away.
  let state = [];
  let undo = null;
  function settle(changed) {
    const before = state;
    let note = null;
    if (changed?.checked) {
      if (changed.value === ALONE) {
        const others = boxes.filter((box) => box !== changed && box.checked);
        others.forEach((box) => (box.checked = false));
        if (others.length) note = ["unsure", TEXT.unsureCleared];
      } else {
        projectBox(ALONE).checked = false;
        const site = before.find((key) => SITES.includes(key));
        if (SITES.includes(changed.value) && site && site !== changed.value) note = ["sites", TEXT.sitesSwitched(nameOf(changed))];
      }
    }
    // What the launch package already includes folds into it while it's chosen.
    for (const [key, included] of Object.entries(INCLUDED)) {
      const box = projectBox(key);
      const on = box.checked;
      for (const other of included) {
        if (on) projectBox(other).checked = false;
        setFold(folds(other), !on);
      }
      setFold(box.closest("label").querySelector('[data-fold="included"]'), on, true);
    }
    for (const name of ["sites", "unsure"]) {
      const fold = folds(`notice-${name}`);
      const on = note?.[0] === name;
      if (on) fold.querySelector("[data-notice-text]").textContent = note[1];
      setFold(fold, on, true);
    }
    if (note) {
      undo = before;
      announce(note[1]);
    } else if (changed) undo = null;
    state = chosen().map((box) => box.value);
  }

  // A website chosen can be unchosen with a second tap, like the boxes around it.
  for (const radio of boxes.filter((box) => box.type === "radio")) {
    let was = false;
    radio.addEventListener("pointerdown", () => (was = radio.checked));
    radio.addEventListener("keydown", (event) => {
      if (event.key === " ") was = radio.checked;
    });
    radio.addEventListener("pointercancel", () => (was = false));
    radio.addEventListener("blur", () => (was = false));
    radio.addEventListener("click", () => {
      if (was) {
        radio.checked = false;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
      }
      was = false;
    });
  }

  form.querySelectorAll("[data-undo]").forEach((button) =>
    button.addEventListener("click", () => {
      if (!undo) return;
      const keys = undo;
      for (const box of boxes) box.checked = keys.includes(box.value);
      undo = null;
      settle();
      applyProjects();
      announce(TEXT.undone);
      (chosen()[0] ?? boxes[0]).focus();
      saveDraft();
    }),
  );

  // A website and business email chosen apart cost what the launch package costs: the switch takes the package,
  // with as many pages as the website had.
  form.querySelector("[data-nudge-switch]")?.addEventListener("click", () => {
    const site = chosen().find((box) => SITES.includes(box.value))?.value;
    const pack = projectBox("launch-package");
    pack.checked = true;
    projectBox("business-email").checked = false;
    settle();
    applyProjects();
    const size = form.querySelector(`input[name="web_size"][value="${site === "website" ? "five" : "one"}"]`);
    if (size) size.checked = true;
    applyProjects();
    announce(TEXT.switched);
    pack.focus();
    saveDraft();
  });

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
    applyUnless();
    refresh();
  }

  // What another answer makes moot folds away and isn't sent: without a domain, its account and an address on it.
  function applyUnless() {
    form.querySelectorAll("[data-unless]").forEach((fold) => {
      const [name, value] = fold.dataset.unless.split(":");
      setFold(fold, picked(name) !== value);
    });
  }

  // For "not sure yet": one worry points to its project, several to a check-up.
  function suggestion() {
    const worries = [...form.querySelectorAll('input[name="unsure_symptoms"]:checked:not(:disabled)')];
    if (!worries.length) return null;
    const box = projectBox(worries.length > 1 ? "check-up" : worries[0].dataset.suggests);
    return { key: box.value, name: nameOf(box), price: Number(box.dataset.price) };
  }

  // The estimate, from the same public prices as the Worker's: each project with where it starts and what its
  // extras add, what's priced in the plan, the total and the notes that go with it.
  function estimate() {
    if (!chosen().length) return null;
    const parts = [];
    const open = [];
    for (const box of chosen()) {
      const key = box.value;
      if (key === "custom") {
        open.push([nameOf(box), TEXT.inPlan]);
        continue;
      }
      if (key === ALONE) {
        const pick = suggestion();
        if (pick) parts.push({ key: pick.key, name: `${pick.name} · ${TEXT.suggested}`, base: pick.price, lines: [] });
        else open.push([nameOf(box), TEXT.whereToStart]);
        continue;
      }
      const part = { key, name: nameOf(box), base: Number(box.dataset.price), lines: [] };
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
    const checkUp = parts.some((part) => part.key === "check-up");
    // The check-up alone has one price, not a starting one.
    const fixed = parts.length === 1 && checkUp && !open.length;
    const notes = [];
    if (picked("web_pages") === "more" && projectBox("website").checked) notes.push(TEXT.extraPages(money(PRICES.extraPage)));
    if (!parts.length) notes.push(projectBox(ALONE).checked ? TEXT.unsure : TEXT.custom);
    else if (open.length && !projectBox(ALONE).checked) notes.push(TEXT.plusCustom);
    if (checkUp) notes.push(fixed ? TEXT.checkUpAlone(money(PRICES.checkUp)) : TEXT.checkUp(money(PRICES.checkUp)));
    notes.push(parts.length && !fixed ? TEXT.free : TEXT.freeShort);
    if (parts.length && TEXT.dollars) notes.push(TEXT.dollars);
    const total = parts.reduce((sum, part) => sum + part.base + part.lines.reduce((add, [, amount]) => add + amount, 0), 0);
    return { total: parts.length ? total : null, fixed, parts, open, note: notes.join(" ") };
  }

  // A total that changes counts its way to the new figure, quickly, unless the visitor prefers less motion.
  function paintTotal(target, result, from) {
    const amount = element("span", "", "");
    target.replaceChildren(...(result.fixed ? [] : [element("span", "start-from", `${TEXT.from} `)]), amount);
    const to = result.total;
    if (!motion || !ready || from === null || from === to) {
      amount.textContent = money(to);
      return;
    }
    const start = performance.now();
    const run = (now) => {
      if (!amount.isConnected) return;
      const k = Math.min(1, (now - start) / 380);
      const eased = 1 - (1 - k) ** 3;
      amount.textContent = money(k < 1 ? Math.round((from + (to - from) * eased) / 10) * 10 : to);
      if (k < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }

  // The choice so far, on the side on desktops and as a line at the top of the panel on phones and tablets.
  let shownTotal = null;
  let spoken = null;
  let speaking;
  function showSummary(result) {
    summary.hidden = bar.hidden = !result;
    if (!result) {
      shownTotal = null;
      return;
    }
    const totals = [summary.querySelector("[data-summary-total]"), bar.querySelector("[data-bar-total]")];
    if (result.total === null) {
      for (const target of totals) target.textContent = result.open[0][1];
    } else {
      for (const target of totals) paintTotal(target, result, shownTotal);
    }
    shownTotal = result.total;
    const rows = [...result.parts.map((part) => [part.name, money(part.base + part.lines.reduce((add, [, amount]) => add + amount, 0))]), ...result.open];
    summary.querySelector("[data-summary-lines]").replaceChildren(
      ...rows.map(([name, amount]) => {
        const row = element("li");
        row.append(element("span", "", name), element("span", "", amount));
        return row;
      }),
    );
    bar.querySelector("[data-bar-names]").textContent = chosen().map((box) => box.dataset.short).join(" + ");
    // Screen readers hear the total once it settles, not every figure on the way.
    if (!ready || result.total === null) return;
    clearTimeout(speaking);
    speaking = setTimeout(() => {
      const said = TEXT.total(money(result.total), result.fixed);
      if (said !== spoken) announce((spoken = said));
    }, 700);
  }

  // The estimate at the end of step 4, in full. It's only rebuilt when something in it changed.
  let lastEstimate = "";
  function showEstimate() {
    const result = estimate();
    showSummary(result);
    const signature = JSON.stringify(result);
    if (signature === lastEstimate) return;
    lastEstimate = signature;
    estimateBox.hidden = !result;
    if (!result) return;
    estimateBox.replaceChildren(element("p", "start-estimate-label", TEXT.estimate));
    if (result.total !== null) {
      const total = element("p", "start-estimate-total");
      if (!result.fixed) total.append(element("span", "", `${TEXT.from} `));
      total.append(money(result.total));
      estimateBox.append(total);
    }
    const rows = [
      ...result.parts.flatMap((part) => [[part.name, money(part.base), false], ...part.lines.map(([name, amount]) => [name, `+${money(amount)}`, true])]),
      ...result.open.map(([name, text]) => [name, text, false]),
    ];
    const list = element("ul", "start-estimate-lines");
    for (const [name, amount, extra] of rows) {
      const row = element("li", extra ? "is-extra" : "");
      row.append(element("span", "", name), element("span", "", amount));
      list.append(row);
    }
    estimateBox.append(list, element("p", "start-estimate-note", result.note));
  }

  function refresh() {
    const keys = chosen().map((box) => box.value);
    const pick = keys.includes(ALONE) ? suggestion() : null;
    if (suggestBox) {
      suggestBox.hidden = !pick;
      if (pick) suggestBox.querySelector("[data-start-suggest-name]").textContent = `${pick.name} · ${pick.key === "check-up" ? money(pick.price) : `${TEXT.from} ${money(pick.price)}`}`;
    }
    setFold(folds("call"), picked("channel") === "call");
    // A website and business email apart cost what the launch package costs; a new email may not need the inbox project.
    const site = keys.find((key) => SITES.includes(key));
    const nudge = (site === "one-page" || site === "website") && keys.includes("business-email");
    if (nudge) folds("nudge").querySelector("[data-nudge-text]").textContent = TEXT.nudge[site];
    setFold(folds("nudge"), nudge, true);
    setFold(folds("tip-inbox"), keys.includes("deliverability") && (keys.includes("business-email") || keys.includes("launch-package")), true);
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
    change.hidden = n === 1;
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

  // Each step is an entry in the browser's history, so its Back button goes back a step.
  function goTo(n) {
    if (n === current) return;
    index += 1;
    history.pushState({ start: n, index }, "");
    showStep(n);
    saveDraft();
  }
  history.scrollRestoration = "manual";
  addEventListener("popstate", (event) => {
    if (sent || !event.state?.start) return;
    index = event.state.index ?? 0;
    showStep(event.state.start);
    saveDraft();
  });

  // Counts are optional, but a figure out of range is pointed out rather than dropped.
  const counted = (scope) => [...scope.querySelectorAll('input[type="number"]')].filter((control) => !control.matches(":disabled"));
  function checkCount(control) {
    const value = control.value.trim();
    const ok = !control.validity.badInput && (value === "" || (/^\d{1,4}$/.test(value) && Number(value) >= Number(control.min) && Number(value) <= Number(control.max)));
    flag(control, ok ? "" : TEXT.range(control.min, control.max));
    return ok;
  }

  function forward() {
    if (current === 1 && !chosen().length) {
      projectError.textContent = TEXT.chooseProject;
      projectError.hidden = false;
      boxes[0].focus();
      return;
    }
    const wrong = counted(steps[current - 1]).find((control) => !checkCount(control));
    if (wrong) {
      wrong.focus();
      return;
    }
    if (current < steps.length) goTo(current + 1);
  }

  next.addEventListener("click", forward);
  back.addEventListener("click", () => current > 1 && goTo(current - 1));
  change.addEventListener("click", () => goTo(1));
  progress.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-goto]");
    if (!button || button.disabled) return;
    const n = Number(button.dataset.goto);
    if (n > 1 && !chosen().length) return;
    goTo(n);
  });

  form.addEventListener("change", (event) => {
    const control = event.target;
    if (control.name === "project") {
      projectError.hidden = true;
      settle(control);
      applyProjects();
    } else if (control.name === "web_size") {
      applyProjects();
    } else if (control.name.startsWith("have_")) {
      applyUnless();
      refresh();
    } else {
      if (control.type === "number") checkCount(control);
      refresh();
    }
    saveDraft();
  });
  let saving;
  form.addEventListener("input", (event) => {
    const control = event.target;
    if (control.type === "number") {
      if (control.closest(".form-field").dataset.invalid !== undefined) checkCount(control);
      showEstimate();
    }
    clearTimeout(saving);
    saving = setTimeout(saveDraft, 300);
  });

  // Name and address are the only answers needed; each note appears under its field, in the page's language,
  // alongside any hint the field already points to.
  const checks = {
    name: (value) => value.trim() !== "",
    email: (value) => ADDRESS.test(value.trim()),
  };
  const controls = Object.keys(checks).map((name) => form.elements[name]);
  function flag(control, message) {
    const field = control.closest(".form-field");
    let note = field.querySelector(".field-error");
    control.dataset.hint ??= control.getAttribute("aria-describedby") ?? "";
    const hint = control.dataset.hint;
    if (!message) {
      note?.remove();
      delete field.dataset.invalid;
      control.removeAttribute("aria-invalid");
      if (hint) control.setAttribute("aria-describedby", hint);
      else control.removeAttribute("aria-describedby");
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
    control.setAttribute("aria-describedby", [hint, note.id].filter(Boolean).join(" "));
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

  // The answers wait in this tab, only on this device, until they're sent or the tab is closed. Never a cookie.
  const store = (() => {
    try {
      sessionStorage.setItem(`${DRAFT}-test`, "1");
      sessionStorage.removeItem(`${DRAFT}-test`);
      return sessionStorage;
    } catch {
      return null;
    }
  })();
  const answered = () =>
    chosen().length > 0 || [...form.elements].some((control) => ["text", "email", "textarea"].includes(control.type) && control.name !== "website" && control.value.trim());
  function saveDraft() {
    guardLinks(!sent && answered());
    if (!store || sent) return;
    const fields = [];
    for (const control of form.elements) {
      if (!control.name || control.matches(":disabled") || control.name === "lang" || control.name === "website") continue;
      if (control.type === "checkbox" || control.type === "radio") {
        if (control.checked) fields.push([control.name, control.value]);
      } else if (control.value) fields.push([control.name, control.value]);
    }
    try {
      if (answered()) store.setItem(DRAFT, JSON.stringify({ fields, step: current, reached }));
      else store.removeItem(DRAFT);
    } catch {}
  }
  function restoreDraft() {
    let draft = null;
    try {
      draft = JSON.parse(store?.getItem(DRAFT) ?? "null");
    } catch {}
    if (!Array.isArray(draft?.fields)) return null;
    // The projects first, so the questions they bring are there to fill.
    const projects = draft.fields.filter(([name]) => name === "project").map(([, value]) => value);
    for (const box of boxes) box.checked = projects.includes(box.value);
    settle();
    applyProjects();
    for (const [name, value] of draft.fields) {
      if (name === "project" || typeof value !== "string") continue;
      for (const control of form.querySelectorAll(`[name="${CSS.escape(name)}"]`)) {
        if (control.type === "checkbox" || control.type === "radio") {
          if (control.value === value) control.checked = true;
        } else control.value = value;
      }
    }
    applyProjects();
    return draft;
  }

  // While there's something to lose, links that leave the form open in a new tab, so this one stays as it is.
  // The language switch stays in the tab: the answers go with it to the other language.
  const leaving = [...document.querySelectorAll("a[href]")].filter((link) => {
    const href = link.getAttribute("href");
    return !href.startsWith("#") && !href.startsWith("mailto:") && link.target !== "_blank" && !link.matches(".lang, .menu-lang, .skip");
  });
  let guarded = false;
  function guardLinks(on) {
    if (on === guarded) return;
    guarded = on;
    for (const link of leaving) {
      if (on) {
        link.target = "_blank";
        link.rel = "noopener";
        link.setAttribute("aria-describedby", "start-new-tab");
      } else {
        link.removeAttribute("target");
        link.removeAttribute("rel");
        link.removeAttribute("aria-describedby");
      }
    }
  }

  // Once it's sent, a confirmation takes the panel's place: who it's for, when the reply comes, where it goes,
  // the reference and where to look if no reply arrives. "Fix it" goes back to the last step with every answer.
  let done = null;
  function confirmSent(name, email, ref) {
    if (!done) {
      done = element("div", "form-done start-done");
      done.innerHTML =
        '<span class="form-done-plate" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3 8.5 3.2 3L13 4.5"/></svg></span>' +
        '<h2 class="form-done-title" tabindex="-1"></h2><p class="form-done-text" data-reply></p><p class="form-done-text" data-to></p>' +
        '<p class="start-done-ref mono" data-ref></p><p class="start-done-spam" data-spam></p>' +
        '<button class="form-done-again" type="button"><span></span><svg class="arrow-right" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5"/></svg></button>';
      done.querySelector(".form-done-again span").textContent = TEXT.fix;
      done.querySelector("[data-spam]").textContent = TEXT.spam;
      done.querySelector(".form-done-again").addEventListener("click", () => {
        sent = false;
        done.hidden = true;
        delete form.dataset.state;
        showStep(steps.length, { focus: false });
        saveDraft();
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
    const wrongCount = counted(form).find((control) => !checkCount(control));
    if (wrongCount) {
      goTo(Number(wrongCount.closest(".start-step").dataset.step));
      wrongCount.focus();
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
      // Sent: nothing waits in the tab any more, links behave as usual, and Back leaves the page in one go.
      sent = true;
      try {
        store?.removeItem(DRAFT);
      } catch {}
      guardLinks(false);
      if (index > 0) history.go(-index);
      index = 0;
      confirmSent(name.split(/\s+/)[0], email, result.ref);
    } catch (error) {
      form.dataset.state = "error";
      status.textContent = error instanceof TypeError ? TEXT.failed : error.message;
    } finally {
      send.disabled = false;
      send.textContent = sendLabel;
    }
  });

  // Arriving: a "Start this project" button elsewhere brings its project chosen, straight to step 2; otherwise
  // what was left in this tab comes back, on the step it was on.
  form.classList.add("is-wizard");
  const wanted = (new URLSearchParams(location.search).get("project") ?? "").split(",").filter((key) => /^[a-z-]+$/.test(key));
  const presets = wanted.map(projectBox).filter(Boolean);
  let first = 1;
  if (presets.length) {
    try {
      store?.removeItem(DRAFT);
    } catch {}
    for (const box of presets) box.checked = true;
    settle();
    applyProjects();
    first = 2;
  } else {
    const draft = restoreDraft();
    if (draft) {
      first = Number(draft.step) || 1;
      reached = Math.min(steps.length, Math.max(first, Number(draft.reached) || 1));
    } else {
      settle();
      applyProjects();
    }
  }
  // A reload keeps the step it was on.
  if (history.state?.start && !presets.length) first = history.state.start;
  if (!chosen().length) first = 1;
  first = Math.min(Math.max(first, 1), steps.length);
  index = history.state?.index ?? 0;
  history.replaceState({ start: first, index }, "");
  showStep(first, { focus: false });
  saveDraft();
  // Folds animate from here on; until now they took their places without moving.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      form.classList.add("start-ready");
      ready = true;
    }),
  );
})();
