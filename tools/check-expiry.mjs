// Monthly reminder: fails, so GitHub emails me, when security.txt or the Cloudflare deploy token expires
// within 30 days. Run it from the root of the repository: node tools/check-expiry.mjs
// Without CLOUDFLARE_API_TOKEN it only checks security.txt.
import { readFileSync } from "node:fs";

const WARN_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;
const problems = [];
const daysLeft = (date) => Math.floor((date - Date.now()) / DAY);

const securityTxt = readFileSync("public/.well-known/security.txt", "utf8");
const expires = Date.parse(securityTxt.match(/^Expires:\s*(\S+)/m)?.[1]);
if (Number.isNaN(expires)) {
  problems.push("security.txt has no Expires date.");
} else if (daysLeft(expires) < WARN_DAYS) {
  problems.push(`security.txt expires in ${daysLeft(expires)} days. Move its Expires date forward, to less than a year from now.`);
} else {
  console.log(`security.txt expires in ${daysLeft(expires)} days.`);
}

const token = process.env.CLOUDFLARE_API_TOKEN;
if (token) {
  // User tokens and account tokens are checked at different addresses.
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const addresses = ["https://api.cloudflare.com/client/v4/user/tokens/verify"];
  if (account) addresses.push(`https://api.cloudflare.com/client/v4/accounts/${account}/tokens/verify`);
  let result = null;
  for (const address of addresses) {
    const response = await fetch(address, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json().catch(() => ({}));
    if (body.success) {
      result = body.result;
      break;
    }
  }
  const tokenExpires = Date.parse(result?.expires_on);
  if (result?.status !== "active") {
    problems.push("Cloudflare no longer accepts the deploy token. Create a new one and update the CLOUDFLARE_API_TOKEN secret.");
  } else if (Number.isNaN(tokenExpires)) {
    console.log("The deploy token has no expiry date.");
  } else if (daysLeft(tokenExpires) < WARN_DAYS) {
    problems.push(`The deploy token expires in ${daysLeft(tokenExpires)} days. Roll it in Cloudflare, move its end date forward and update the CLOUDFLARE_API_TOKEN secret.`);
  } else {
    console.log(`The deploy token expires in ${daysLeft(tokenExpires)} days.`);
  }
} else {
  console.log("No CLOUDFLARE_API_TOKEN, so the deploy token wasn't checked.");
}

if (problems.length) {
  for (const problem of problems) console.error(`::error::${problem}`);
  process.exit(1);
}
