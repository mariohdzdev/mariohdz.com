# mariohdz.com

The source of [mariohdz.com](https://mariohdz.com), my personal site.

Plain HTML, CSS and a little JavaScript in `public/`, served by a Cloudflare Worker (`src/worker.js`) that also sends the contact form to my inbox. No build step, no dependencies and no cookies. The fonts are served from the same domain, and visits are counted with Cloudflare Web Analytics, which doesn't use cookies either.

## Pages

The site is in English and Spanish. Each page has its counterpart, linked with `hreflang` and listed in `public/sitemap.xml`:

| English | Spanish |
| --- | --- |
| `/` | `/es/` |
| `/privacy/` | `/es/privacidad/` |
| `/legal/` | `/es/aviso-legal/` |

Missing pages show `public/404.html`, or `public/es/404.html` under `/es/`. Both languages share `styles.css` and `main.js`; the script picks its messages from the `lang` attribute of the page.

The layout has four compositions rather than one that stretches: phones, tablets from 40rem, desktops from 64rem and wide screens from 100rem, where the whole type scale grows with the root font size. Some components also adapt to the space they get, with container queries.

## Run it locally

```sh
npx wrangler@4.151.3 dev
```

Then open <http://localhost:8787>. Locally the contact form doesn't send real email: Wrangler logs each message and saves its text under `.wrangler/tmp/email/`. The MTA-STS Worker runs on its own with `npx wrangler@4.151.3 dev --config mta-sts/wrangler.jsonc --port 8788`.

Before pushing, `node tools/check-site.mjs` runs the same link, language and file checks as the deploy.

## Contact form

The form posts to `/api/contact`. The Worker checks the fields and sends the message to contact@mariohdz.com with the visitor's address as Reply-To. The topic the visitor picks, if any, goes in the subject, and a hidden `lang` field tells the Worker which language to answer in. It works without JavaScript too; with JavaScript the page shows the result in place.

Three protections, none of which someone filling in the form should notice:

- A hidden field that people never see but bots fill in. A message that fills it in still arrives, with `[Possible spam]` at the start of the subject, in case a browser or password manager filled it in for someone.
- At most 10 messages a minute from one IP address, with the Workers Rate Limiting binding `CONTACT_LIMIT`. It's generous on purpose, because offices and mobile networks put many people behind one address, and Cloudflare counts it separately in each of its locations.
- Requests over 64 KB are turned away before they're read. A full form is a few kilobytes.

Each submission leaves one line in Workers Logs, kept for seven days: what happened (`sent`, `invalid`, `limited`, `failed` and so on), the language, the topic and, when sending fails, Cloudflare's error code. Never the visitor's name, address, message or IP address: the automatic log of every request is off in `wrangler.jsonc`. The lines are in the Cloudflare dashboard, in the Worker's Observability tab.

Sending uses Cloudflare Email Service through the `send_email` binding, set in `wrangler.jsonc` to deliver only to contact@mariohdz.com and only from form@notify.mariohdz.com. Automatic mail goes out from the `notify` subdomain so it stays apart from my own inbox: its records and its DMARC policy live on that subdomain and leave the main domain's mail setup alone. For it to work, notify.mariohdz.com has to be onboarded in Email Sending (Workers Paid plan) and contact@mariohdz.com has to be a verified destination address.

## Security and mail

- Every page is sent with the headers in `public/_headers`, among them a strict Content Security Policy and HSTS for two years with `includeSubDomains` and `preload`. The domain is submitted to the HSTS preload list built into browsers, so every subdomain has to work over HTTPS, and leaving the list takes months.
- `public/.well-known/security.txt` tells anyone who finds a security problem how to reach me ([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)). It expires on purpose, less than a year ahead; the monthly expiry check (see Deploy) warns 30 days before.
- Proton receives the mail for @mariohdz.com. The DNS records that protect it are in Cloudflare, not in this repository: SPF, DKIM and DMARC with `p=reject`, whose reports go to Cloudflare's DMARC Management; a CAA record, with which Cloudflare also publishes the certificate authorities it uses; and MTA-STS with TLS reporting, so other mail servers deliver to Proton only over an encrypted, verified connection and report any problem to contact@mariohdz.com.
- Proton doesn't host the MTA-STS policy for custom domains, so `mta-sts/` is a second Worker, with no code, that serves it at <https://mta-sts.mariohdz.com/.well-known/mta-sts.txt>. It starts in `testing` mode, which only reports problems. To enforce it, change `mode` to `enforce` and `max_age` to `604800` (a week), deploy, and then change the `id` in the `_mta-sts` TXT record so mail servers fetch the new policy.

## Link preview images

`public/og.png` and `public/og-es.png` are the images apps like WhatsApp, LinkedIn or Slack show when someone shares a link to the site. They're drawn by `tools/og-image.html`, which sits outside `public/` so it isn't published; `?lang=es` switches it to Spanish. After changing the name, the offer or the colours, render both again from the root of the repository:

```sh
for lang in en es; do
  name=og; query=""
  if [ "$lang" = es ]; then name=og-es; query="?lang=es"; fi
  chromium --headless=new --hide-scrollbars --allow-file-access-from-files \
    --window-size=1200,630 --force-device-scale-factor=1 --virtual-time-budget=5000 \
    --screenshot="$PWD/og-full.png" "file://$PWD/tools/og-image.html$query"
  magick og-full.png -strip -dither None -colors 256 "PNG8:public/$name.png" && rm og-full.png
done
```

The `magick` step shrinks each file to about a third of its size without a visible change.

## Deploy

Every push to `main` deploys the site with GitHub Actions (`.github/workflows/deploy.yml`), in three steps:

1. **Check.** The HTML goes through the W3C's Nu HTML Checker, and `tools/check-site.mjs` checks every internal link and anchor, that each page is paired with its counterpart in the other language, the sitemap, `security.txt` and the MTA-STS policy. Both Workers are built without being deployed. Pull requests, like Dependabot's, stop here.
2. **Deploy.** Wrangler deploys the site and then the MTA-STS Worker.
3. **Check the live site.** `tools/check-live.mjs` confirms that every file in `public/` is the one from this commit, that the headers in `public/_headers` are sent, that missing pages, www and plain HTTP answer as they should, and that the form's API turns down an empty form, which sends nothing.

The workflow reads two repository secrets: `CLOUDFLARE_API_TOKEN`, a token that can only edit Workers scripts and the Workers routes of mariohdz.com, and `CLOUDFLARE_ACCOUNT_ID`.

On the first of every month, `.github/workflows/expiry.yml` runs `tools/check-expiry.mjs`, which fails, so GitHub sends an email, when `security.txt` or the deploy token expires within 30 days. GitHub pauses scheduled workflows in public repositories after 60 days without activity; after a long pause, turn it back on in the Actions tab.

Dependabot (`.github/dependabot.yml`) opens one pull request a month when the actions used here have new releases. They're pinned to a commit, so they never change on their own. Wrangler and the HTML checker are pinned by version in the workflow and updated by hand.

A ruleset on `main` blocks force pushes and deleting the branch.

## License

The code is under the [MIT license](LICENSE). The writing on the site isn't. The fonts, [Geist and Geist Mono](https://github.com/vercel/geist-font), keep their own license, the SIL Open Font License 1.1 (see `public/fonts/LICENSE.txt`).
