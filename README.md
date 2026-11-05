# mariohdz.com

The source of [mariohdz.com](https://mariohdz.com), my personal site.

Plain HTML, CSS and a little JavaScript in `public/`, served as static assets by a Cloudflare Worker. No build step, no dependencies and no cookies. The fonts are served from the same domain.

## Run it locally

```sh
npx wrangler@4.151.3 dev
```

Then open <http://localhost:8787>.

## Deploy

Every push to `main` deploys the site with GitHub Actions (`.github/workflows/deploy.yml`). The workflow reads two repository secrets: `CLOUDFLARE_API_TOKEN`, a token that can only edit Workers scripts and the Workers routes of mariohdz.com, and `CLOUDFLARE_ACCOUNT_ID`.

## License

The code is under the [MIT license](LICENSE). The writing on the site isn't. The fonts, [Geist and Geist Mono](https://github.com/vercel/geist-font), keep their own license, the SIL Open Font License 1.1 (see `public/fonts/LICENSE.txt`).
