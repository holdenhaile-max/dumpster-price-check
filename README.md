# Dumpster Price Check

Dumpster rental prices, checked.

An independent, static comparison of named dumpster and roll-off companies. Version 1 covers College Station and Bryan, Texas. Prices live in data files. The pages are templates, so a later city or a later guide does not need a new layout.

There is no server, no database, no tracker, and no custom domain. The built site is a `dist/` folder.

The public URL is the GitHub Pages project site:

`https://holdenhaile-max.github.io/dumpster-price-check/`

## Run it locally

Node.js 22.23.4 or newer.

```bash
npm install
npm run dev
```

The dev server defaults to port 4321. Open `http://localhost:4321/dumpster-price-check/`.

```bash
npm run build
npm run preview
```

`npm run check:copy` fails if page copy in `src/` contains an em dash or an en dash. `npm test` checks the price files. `npm run build` runs both, then builds the site and checks the HTML.

## Where the facts live

| What you are adding | File |
| --- | --- |
| A company and its prices | `src/data/companies/<id>.json` |
| A city page | `src/data/cities/<id>.json` |
| A written comparison | `src/content/guides/<id>.mdx` |

Company files hold every price, date, and gap. Each offer has `sourceUrl`, `sourceLabel`, `checked`, and a `status` of `verified`, `quote`, or `conflict`. An unknown number is `null`. The templates render that as "Not listed". A company with no published dollar price uses `status: "quote"` and `price: null`, which renders as "Call for quote". Do not invent a price to fill a hole.

Schemas are in `src/content.config.ts`. A bad file fails the build.

The research notes for the Nov 19, 2026 check are in `src/data/sources.md`.

## Update a price

1. Open the company file in `src/data/companies/`.
2. Change the offer fields that the company page actually states. Set `checked` to the day you read the page.
3. If two official pages disagree, keep `status` as `conflict`, show the page you are using in the number fields, and say what the other page says in `shortNote`.
4. If a fact is missing, leave it `null`. Do not write 0 unless the page says zero.
5. Run `npm run build`.

## Add a page

A new city:

1. Add `src/data/cities/<id>.json` with `name`, `state`, `title`, `description`, `summary`, `order`, and `faqs`.
2. Put that city id in `cities` on each company that serves it.
3. The page is `/cities/<id>`. It is listed on the home page and the cities index. No new Astro file.

A new guide, such as weekend prices or what can go in a dumpster:

1. Add `src/content/guides/<id>.mdx`.
2. Front matter needs `title`, `description`, `eyebrow`, `updated` (`YYYY-MM-DD`), `order`, `featured`, `tables`, `faqs`, and `sources`.
3. A `tables` entry is a filter. Examples:

```yaml
tables:
  - caption: Weekend rentals
    maxDays: 3
    pricedOnly: true
    exactDays: true
    product: rental
```

`days: 7` keeps rows that include 7 days. `exactDays: true` drops rows that only call 7 days typical. `pricedOnly: true` drops Call for quote. `sizes: "10,15,20"` keeps those yard sizes. `product: rental` drops swaps.

4. In the body, you can pull another table without retyping rates:

```mdx
import PriceTable from "../../components/PriceTable.astro";

<PriceTable caption="What the booking page left blank" only="waste-falcon/10-yard" />
```

5. Run `npm run build`. The guide is `/guides/<id>`. Set `featured: true` to add a card on the home page.

## Deploy on GitHub Pages

The site is static. GitHub Actions builds it and deploys with the official Pages actions. The workflow is `.github/workflows/deploy.yml`. It runs on every push to `main`.

No new GitHub account is created by this repo. Use the existing account `holdenhaile-max`.

The build sets `PUBLIC_BASE_PATH` to `/dumpster-price-check`, so links, the favicon, canonical URLs, Open Graph URLs, `robots.txt`, and `sitemap-index.xml` include that path. There is no `CNAME` file and no custom domain.

Node 22.23.4 is selected in the workflow. The `engines` field in `package.json` asks for 22.23.4 or newer.

## What this version checked

Facts were read from company pages on November 19, 2026. A missing fact says Not listed. A company that does not publish a dollar price says Call for quote. Two company sites did not load and are named on the About page, not in the price table.
