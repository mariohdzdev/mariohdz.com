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
import { PROJECTS, SERVICES, WORDS } from "./site.mjs";

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
  // Pages with a contact section of their own send the visitor there; the others, to the home page's.
  const contact = page.kind === "home" || page.kind === "page" ? `#${w.anchors.contact}` : section("contact");
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
      `          <a class="menu-custom glow" href="${contact}"><strong>${w.custom.title}</strong><span>${w.custom.text}</span>${ARROW}</a>`,
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
      `      <a class="bar-cta" href="${contact}"><span class="long">${w.cta.long}</span><span class="short">${w.cta.short}</span></a>`,
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
      `            <a class="btn btn-primary" href="${contact}">${w.cta.long}${ARROW}</a>`,
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

const PARTS = { header, footer, services, projects, prices };

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
