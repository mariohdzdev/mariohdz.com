// Writes the parts that repeat across the site from tools/site.mjs: the header with its menus, the footer,
// the services on the home page, the projects on each service page and the lists on the prices page.
// Each part sits between <!-- build:name --> and <!-- /build:name --> in the pages, and everything outside
// those marks is left as it is. The site is still plain HTML: run this after changing tools/site.mjs or a page's
// shared part, and commit what it writes.
//
//   node tools/build.mjs           updates the pages
//   node tools/build.mjs --check   only says which pages are out of date (the deploy runs this)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PRICES, PROJECTS, SERVICES, WORDS } from "./site.mjs";
import { ANSWERS, COMMON, GROUPS, ITEMS, KINDS, MORE, QUESTIONS, ZONES, detailName, haveName, kindOf, projectName, projectPrice, projectScope } from "../src/start.mjs";

const ROOT = "public";
const ORIGIN = "https://mariohdz.com";
const check = process.argv.includes("--check");

const ARROW = '<svg class="arrow-right" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5"/></svg>';
const CHEVRON = '<svg class="chevron" viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 3.75 5 6.25l2.5-2.5"/></svg>';
const OUT = '<svg class="arrow" viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 7.5l5-5M3.5 2.5h4v4"/></svg>';
const THEME_ICONS = [
  '<svg class="icon-sun" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"/></svg>',
  '<svg class="icon-moon" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9.6A5.75 5.75 0 0 1 6.4 2.5a5.75 5.75 0 1 0 7.1 7.1z"/></svg>',
];

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Indents every line of a block, nested lists of lines included, so each part lines up with the page around it.
const pad = (lines, spaces) => lines.flat(Infinity).map((line) => (line ? " ".repeat(spaces) + line : line));
const indent = (lines, spaces) => pad(lines, spaces).join("\n");

// What the parts need to know about a page: its language, its address, the address of its other version, and
// what kind of page it is. The home page links to its own sections; legal pages have no glyphs to shield
// the header from and no contact section; the not-found pages have neither.
function describe(file, html) {
  const path = `/${file.split("\\").join("/")}`;
  const url = path.endsWith("/index.html") ? path.slice(0, -"index.html".length) : path;
  const lang = html.match(/<html[^>]*\slang="([^"]+)"/)[1];
  const other = WORDS[lang].other.lang;
  const alternate = html.match(new RegExp(`<link rel="alternate" hreflang="${other}" href="([^"]+)"`))?.[1];
  const kind = url.endsWith("/404.html") ? "missing" : url === WORDS[lang].home ? "home" : /<main[^>]*class="doc"/.test(html) ? "doc" : "page";
  return { url, lang, kind, counterpart: alternate ? alternate.slice(ORIGIN.length) : WORDS[other].home };
}

const current = (page, url) => (page.url === url ? ' aria-current="page"' : "");
const priceTag = (lang, amount) => `<span>${WORDS[lang].from}</span> ${WORDS[lang].price(amount)}`;

// The services and their projects, as the menus list them: the same groups on desktops and phones.
function groups(page) {
  return SERVICES.map((service) => {
    const s = service[page.lang];
    return [
      '<div class="menu-group">',
      `  <a class="menu-service" href="${s.url}"${current(page, s.url)}><span class="area-icon mono" aria-hidden="true">${escape(service.glyph)}</span><span>${s.name}</span>${ARROW}</a>`,
      '  <ul class="menu-projects">',
      service.projects.map((key) => {
        const p = PROJECTS[key][page.lang];
        return `    <li><a href="${p.url}"${current(page, p.url)}>${p.name}</a></li>`;
      }),
      "  </ul>",
      "</div>",
    ];
  });
}

function header(page) {
  const w = WORDS[page.lang];
  const home = page.kind === "home";
  const shield = page.kind === "doc" ? "" : " data-shield";
  const section = (key) => `${home ? "" : w.home}#${w.anchors[key]}`;
  const spy = home ? " data-spy" : "";
  // Starting a project, from any page, leads to the guided form; something made to measure arrives there chosen.
  const start = w.start;
  const custom = `${w.start}?project=custom`;
  const lang = `href="${page.counterpart}" hreflang="${w.other.lang}" lang="${w.other.lang}"`;
  return indent(
    [
      `<header class="bar${page.kind === "doc" ? " is-solid" : ""}">`,
      '  <div class="bar-inner">',
      `    <a class="brand mono" href="${w.home}"${shield}>mariohdz<span>.com</span></a>`,
      `    <nav class="nav mono" aria-label="${w.nav.label}">`,
      '      <details class="nav-services" data-menu>',
      `        <summary${shield}${home ? ` data-spy="#${w.anchors.services}"` : ""}>${w.nav.services}${CHEVRON}</summary>`,
      '        <div class="nav-panel">',
      pad(groups(page), 10),
      `          <a class="menu-custom glow" href="${custom}"><strong>${w.custom.title}</strong><span>${w.custom.text}</span>${ARROW}</a>`,
      "        </div>",
      "      </details>",
      `      <a href="${w.prices}"${shield}${current(page, w.prices)}>${w.nav.prices}</a>`,
      `      <a href="${section("about")}"${spy}${shield}>${w.nav.about}</a>`,
      `      <a href="${section("process")}"${spy}${shield}>${w.nav.process}</a>`,
      `      <a href="${section("faq")}"${spy}${shield}>${w.nav.faq}</a>`,
      "    </nav>",
      '    <div class="bar-tools">',
      `      <a class="lang mono" ${lang} aria-label="${w.other.label}"${shield}>${w.other.code}</a>`,
      `      <button class="theme-toggle" type="button" data-theme-toggle aria-label="${w.theme}">`,
      pad(THEME_ICONS, 8),
      "      </button>",
      `      <a class="bar-cta" href="${start}"${current(page, start)}><span class="long">${w.cta.long}</span><span class="short">${w.cta.short}</span></a>`,
      '      <details class="menu" data-menu>',
      `        <summary class="menu-toggle mono"${shield}><span class="when-shut">${w.menu.open}</span><span class="when-open">${w.menu.close}</span><span class="menu-lines" aria-hidden="true"></span></summary>`,
      '        <div class="menu-panel">',
      `          <nav class="menu-nav" aria-label="${w.menu.label}">`,
      `            <p class="eyebrow mono">${w.nav.services}</p>`,
      pad(groups(page), 12),
      '            <ul class="menu-links">',
      `              <li><a href="${w.prices}"${current(page, w.prices)}>${w.nav.prices}</a></li>`,
      `              <li><a href="${section("about")}">${w.nav.about}</a></li>`,
      `              <li><a href="${section("process")}">${w.nav.process}</a></li>`,
      `              <li><a href="${section("faq")}">${w.nav.faq}</a></li>`,
      "            </ul>",
      "          </nav>",
      '          <div class="menu-foot">',
      `            <a class="btn btn-primary" href="${start}"${current(page, start)}>${w.cta.long}${ARROW}</a>`,
      '            <div class="menu-tools">',
      `              <a class="menu-lang" ${lang}>${w.other.name}</a>`,
      `              <button class="theme-toggle" type="button" data-theme-toggle aria-label="${w.theme}">`,
      pad(THEME_ICONS, 16),
      "              </button>",
      "            </div>",
      "          </div>",
      "        </div>",
      "      </details>",
      "    </div>",
      "  </div>",
      "</header>",
    ],
    2,
  );
}

function footer(page) {
  const w = WORDS[page.lang];
  const f = w.foot;
  const link = (url, name) => `<li><a href="${url}"${current(page, url)}>${name}</a></li>`;
  return indent(
    [
      '<footer class="foot">',
      '  <div class="foot-inner">',
      '    <div class="foot-grid">',
      '      <div class="foot-brand">',
      `        <a class="brand mono" href="${w.home}">mariohdz<span>.com</span></a>`,
      `        <p>${f.motto}</p>`,
      '        <a class="foot-mail" href="mailto:contact@mariohdz.com">contact@mariohdz.com</a>',
      "      </div>",
      '      <div class="foot-col">',
      `        <p class="foot-title mono">${f.services}</p>`,
      "        <ul>",
      SERVICES.map((service) => `          ${link(service[page.lang].url, service[page.lang].name)}`),
      `          ${link(w.prices, w.nav.prices)}`,
      "        </ul>",
      "      </div>",
      '      <div class="foot-col">',
      `        <p class="foot-title mono">${f.elsewhere}</p>`,
      "        <ul>",
      `          <li><a href="https://github.com/mariohdzdev" target="_blank" rel="me noopener">GitHub${OUT}<span class="sr-only">${f.newTab}</span></a></li>`,
      "        </ul>",
      "      </div>",
      '      <div class="foot-col">',
      `        <p class="foot-title mono">${f.legal}</p>`,
      "        <ul>",
      `          ${link(w.privacy, f.privacyName)}`,
      `          ${link(w.legal, f.legalName)}`,
      "        </ul>",
      "      </div>",
      "    </div>",
      '    <div class="foot-base mono">',
      "      <span>© 2026 Mario Hernández</span>",
      `      <span>${f.cookies}</span>`,
      `      <a href="#top">${f.top}</a>`,
      "    </div>",
      "  </div>",
      "</footer>",
    ],
    2,
  );
}

// The home page: each service with its projects, each one a row with what its starting price covers.
function services(page) {
  const w = WORDS[page.lang];
  return indent(
    [
      '<ul class="areas">',
      SERVICES.map((service) => {
        const s = service[page.lang];
        return [
          '  <li class="area">',
          '    <div class="area-head">',
          `      <span class="area-icon mono" aria-hidden="true" data-decode>${escape(service.glyph)}</span>`,
          `      <h3><a href="${s.url}">${s.name}${ARROW}</a></h3>`,
          `      <p class="area-sum">${s.summary}</p>`,
          "    </div>",
          '    <ul class="offers">',
          service.projects.map((key) => {
            const p = PROJECTS[key][page.lang];
            return [
              '      <li class="offer">',
              `        <a class="offer-name" href="${p.url}">${p.name}</a>`,
              `        <span class="offer-scope">${p.scope}</span>`,
              `        <span class="offer-price">${priceTag(page.lang, PROJECTS[key].price)}</span>`,
              `        ${ARROW}`,
              "      </li>",
            ];
          }),
          "    </ul>",
          "  </li>",
        ];
      }),
      "</ul>",
    ],
    10,
  );
}

// A service page: one short card per project, which leads to the project's own page.
function projects(page) {
  const w = WORDS[page.lang];
  const service = SERVICES.find((candidate) => candidate[page.lang].url === page.url);
  if (!service) throw new Error(`${page.url} has a projects part but isn't a service page`);
  return indent(
    [
      '<ul class="projects projects-short">',
      service.projects.map((key) => {
        const project = PROJECTS[key];
        const p = project[page.lang];
        return [
          `  <li class="project${project.featured ? " project-featured" : ""}" id="${p.id}">`,
          `    <h3><a href="${p.url}">${p.name}</a></h3>`,
          `    <p class="project-for">${p.for}</p>`,
          `    <p class="project-meta"><span class="project-scope">${p.scope}<span class="project-time">${p.time}</span></span><span class="project-price">${priceTag(page.lang, project.price)}</span></p>`,
          `    <p class="project-more" aria-hidden="true">${w.more}${ARROW}</p>`,
          "  </li>",
        ];
      }),
      "</ul>",
    ],
    10,
  );
}

// The prices page: every project, grouped by service, with what its price covers and how long it takes.
function prices(page) {
  return indent(
    SERVICES.map((service) => {
      const s = service[page.lang];
      return [
        '<div class="price-group">',
        `  <h3><a href="${s.url}">${s.name}</a></h3>`,
        '  <ul class="price-list">',
        service.projects.map((key) => {
          const p = PROJECTS[key][page.lang];
          return `    <li><a class="price-name" href="${p.url}">${p.name}<small>${p.scope}</small></a><span class="price-time">${p.time}</span><span class="price-amount">${priceTag(page.lang, PROJECTS[key].price)}</span>${ARROW}</li>`;
        }),
        "  </ul>",
        "</div>",
      ];
    }),
    12,
  );
}

// The guided form at /start/ and /es/empezar/, written from src/start.mjs. Without JavaScript every step and every
// question shows at once and the form still sends; public/start.js turns it into four short steps that only ask
// what the projects chosen need.
const START_WORDS = {
  en: {
    progress: "Your progress",
    steps: ["What you need", "What you have", "Details", "How we continue"],
    q1: "What do you need?",
    n1: "Choose one or more. It can change later.",
    q2: "What do you already have?",
    n2: "Answer what you can. “Not sure” is a fine answer, and no passwords go here.",
    customNote: "A few lines are enough. Your plan comes once the idea is clear.",
    unsureNote: "Choose everything that applies, and you’ll see where to start.",
    suggest: "A good place to start",
    q3: "A few details",
    n3: "Only what changes the price or the timeline.",
    q4: "How shall we continue?",
    n4: "Only your name and email are needed.",
    fixed: "Fixed price in your plan",
    languages: `+$${PRICES.secondLanguage.onePage} for one page, +$${PRICES.secondLanguage.upToFive} for up to five`,
    listing: `+$${PRICES.mapsListing}, included in the launch package`,
    name: "Name",
    email: "Email",
    business: "Business",
    message: "Tell me more about your project",
    optional: "Optional",
    messageHint: "What you’d like to achieve, sites or tools you like, important dates, anything that worries you… Every detail helps.",
    zonePick: "Choose your time zone",
    back: "Back",
    next: "Continue",
    send: "Send",
    note: 'I’ll only use your details to reply to you. <a href="/privacy/">Privacy policy</a>',
    trap: "Leave this empty",
    facts: [["Response time", "Within one business day"], ["Languages", "English and Spanish"]],
    quick: "Just a quick question?",
  },
  es: {
    progress: "Tu avance",
    steps: ["Qué necesitas", "Qué tienes", "Detalles", "Cómo seguimos"],
    q1: "¿Qué necesitas?",
    n1: "Elige uno o varios. Puede cambiar después.",
    q2: "¿Qué tienes ya?",
    n2: "Responde lo que sepas. «No sé» también es una buena respuesta, y aquí no van contraseñas.",
    customNote: "Con unas líneas basta. Tu plan llega cuando la idea esté clara.",
    unsureNote: "Marca todo lo que encaje y verás por dónde empezar.",
    suggest: "Un buen punto de partida",
    q3: "Algunos detalles",
    n3: "Solo lo que cambia el precio o el plazo.",
    q4: "¿Cómo seguimos?",
    n4: "Solo hacen falta tu nombre y tu correo.",
    fixed: "Precio cerrado en tu plan",
    languages: `+${PRICES.secondLanguage.onePage} USD con una página, +${PRICES.secondLanguage.upToFive} USD con hasta cinco`,
    listing: `+${PRICES.mapsListing} USD, incluida en el paquete de arranque`,
    name: "Nombre",
    email: "Correo",
    business: "Negocio",
    message: "Cuéntame más sobre tu proyecto",
    optional: "Opcional",
    messageHint: "Lo que te gustaría lograr, webs o herramientas que te gustan, fechas importantes, lo que te preocupa… Cualquier detalle ayuda.",
    zonePick: "Elige tu zona horaria",
    back: "Atrás",
    next: "Continuar",
    send: "Enviar",
    note: 'Solo usaré tus datos para responderte. <a href="/es/privacidad/">Política de privacidad</a>',
    trap: "Deja esto vacío",
    facts: [["Respuesta", "En un día laborable"], ["Idiomas", "Español e inglés"]],
    quick: "¿Solo una pregunta rápida?",
  },
};

const COPY_ICONS = [
  '<svg class="icon-copy" viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5"/></svg>',
  '<svg class="icon-check" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3.2 3L13 4.5"/></svg>',
];
const SELECT_ARROW = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg>';

const dashed = (name) => name.replace(/_/g, "-").replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
// The kinds of project that ask for a thing in step 2.
const kindsAsking = (item) => Object.keys(KINDS).filter((kind) => KINDS[kind].have.includes(item));

// One question of src/start.mjs as form controls: choices for one or many answers, a list to pick from,
// or a field to fill in.
function question(name, q, lang, { kind = "", only = q.only } = {}) {
  const t = START_WORDS[lang];
  const field = kind ? detailName(kind, name) : name;
  const id = `start-${dashed(field)}`;
  const onlyAttr = only ? ` data-only="${only.join(" ")}"` : "";
  const hint = q.hint ? q.hint[lang] : "";
  if (q.type === "one" || q.type === "many") {
    const type = q.type === "one" ? "radio" : "checkbox";
    return [
      `<fieldset class="question" id="${id}"${onlyAttr}>`,
      `  <legend class="question-label">${q[lang]}</legend>`,
      hint ? `  <p class="question-hint">${hint}</p>` : [],
      `  <div class="choices${type === "checkbox" ? " choices-many" : ""}">`,
      q.options.map((choice) => {
        let sub = choice.sub ? choice.sub[lang] : choice.price ? `+${WORDS[lang].price(choice.price)}` : "";
        let extraAttr = "";
        if (choice.extra) {
          sub = t[choice.extra];
          extraAttr = ` data-extra="${choice.extra}"`;
        }
        const suggests = choice.suggests ? ` data-suggests="${choice.suggests}"` : "";
        return [
          `    <label class="choice"><input type="${type}" name="${field}" value="${choice.value}"${suggests}><span class="choice-mark" aria-hidden="true"></span>`,
          `      <span class="choice-text"><span class="choice-name">${choice[lang]}</span>${sub ? `<span class="choice-sub"${extraAttr}>${sub}</span>` : ""}</span></label>`,
        ];
      }),
      "  </div>",
      "</fieldset>",
    ];
  }
  const optional = q === COMMON.site || q === COMMON.source ? ` <span>${t.optional}</span>` : "";
  const label = `<label for="${id}">${q[lang]}${optional}</label>`;
  const placeholder = q.placeholder && q.type !== "pick" ? ` placeholder="${q.placeholder[lang]}"` : "";
  const hintLine = hint ? `  <p class="field-hint" id="${id}-hint">${hint}</p>` : [];
  const described = hint ? ` aria-describedby="${id}-hint"` : "";
  if (q.type === "count") {
    return [`<div class="form-field start-count-field"${onlyAttr}>`, `  ${label}`, `  <input id="${id}" name="${field}" type="number" inputmode="numeric" min="${q.min}" max="${q.max}" step="1"${described}>`, hintLine, "</div>"];
  }
  if (q.type === "zone" || q.type === "pick") {
    const first = q.type === "zone" ? t.zonePick : q.placeholder[lang];
    const options = q.type === "zone" ? ZONES.map(([value, en, es]) => [value, lang === "es" ? es : en]) : q.options.map((choice) => [choice.value, choice[lang]]);
    return [
      `<div class="form-field">`,
      `  ${label}`,
      '  <div class="select start-select">',
      `    <select id="${id}" name="${field}"${q.type === "zone" ? " data-start-zone" : ""}>`,
      `      <option value="">${first}</option>`,
      options.map(([value, text]) => `      <option value="${value}">${text}</option>`),
      "    </select>",
      `    ${SELECT_ARROW}`,
      "  </div>",
      "</div>",
    ];
  }
  if (q.type === "text") {
    return [`<div class="form-field"${onlyAttr}>`, `  ${label}`, `  <textarea id="${id}" name="${field}" rows="4" maxlength="${q.max}"${placeholder}${described}></textarea>`, hintLine, "</div>"];
  }
  return [`<div class="form-field"${onlyAttr}>`, `  ${label}`, `  <input id="${id}" name="${field}" type="text" maxlength="${q.max}"${placeholder}${described}>`, hintLine, "</div>"];
}

function start(page) {
  const lang = page.lang;
  const w = WORDS[lang];
  const t = START_WORDS[lang];

  // Step 1: every project is a box to tick, so several can be chosen; public/start.js keeps the ones that
  // can't go together apart, as src/start.mjs does once the form is sent.
  const projectChoice = (key) => {
    const kind = kindOf(key);
    const price = projectPrice(key);
    // The check-up has one price, not a starting one; something made to measure is priced in its plan.
    let tag = "";
    if (key === "check-up") tag = `<span class="choice-price">${w.price(price)}</span>`;
    else if (price) tag = `<span class="choice-price"><span>${w.from}</span> ${w.price(price)}</span>`;
    else if (key === "custom") tag = `<span class="choice-price choice-price-plan">${t.fixed}</span>`;
    return [
      `<label class="choice choice-project"><input type="checkbox" name="project" value="${key}" data-kind="${kind}"${price ? ` data-price="${price}"` : ""}><span class="choice-mark" aria-hidden="true"></span>`,
      `  <span class="choice-text"><span class="choice-name">${projectName(key, lang)}</span><span class="choice-sub">${projectScope(key, lang)}</span></span>${tag}</label>`,
    ];
  };
  const group = (glyph, name, keys) => [
    '<div class="start-group">',
    `  <p class="start-group-name"><span class="area-icon mono" aria-hidden="true">${escape(glyph)}</span><span>${name}</span></p>`,
    '  <div class="choices choices-projects">',
    pad(keys.map(projectChoice), 4),
    "  </div>",
    "</div>",
  ];

  // Step 2: each thing once, under its heading, marked with the kinds of project that ask for it.
  const haveRow = (item) => {
    const name = haveName(item);
    const id = dashed(name);
    const [what, hint] = ITEMS[item][lang];
    return [
      `<div class="tri" role="radiogroup" aria-labelledby="${id}" aria-describedby="${id}-hint" data-kinds="${kindsAsking(item).join(" ")}">`,
      `  <p class="tri-q"><span class="tri-name" id="${id}">${what}</span><span class="tri-hint" id="${id}-hint">${hint}</span></p>`,
      '  <div class="tri-options">',
      ANSWERS.map((answer) => `    <label><input type="radio" name="${name}" value="${answer.value}"><span>${answer[lang]}</span></label>`),
      "  </div>",
      "</div>",
    ];
  };
  const haveGroups = GROUPS.map((g) => [
    `<div class="start-have" data-kinds="${[...new Set(g.items.flatMap(kindsAsking))].join(" ")}">`,
    `  <p class="start-sub">${g[lang]}</p>`,
    '  <div class="tri-list">',
    pad(g.items.map(haveRow), 4),
    "  </div>",
    "</div>",
  ]);
  const ownPart = (kind, note) => [
    `<fieldset class="start-part" data-kinds="${kind}" aria-labelledby="start-q2-${kind}">`,
    `  <h2 class="start-q" id="start-q2-${kind}" tabindex="-1">${KINDS[kind][lang]}</h2>`,
    `  <p class="start-note">${note}</p>`,
    pad(KINDS[kind].first.map((name) => question(name, QUESTIONS[name], lang, { kind })), 2),
    kind === "unsure" ? ['  <div class="start-suggest" data-start-suggest hidden>', `    <p class="start-suggest-label">${t.suggest}</p>`, '    <p class="start-suggest-name" data-start-suggest-name></p>', "  </div>"] : [],
    "</fieldset>",
  ];
  const step2 = [
    `<div class="start-part" data-kinds="${Object.keys(KINDS).filter((kind) => KINDS[kind].have.length).join(" ")}">`,
    `  <h2 class="start-q" id="start-q2" tabindex="-1">${t.q2}</h2>`,
    `  <p class="start-note">${t.n2}</p>`,
    pad(haveGroups, 2),
    "</div>",
    ownPart("custom", t.customNote),
    ownPart("unsure", t.unsureNote),
  ];

  // Step 3: each kind of project chosen, under its own heading.
  const step3 = Object.keys(KINDS)
    .filter((kind) => KINDS[kind].details.length)
    .map((kind) => [
      `<fieldset class="start-kind" data-kinds="${kind}" aria-labelledby="start-d-${kind}">`,
      `  <p class="start-sub" id="start-d-${kind}">${KINDS[kind][lang]}</p>`,
      pad(KINDS[kind].details.map((name) => question(name, QUESTIONS[name], lang, { kind })), 2),
      "</fieldset>",
    ]);

  const aside = [
    '<div class="start-aside" data-shield>',
    `  <ol class="start-progress" aria-label="${t.progress}" data-start-progress>`,
    t.steps.map((name, i) => `    <li><button type="button" data-goto="${i + 1}"><span class="start-progress-num mono">0${i + 1}</span><span>${name}</span></button></li>`),
    "  </ol>",
    '  <dl class="contact-facts">',
    t.facts.map(([dt, dd]) => `    <div><dt>${dt}</dt><dd>${dd}</dd></div>`),
    '    <div class="contact-email">',
    `      <dt>${t.quick}</dt>`,
    "      <dd>",
    '        <a class="email-chip" href="mailto:contact@mariohdz.com" data-copy="contact@mariohdz.com">',
    "          <span>contact@mariohdz.com</span>",
    pad(COPY_ICONS, 10),
    "        </a>",
    '        <p class="copy-hint" data-copy-hint aria-live="polite"></p>',
    "      </dd>",
    "    </div>",
    "  </dl>",
    "</div>",
  ];

  const form = [
    // public/start.js adds up the estimate from these, the same prices the Worker uses.
    `<form class="form glow start-form" action="/api/start" method="post" data-start data-prices='${JSON.stringify(PRICES)}'>`,
    `  <input type="hidden" name="lang" value="${lang}">`,
    '  <div class="start-top" aria-hidden="true"><p class="start-count mono" data-start-count></p><span class="start-line"><span data-start-line></span></span></div>',
    '  <div class="start-step" data-step="1">',
    '    <fieldset class="start-part" aria-labelledby="start-q1">',
    `      <h2 class="start-q" id="start-q1" tabindex="-1">${t.q1}</h2>`,
    `      <p class="start-note">${t.n1}</p>`,
    pad(
      [
        ...SERVICES.map((service) => group(service.glyph, service[lang].name, service.projects)),
        group(MORE.glyph, MORE[lang], Object.keys(MORE.projects)),
      ],
      6,
    ),
    '      <p class="field-error" data-start-error="project" role="alert" hidden></p>',
    "    </fieldset>",
    "  </div>",
    '  <div class="start-step" data-step="2">',
    pad(step2, 4),
    "  </div>",
    '  <div class="start-step" data-step="3">',
    `    <h2 class="start-q" id="start-q3" tabindex="-1">${t.q3}</h2>`,
    `    <p class="start-note">${t.n3}</p>`,
    pad(step3, 4),
    '    <div class="start-common">',
    pad([question("when", COMMON.when, lang), question("site", COMMON.site, lang)], 6),
    "    </div>",
    "  </div>",
    '  <div class="start-step" data-step="4">',
    `    <h2 class="start-q" id="start-q4" tabindex="-1">${t.q4}</h2>`,
    `    <p class="start-note">${t.n4}</p>`,
    pad([question("want", COMMON.want, lang), question("channel", COMMON.channel, lang)], 4),
    '    <div class="start-call" data-start-call>',
    pad([question("slot", COMMON.slot, lang), question("tz", COMMON.tz, lang)], 6),
    "    </div>",
    '    <div class="start-you">',
    '      <div class="form-field">',
    `        <label for="start-name">${t.name}</label>`,
    '        <input id="start-name" name="name" type="text" autocomplete="name" maxlength="100" required>',
    "      </div>",
    '      <div class="form-field">',
    `        <label for="start-email">${t.email}</label>`,
    '        <input id="start-email" name="email" type="email" autocomplete="email" maxlength="254" required>',
    "      </div>",
    '      <div class="form-field form-wide">',
    `        <label for="start-business">${t.business} <span>${t.optional}</span></label>`,
    '        <input id="start-business" name="business" type="text" autocomplete="organization" maxlength="100">',
    "      </div>",
    '      <div class="form-field form-wide">',
    `        <label for="start-message">${t.message} <span>${t.optional}</span></label>`,
    `        <textarea id="start-message" name="message" rows="4" maxlength="5000" placeholder="${t.messageHint}"></textarea>`,
    "      </div>",
    pad(question("source", COMMON.source, lang), 6).map((line, i, all) => (i === 0 ? line.replace('<div class="form-field">', '<div class="form-field form-wide">') : line)),
    "    </div>",
    '    <div class="start-estimate" data-start-estimate aria-live="polite" hidden></div>',
    "  </div>",
    '  <div class="form-trap" aria-hidden="true">',
    `    <label for="start-website">${t.trap}</label>`,
    '    <input id="start-website" name="website" type="text" tabindex="-1" autocomplete="off">',
    "  </div>",
    '  <div class="start-nav">',
    `    <button class="btn btn-ghost start-back" type="button" data-start-back>${t.back}</button>`,
    `    <button class="btn btn-primary start-next" type="button" data-start-next>${t.next}${ARROW}</button>`,
    `    <button class="send" type="submit">${t.send}</button>`,
    "  </div>",
    `  <p class="form-note">${t.note}</p>`,
    '  <p class="form-status" role="status" aria-live="polite" data-form-status></p>',
    "</form>",
  ];

  return indent(['<div class="start-main">', pad(aside, 2), pad(form, 2), "</div>"], 8);
}

const PARTS = { header, footer, services, projects, prices, start };

const stale = [];
for (const file of readdirSync(ROOT, { recursive: true })) {
  if (!file.endsWith(".html")) continue;
  const html = readFileSync(join(ROOT, file), "utf8");
  const page = describe(file, html);
  const built = html.replace(/^( *)<!-- build:(\w+) -->\n[\s\S]*?\n\1<!-- \/build:\2 -->$/gm, (_, space, name) => {
    if (!PARTS[name]) throw new Error(`${file}: there's no part called ${name}`);
    return `${space}<!-- build:${name} -->\n${PARTS[name](page)}\n${space}<!-- /build:${name} -->`;
  });
  if (built === html) continue;
  stale.push(file);
  if (!check) writeFileSync(join(ROOT, file), built);
}

if (check && stale.length) {
  for (const file of stale) console.error(`::error::public/${file} is out of date: run node tools/build.mjs and commit what it writes`);
  process.exit(1);
}
console.log(check ? "Every page is up to date." : stale.length ? `Updated ${stale.length} pages.` : "Every page was already up to date.");
