// Tells the search engines that use IndexNow (Bing among them) which pages a deploy added, changed or removed,
// so they read them again within hours instead of waiting for their next visit. Google doesn't use IndexNow;
// it reads the sitemap.
//
// Usage: node tools/indexnow.mjs [the commit before this push]
// It sends every page in the sitemap when there's no usable commit (a deploy started by hand) or when the key
// file itself is new. The key is public on purpose: it sits in public/<key>.txt so the search engines can check
// that the request comes from whoever runs the site.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";

const ORIGIN = "https://mariohdz.com";
const keyFile = readdirSync("public").find((name) => /^[0-9a-f]{32}\.txt$/.test(name));
if (!keyFile) throw new Error("No IndexNow key file (32 hex characters and .txt) in public/");
const key = readFileSync(`public/${keyFile}`, "utf8").trim();

// public/es/precios/index.html → https://mariohdz.com/es/precios/
const pageUrl = (file) => `${ORIGIN}/${file.slice("public/".length).replace(/index\.html$/, "")}`;

// The pages that changed since `before`, or null to send them all.
function changedPages(before) {
  if (!/^[0-9a-f]{40}$/.test(before ?? "") || /^0+$/.test(before)) return null;
  let files;
  try {
    files = execFileSync("git", ["diff", "--name-only", before, "HEAD", "--", "public"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).split("\n");
  } catch {
    return null; // That commit isn't in this checkout.
  }
  if (files.includes(`public/${keyFile}`)) return null;
  return files.filter((file) => file.endsWith("index.html")).map(pageUrl);
}

const sitemap = readFileSync("public/sitemap.xml", "utf8");
const urls = changedPages(process.argv[2]) ?? [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

if (urls.length === 0) {
  console.log("No page changed, so there's nothing to tell the search engines.");
} else {
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: "mariohdz.com", key, keyLocation: `${ORIGIN}/${keyFile}`, urlList: urls }),
  });
  // 200 means received, and 202 received while the key is still being checked, as on the first request.
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`IndexNow answered ${response.status}: ${await response.text()}`);
  }
  console.log(`Sent ${urls.length} page(s) to IndexNow (${response.status}):\n${urls.join("\n")}`);
}
