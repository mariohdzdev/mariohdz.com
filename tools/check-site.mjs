// Checks the site in public/ before it's published: every internal link and anchor leads somewhere, every
// page is paired with its counterpart in the other language, and the sitemap, security.txt and the MTA-STS
// policy are in order. Run it from the root of the repository: node tools/check-site.mjs
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "public";
const ORIGIN = "https://mariohdz.com";
const POLICY = "mta-sts/public/.well-known/mta-sts.txt";
const DAY = 24 * 60 * 60 * 1000;

const problems = new Set();
const fail = (where, what) => problems.add(`${where}: ${what}`);

// Every HTML file, by the address it's served at.
const pages = new Map();
for (const file of readdirSync(ROOT, { recursive: true })) {
  const path = `/${file.split("\\").join("/")}`;
  if (!path.endsWith(".html")) continue;
  const url = path.endsWith("/index.html") ? path.slice(0, -"index.html".length) : path;
  pages.set(url, readFileSync(join(ROOT, file), "utf8"));
}
const isNotFoundPage = (url) => url.endsWith("/404.html");
const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));

function served(path) {
  if (pages.has(path)) return true;
  const file = join(ROOT, path);
  return existsSync(file) && statSync(file).isFile();
}

// Internal links, scripts, images and meta URLs, with their #anchors.
let links = 0;
for (const [url, html] of pages) {
  for (const [, attribute, value] of html.matchAll(/\s(href|src|content)="([^"]*)"/g)) {
    if (attribute === "content" && !value.startsWith(`${ORIGIN}/`)) continue;
    const target = new URL(value, ORIGIN + url);
    if (target.origin !== ORIGIN) continue;
    links += 1;
    const path = decodeURIComponent(target.pathname);
    const anchor = decodeURIComponent(target.hash.slice(1));
    if (!served(path)) {
      fail(url, `${value} doesn't lead to a file in public/`);
    } else if (anchor && pages.has(path) && !ids(pages.get(path)).has(anchor)) {
      fail(url, `${value} points to #${anchor}, which isn't on that page`);
    }
  }
}

// Each page names itself and its counterpart in the other language, and the counterpart names the same pair.
const pairs = new Map();
for (const [url, html] of pages) {
  if (isNotFoundPage(url)) continue;
  const lang = html.match(/<html[^>]*\slang="([^"]+)"/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const alternates = {};
  for (const [tag] of html.matchAll(/<link\b[^>]*\srel="alternate"[^>]*>/g)) {
    const hreflang = tag.match(/\shreflang="([^"]+)"/)?.[1];
    if (hreflang) alternates[hreflang] = tag.match(/\shref="([^"]+)"/)?.[1];
  }
  pairs.set(url, { lang, alternates });
  if (lang !== "en" && lang !== "es") fail(url, `the page language is "${lang}", not en or es`);
  if (canonical !== ORIGIN + url) fail(url, `the canonical link is ${canonical}, not ${ORIGIN + url}`);
  if (!alternates.en || !alternates.es) fail(url, "it needs hreflang links to both its English and Spanish versions");
  if (alternates[lang] !== ORIGIN + url) fail(url, `its hreflang="${lang}" link should point to itself`);
  if (alternates["x-default"] !== alternates.en) fail(url, "its x-default link should point to the English version");
}
for (const [url, { lang, alternates }] of pairs) {
  const other = lang === "en" ? "es" : "en";
  const counterpart = alternates[other]?.startsWith(ORIGIN) ? alternates[other].slice(ORIGIN.length) : null;
  const pair = counterpart && pairs.get(counterpart);
  if (!pair) {
    fail(url, `its ${other} version, ${alternates[other]}, isn't a page in public/`);
  } else if (pair.lang !== other || pair.alternates.en !== alternates.en || pair.alternates.es !== alternates.es) {
    fail(url, `it and ${counterpart} don't name each other as the same English and Spanish pair`);
  }
}

// The sitemap lists every page, and only pages that exist.
const sitemap = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
const listed = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
for (const [, href] of sitemap.matchAll(/<xhtml:link[^>]*\shref="([^"]+)"/g)) {
  if (!listed.has(href)) fail("sitemap.xml", `${href} is named as an alternate but has no <loc> of its own`);
}
for (const loc of listed) {
  if (!loc.startsWith(ORIGIN) || !pairs.has(loc.slice(ORIGIN.length))) fail("sitemap.xml", `${loc} isn't a page in public/`);
}
for (const url of pairs.keys()) {
  if (!listed.has(ORIGIN + url)) fail("sitemap.xml", `${url} is missing`);
}

// security.txt (RFC 9116): a way to reach me, an expiry date less than a year away, and its own address.
const securityTxt = fields(readFileSync(join(ROOT, ".well-known/security.txt"), "utf8"));
const expires = Date.parse(securityTxt.Expires?.[0]);
if (!securityTxt.Contact) fail("security.txt", "it needs a Contact line");
if (Number.isNaN(expires)) fail("security.txt", "it needs an Expires date");
else if (expires <= Date.now()) fail("security.txt", `it expired on ${securityTxt.Expires[0]}`);
else if (expires - Date.now() > 366 * DAY) fail("security.txt", "Expires should be less than a year away");
if (securityTxt.Canonical?.[0] !== `${ORIGIN}/.well-known/security.txt`) fail("security.txt", "Canonical should be its own address");

// MTA-STS policy (RFC 8461): the version, a known mode, the mail servers and how long to remember it.
const policy = fields(readFileSync(POLICY, "utf8"));
const maxAge = Number(policy.max_age?.[0]);
if (policy.version?.[0] !== "STSv1") fail(POLICY, "version should be STSv1");
if (!["testing", "enforce", "none"].includes(policy.mode?.[0])) fail(POLICY, "mode should be testing, enforce or none");
if (!policy.mx?.length) fail(POLICY, "it needs at least one mx line");
if (!Number.isInteger(maxAge) || maxAge < 0 || maxAge > 31557600) fail(POLICY, "max_age should be a number of seconds up to 31557600");

if (problems.size) {
  for (const problem of problems) console.error(`::error::${problem}`);
  process.exit(1);
}
console.log(`Site checks passed: ${pairs.size} pages in ${pairs.size / 2} language pairs, ${links} internal links.`);

// "Key: value" lines, skipping comments, with every value kept for keys that repeat.
function fields(text) {
  const result = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([\w-]+):\s*(.*?)\s*$/);
    if (match) (result[match[1]] ??= []).push(match[2]);
  }
  return result;
}
