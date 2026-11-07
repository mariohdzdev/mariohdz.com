# mariohdz.com

The source of [mariohdz.com](https://mariohdz.com), my personal site.

Plain HTML, CSS and a little JavaScript in `public/`, served by a Cloudflare Worker (`src/worker.js`) that also sends the site's two forms to my inbox. No build step on deploy, no dependencies and no cookies. The fonts are served from the same domain, and visits are counted with Cloudflare Web Analytics, which doesn't use cookies either.

## Pages

The site is in English and Spanish. Each page has its counterpart, linked with `hreflang` and listed in `public/sitemap.xml`:

| English | Spanish |
| --- | --- |
| `/` | `/es/` |
| `/pricing/` | `/es/precios/` |
| `/start/` | `/es/empezar/` |
| `/services/web-domains-email/` | `/es/servicios/web-dominios-correo/` |
| `/services/web-domains-email/email-deliverability/` | `/es/servicios/web-dominios-correo/correo-a-la-bandeja/` |
| `/services/ai-automation/` | `/es/servicios/ia-automatizacion/` |
| `/privacy/` | `/es/privacidad/` |
| `/legal/` | `/es/aviso-legal/` |

Every project has a page of its own under its service's address, listed in the sitemap after its service: the signs that call for it, why it matters, how it's done, what's included, its terms, my advice, its questions and a button that starts it. Each service page lists its projects as short cards that lead there: who each one is for, what its starting price covers, how long it takes and the price. The extras, what every project includes, the service's own questions and the same contact form as the home page follow. The home page lists every project the same way, as a row under its service, and the prices page brings every project, extra, the tech check-up and the care plan together. A starting price never appears without what it covers.

On desktops, Services in the header opens a panel with every project, grouped by service; on phones and tablets a Menu button opens the same groups with the other sections, the language and the theme. Both are `details` elements, so they work without JavaScript.

## Shared parts

The header with its menus, the footer, the services on the home page, the projects on each service page and the lists on the prices page are written by `tools/build.mjs` from `tools/site.mjs`, which holds the services, their projects and prices in both languages, and the words those parts use. In the pages, each part sits between `<!-- build:name -->` and `<!-- /build:name -->`; everything outside those marks is edited by hand as before. After changing `tools/site.mjs`, or adding a page, run:

```sh
node tools/build.mjs
```

and commit what it writes. The deploy runs it with `--check` and stops if any page is out of date. The guided form on `/start/` and `/es/empezar/` is a part too, written from `src/start.mjs`. A new price also goes in the project's own page, its service page's description and structured data (`minPrice`), in both languages. The contact section is still a copy of the home page's on every page that has one.

Missing pages show `public/404.html`, or `public/es/404.html` under `/es/`. Both languages share `styles.css` and `main.js`; the script picks its messages from the `lang` attribute of the page.

The layout has four compositions rather than one that stretches: phones, tablets from 40rem, desktops from 64rem and wide screens from 100rem, where the whole type scale grows with the root font size. Some components also adapt to the space they get, with container queries.

## Run it locally

```sh
npx wrangler@4.151.3 dev
```

Then open <http://localhost:8787>. Locally the forms don't send real email: Wrangler logs each message and saves its text, and its HTML when it has one, under `.wrangler/tmp/email/`. The MTA-STS Worker runs on its own with `npx wrangler@4.151.3 dev --config mta-sts/wrangler.jsonc --port 8788`.

Before pushing, `node tools/build.mjs --check` and `node tools/check-site.mjs` run the same checks as the deploy.

## Contact form

The form posts to `/api/contact`. The Worker checks the fields and sends the message to contact@mariohdz.com with the visitor's address as Reply-To. A project's "Start this project" button fills in a hidden `project` field, and the project, or else the topic the visitor picks, goes in the subject. The Worker only accepts the projects and topics it lists, so a new project needs its key added there. A hidden `lang` field tells the Worker which language to answer in. Both forms check the address the same way: it has to look like a real one, a mistyped provider or ending (`gmial.com`, `.con`) gets a "Did you mean…?" under the field, and the Worker asks Cloudflare's public resolver whether the domain can receive mail at all, about the domain alone. If the resolver doesn't answer, the address isn't held up. It works without JavaScript too; with JavaScript the page shows the result in place.

Three protections, none of which someone filling in a form should notice:

- A hidden field that people never see but bots fill in. A message that fills it in still arrives, with `[Possible spam]` at the start of the subject, in case a browser or password manager filled it in for someone.
- At most 10 messages a minute from one IP address, with the Workers Rate Limiting binding `CONTACT_LIMIT`. It's generous on purpose, because offices and mobile networks put many people behind one address, and Cloudflare counts it separately in each of its locations.
- Requests over 64 KB are turned away before they're read. A full form is a few kilobytes.

Each submission leaves one line in Workers Logs, kept for seven days: what happened (`sent`, `invalid`, `limited`, `failed` and so on), the language, the topic and, when sending fails, Cloudflare's error code. Never the visitor's name, address, message or IP address: the automatic log of every request is off in `wrangler.jsonc`. The lines are in the Cloudflare dashboard, in the Worker's Observability tab.

Sending uses Cloudflare Email Service through the `send_email` binding, set in `wrangler.jsonc` to deliver only to contact@mariohdz.com and only from form@notify.mariohdz.com. Automatic mail goes out from the `notify` subdomain so it stays apart from my own inbox: its records and its DMARC policy live on that subdomain and leave the main domain's mail setup alone. For it to work, notify.mariohdz.com has to be onboarded in Email Sending (Workers Paid plan) and contact@mariohdz.com has to be a verified destination address.

## Guided form

`/start/` and `/es/empezar/` ask in four short steps what someone needs (one project or several), what they already have (yes, no or not sure, with a plain line that explains each thing), the details that shape the price or the timeline, and how they'd like to continue: a plan or an idea of the price, by email or on a video call. Each thing is asked once even when several projects need it, and what another answer makes moot folds away (without a domain, there's no account or address on it to ask about). What can't go together is kept apart where the visitor can see it: the websites are one choice with round marks, business email folds into the launch package when it's chosen, and "Not sure yet" sits apart and goes on its own; when one choice changes another, a line says so with an Undo. A website and business email chosen apart cost what the launch package costs, so the form offers the switch, and it says when "Email that reaches the inbox" is only needed for other services that send email. Only the name and the address are required, and nothing asks for a password. A live estimate from the public prices sits beside the steps on desktops and above them on phones, always with "Nothing to pay now", and once it's sent, the page shows a reference such as `MH-1107-K3F`. The answers wait in the tab's session storage (never a cookie) until they're sent or the tab is closed, so a reload or a change of language keeps them; each step is an entry in the browser's history, and while there's something to lose, links that leave the form open in a new tab. Folds and steps move with short transitions, and stay still when the system asks for reduced motion.

The questions, in both languages, live in `src/start.mjs`, with the prices of the extras in `tools/site.mjs` (`PRICES`). `tools/build.mjs` writes the form from there, and `public/start.js` shows one step at a time with only the questions that fit the project chosen; without JavaScript every step shows at once and the form still sends. "Start this project", "Book a check-up", the header's "Start a project" and "Something else in mind?" lead there with their project chosen (`?project=one-page`), and every contact section links to it.

The form posts to `/api/start`. The Worker reads only the answers that belong to the projects chosen, each one against the lists in `src/start.mjs`, and sends me a message in Spanish, in HTML and in plain text, that says at a glance what kind of request it is, with a tag at the start of the subject for mail filters: `[Listo]` (a clear request for a plan), `[Orientar]` (doubts, a domain out of reach, advice or something made to measure) or `[Precio]` (only an idea of the price). Under it come the estimate, what they already have, the details, notes from fixed rules on what to check or offer, and their message. The protections and the rate limit are the same as the contact form's, and the visitor gets no email from it: the confirmation, with the address they left and the reference, shows on the page. The log line adds the project and the kind of request, never the answers.

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

Every push to `main` deploys the site with GitHub Actions (`.github/workflows/deploy.yml`), in four steps:

1. **Check.** The HTML goes through the W3C's Nu HTML Checker, `tools/build.mjs --check` confirms the shared parts match `tools/site.mjs`, and `tools/check-site.mjs` checks every internal link and anchor, that each page is paired with its counterpart in the other language, the sitemap, `security.txt` and the MTA-STS policy. Both Workers are built without being deployed. Pull requests, like Dependabot's, stop here.
2. **Deploy.** Wrangler deploys the site and then the MTA-STS Worker.
3. **Check the live site.** `tools/check-live.mjs` confirms that every file in `public/` is the one from this commit, that the headers in `public/_headers` are sent, that missing pages, www and plain HTTP answer as they should, and that both forms' APIs turn down an empty form, which sends nothing.
4. **Tell the search engines.** `tools/indexnow.mjs` sends the pages that changed since the previous push to [IndexNow](https://www.indexnow.org/), which passes them on to Bing and the other search engines that use it, so they read them again within hours. Google doesn't use IndexNow; it reads the sitemap. The key in `public/938ad7d4b44766e8ed1319cb39ecf58c.txt` is public on purpose: it shows the request comes from whoever runs the site. When the key file is new, or the workflow is started by hand, every page in the sitemap is sent. If IndexNow doesn't answer, the step leaves a warning instead of failing the run, because the site is already live.

The workflow reads two repository secrets: `CLOUDFLARE_API_TOKEN`, a token that can only edit Workers scripts and the Workers routes of mariohdz.com, and `CLOUDFLARE_ACCOUNT_ID`.

On the first of every month, `.github/workflows/expiry.yml` runs `tools/check-expiry.mjs`, which fails, so GitHub sends an email, when `security.txt` or the deploy token expires within 30 days. GitHub pauses scheduled workflows in public repositories after 60 days without activity; after a long pause, turn it back on in the Actions tab.

Dependabot (`.github/dependabot.yml`) opens one pull request a month when the actions used here have new releases. They're pinned to a commit, so they never change on their own. Wrangler and the HTML checker are pinned by version in the workflow and updated by hand.

A ruleset on `main` blocks force pushes and deleting the branch.

## License

The code is under the [MIT license](LICENSE). The writing on the site isn't. The fonts, [Geist and Geist Mono](https://github.com/vercel/geist-font), keep their own license, the SIL Open Font License 1.1 (see `public/fonts/LICENSE.txt`).
