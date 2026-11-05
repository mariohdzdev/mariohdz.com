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

Then open <http://localhost:8787>. Locally the contact form doesn't send real email: Wrangler logs each message and saves its text under `.wrangler/tmp/email/`.

## Contact form

The form posts to `/api/contact`. The Worker checks the fields, quietly drops anything that fills in a hidden field people never see, and sends the message to contact@mariohdz.com with the visitor's address as Reply-To. The topic the visitor picks, if any, goes in the subject, and a hidden `lang` field tells the Worker which language to answer in. It works without JavaScript too; with JavaScript the page shows the result in place.

Sending uses Cloudflare Email Service through the `send_email` binding, set in `wrangler.jsonc` to deliver only to contact@mariohdz.com and only from form@notify.mariohdz.com. Automatic mail goes out from the `notify` subdomain so it stays apart from my own inbox: its records and its DMARC policy live on that subdomain and leave the main domain's mail setup alone. For it to work, notify.mariohdz.com has to be onboarded in Email Sending (Workers Paid plan) and contact@mariohdz.com has to be a verified destination address.

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

Every push to `main` deploys the site with GitHub Actions (`.github/workflows/deploy.yml`). The workflow reads two repository secrets: `CLOUDFLARE_API_TOKEN`, a token that can only edit Workers scripts and the Workers routes of mariohdz.com, and `CLOUDFLARE_ACCOUNT_ID`.

## License

The code is under the [MIT license](LICENSE). The writing on the site isn't. The fonts, [Geist and Geist Mono](https://github.com/vercel/geist-font), keep their own license, the SIL Open Font License 1.1 (see `public/fonts/LICENSE.txt`).
