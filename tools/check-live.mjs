// Checks the live site right after a deploy: every file in public/ is the one from this commit, the headers
// in public/_headers are sent, missing pages and old addresses answer as they should, the MTA-STS policy is
// served, and the contact form's API turns down an empty form, which sends nothing.
// Run it from the root of the repository: node tools/check-live.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SITE = "https://mariohdz.com";
const POLICY_URL = "https://mta-sts.mariohdz.com/.well-known/mta-sts.txt";
const POLICY_FILE = "mta-sts/public/.well-known/mta-sts.txt";

const problems = [];
const check = (ok, what) => ok || problems.push(what);
// A request that can't connect comes back as status 599, with the reason as its status text.
const get = (url, options = {}) =>
  fetch(url, { redirect: "manual", ...options, headers: { "User-Agent": "mariohdz.com deploy check", ...options.headers } })
    .catch((error) => new Response(null, { status: 599, statusText: error.cause?.code ?? error.message }));
const status = (response) => `${response.status}${response.status === 599 ? ` ${response.statusText}` : ""}`;
const read = (path) => readFileSync(join("public", path));

// What each address should serve. The 404 pages are checked below, through addresses that don't exist.
const expected = new Map([[POLICY_URL, readFileSync(POLICY_FILE)]]);
for (const file of readdirSync("public", { recursive: true })) {
  const path = `/${file.split("\\").join("/")}`;
  if (statSync(join("public", file)).isDirectory() || path === "/_headers" || path.endsWith("/404.html")) continue;
  expected.set(SITE + (path.endsWith("/index.html") ? path.slice(0, -"index.html".length) : path), read(file));
}

// Right after a deploy, the new files can take a few seconds to reach every Cloudflare location,
// and a new subdomain a little longer.
async function mismatch(url, body) {
  const response = await get(url);
  const live = Buffer.from(await response.arrayBuffer());
  return response.status === 200 && live.equals(body) ? null : `${url} (${status(response)})`;
}
let stale = [];
for (let attempt = 1; attempt <= 12; attempt += 1) {
  stale = (await Promise.all([...expected].map(([url, body]) => mismatch(url, body)))).filter(Boolean);
  if (!stale.length) break;
  await new Promise((resolve) => setTimeout(resolve, 10_000));
}
for (const url of stale) problems.push(`${url} isn't serving the file from this commit`);

// The headers every page gets, as written in public/_headers.
const headers = [];
let rule = "";
for (const line of readFileSync("public/_headers", "utf8").split("\n")) {
  if (/^\S/.test(line)) rule = line.trim();
  else if (rule === "/*" && line.includes(":")) headers.push(line.trim().split(/:\s*(.*)/s).slice(0, 2));
}
const home = await get(`${SITE}/`);
for (const [name, value] of headers) {
  check(home.headers.get(name) === value, `${name} on / is "${home.headers.get(name)}", not "${value}"`);
}
for (const url of [`${SITE}/.well-known/security.txt`, POLICY_URL]) {
  const type = (await get(url)).headers.get("Content-Type") || "";
  check(type.startsWith("text/plain"), `${url} is served as "${type}", not text/plain`);
}

// Missing pages get the 404 page in their language; www and plain HTTP send visitors to the same address.
for (const [url, page] of [[`${SITE}/no-such-page/`, "404.html"], [`${SITE}/es/no-such-page/`, "es/404.html"]]) {
  const response = await get(url);
  const body = Buffer.from(await response.arrayBuffer());
  check(response.status === 404 && body.equals(read(page)), `${url} answered ${status(response)} without public/${page}`);
}
for (const [from, to] of [
  ["https://www.mariohdz.com/privacy/?check=1", `${SITE}/privacy/?check=1`],
  ["http://mariohdz.com/legal/", `${SITE}/legal/`],
]) {
  const response = await get(from);
  const location = response.headers.get("Location");
  check(response.status === 301 && location === to, `${from} answered ${status(response)} to ${location}, not 301 to ${to}`);
}
const policyRoot = await get("https://mta-sts.mariohdz.com/");
check(policyRoot.status === 404, `https://mta-sts.mariohdz.com/ answered ${status(policyRoot)}, not 404`);

// The contact form's API only takes POST, and an empty form is turned down before anything is sent.
const wrongMethod = await get(`${SITE}/api/contact`);
check(wrongMethod.status === 405 && wrongMethod.headers.get("Allow") === "POST", `GET /api/contact answered ${status(wrongMethod)}, not 405`);
const empty = await get(`${SITE}/api/contact`, { method: "POST", body: new FormData(), headers: { Accept: "application/json" } });
const answer = await empty.json().catch(() => ({}));
check(empty.status === 400 && answer.ok === false && answer.message, `an empty form got ${status(empty)} ${JSON.stringify(answer)}, not 400`);

if (problems.length) {
  for (const problem of problems) console.error(`::error::${problem}`);
  process.exit(1);
}
console.log(`Live checks passed: ${expected.size} files match this commit, plus headers, redirects, 404 pages and the form's API.`);
