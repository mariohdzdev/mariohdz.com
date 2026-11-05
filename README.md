# mariohdz.com

The source of [mariohdz.com](https://mariohdz.com), my personal site.

Plain HTML, CSS and a little JavaScript in `public/`, served by a Cloudflare Worker (`src/worker.js`) that also sends the contact form to my inbox. No build step, no dependencies and no cookies. The fonts are served from the same domain, and visits are counted with Cloudflare Web Analytics, which doesn't use cookies either.

## Run it locally

```sh
npx wrangler@4.151.3 dev
```

Then open <http://localhost:8787>. Locally the contact form doesn't send real email: Wrangler logs each message and saves its text under `.wrangler/tmp/email/`.

## Contact form

The form posts to `/api/contact`. The Worker checks the fields, quietly drops anything that fills in a hidden field people never see, and sends the message to contact@mariohdz.com with the visitor's address as Reply-To. It works without JavaScript too; with JavaScript the page shows the result in place.

Sending uses Cloudflare Email Service through the `send_email` binding, set in `wrangler.jsonc` to deliver only to contact@mariohdz.com and only from form@notify.mariohdz.com. Automatic mail goes out from the `notify` subdomain so it stays apart from my own inbox: its records and its DMARC policy live on that subdomain and leave the main domain's mail setup alone. For it to work, notify.mariohdz.com has to be onboarded in Email Sending (Workers Paid plan) and contact@mariohdz.com has to be a verified destination address.

## Link preview image

`public/og.png` is the image apps like WhatsApp, LinkedIn or Slack show when someone shares a link to the site. It's drawn by `tools/og-image.html`, which sits outside `public/` so it isn't published. After changing the name, the tagline or the colours, render it again from the root of the repository:

```sh
chromium --headless=new --hide-scrollbars --allow-file-access-from-files \
  --window-size=1200,630 --force-device-scale-factor=1 --virtual-time-budget=5000 \
  --screenshot="$PWD/og-full.png" "file://$PWD/tools/og-image.html"
magick og-full.png -strip -dither None -colors 256 PNG8:public/og.png && rm og-full.png
```

The second command shrinks the file to about a third of its size without a visible change.

## Deploy

Every push to `main` deploys the site with GitHub Actions (`.github/workflows/deploy.yml`). The workflow reads two repository secrets: `CLOUDFLARE_API_TOKEN`, a token that can only edit Workers scripts and the Workers routes of mariohdz.com, and `CLOUDFLARE_ACCOUNT_ID`.

## License

The code is under the [MIT license](LICENSE). The writing on the site isn't. The fonts, [Geist and Geist Mono](https://github.com/vercel/geist-font), keep their own license, the SIL Open Font License 1.1 (see `public/fonts/LICENSE.txt`).
