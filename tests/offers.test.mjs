import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { selectOffers } from "../src/lib/filters.mjs";
import { statusLabel } from "../src/lib/format.mjs";
import {
  daysText,
  deliveryText,
  extraDayText,
  extraFeesText,
  allowedText,
  bannedText,
  materialSources,
  publishedItemFees,
  overagePriceText,
  overageTotal,
  perTonText,
  priceText,
  sizeText,
  tonsText,
} from "../src/lib/present.mjs";
import { numberSort, sortRows, textSortValue } from "../src/lib/sort-keys.mjs";

const dir = path.resolve("src/data/companies");
const files = (await readdir(dir)).filter((name) => name.endsWith(".json"));
const companies = await Promise.all(
  files.map(async (name) => ({
    id: name.replace(/\.json$/, ""),
    data: JSON.parse(await readFile(path.join(dir, name), "utf8")),
  })),
);

const priced = new Set([295, 300, 350, 365, 380, 395, 400, 420, 425, 450, 475, 495, 595]);
const perTon = new Set([50, 60, 42]);
const recheckedOnNov26 = new Set([
  "aggieland-dumpster-rentals",
  "bcs-junk-removal",
  "waste-falcon",
  "rocking-h-dumpsters",
]);
const recheckedOnNov24 = new Set([
  "bin-there-dump-that-aggieland",
  "cti-response",
  "pronto-services",
]);
const recheckedOnNov25 = new Set([
  "bvr-waste-and-recycling",
  "texas-commercial-waste",
  "texas-disposal-systems",
]);

test("excluded companies are not in the price files", () => {
  const blob = JSON.stringify(companies);
  assert.equal(blob.includes("5stardumps"), false);
  assert.equal(blob.includes("Aggregate Underground"), false);
  assert.equal(blob.includes("aggregateuat"), false);
});

test("every published dollar amount is one of the checked prices", () => {
  const offers = companies.flatMap((company) => company.data.offers);
  assert.equal(offers.length, 35);
  for (const company of companies) {
    let expectedChecked = "2026-11-19";
    if (recheckedOnNov24.has(company.id)) expectedChecked = "2026-11-24";
    if (recheckedOnNov25.has(company.id)) expectedChecked = "2026-11-25";
    if (recheckedOnNov26.has(company.id)) expectedChecked = "2026-11-26";
    assert.equal(company.data.checked, expectedChecked);
    for (const offer of company.data.offers) {
      assert.equal(offer.checked, expectedChecked);
      if (offer.price == null) {
        assert.equal(offer.status, "quote");
      } else {
        assert.equal(priced.has(offer.price), true);
        assert.notEqual(offer.status, "quote");
      }
      if (offer.perTon != null) assert.equal(perTon.has(offer.perTon), true);
      assert.notEqual(offer.perTon, 45);
    }
  }
});

test("the 7-day ranking uses only rentals whose page states 7 days and a price", () => {
  const rows = selectOffers(companies, {
    days: 7,
    pricedOnly: true,
    exactDays: true,
    product: "rental",
  });
  assert.deepEqual(
    rows
      .map((row) => [row.company.name, row.offer.price])
      .sort((a, b) => a[1] - b[1]),
    [
      ["BCS Junk Removal", 420],
      ["Waste Falcon", 425],
      ["Aggieland Dumpster Rentals", 450],
    ],
  );
});

test("Aggieland has no exact yard size, and BCS tons stay unpublished", () => {
  const aggieland = companies.find((company) => company.id === "aggieland-dumpster-rentals");
  for (const offer of aggieland.data.offers) {
    assert.equal(offer.sizeYards, null);
    assert.equal(sizeText(offer), "Not listed");
    assert.equal(offer.includedTons, 2);
  }
  const bcs = companies.find((company) => company.id === "bcs-junk-removal");
  for (const offer of bcs.data.offers) {
    assert.equal(offer.includedTons, null);
    assert.equal(tonsText(offer), "Not listed");
    assert.equal(offer.perTon, 60);
  }
});

test("Waste Falcon booking figures are stored, and the marketing rate is not", () => {
  const falcon = companies.find((company) => company.id === "waste-falcon");
  const twenty = falcon.data.offers.find((offer) => offer.id === "20-yard");
  const thirty = falcon.data.offers.find((offer) => offer.id === "30-yard");
  assert.equal(twenty.perTon, 42);
  assert.equal(twenty.extraDay, 8);
  assert.equal(twenty.status, "conflict");
  assert.match(twenty.shortNote, /\$42 per ton/);
  assert.match(twenty.shortNote, /\$45 per ton/);
  assert.match(twenty.shortNote, /after day 10/);
  assert.match(twenty.shortNote, /after day 7/);
  assert.equal(thirty.daysIncluded, 10);
  assert.equal(thirty.price, 475);
  const ten = falcon.data.offers.find((offer) => offer.id === "10-yard");
  assert.equal(ten.daysIncluded, null);
  assert.equal(daysText(ten), "Not listed");
  assert.equal(ten.perTon, null);
});

test("1-3 day rentals are the priced rows that state 3 days or less", () => {
  const rows = selectOffers(companies, {
    maxDays: 3,
    pricedOnly: true,
    exactDays: true,
    product: "rental",
  });
  assert.deepEqual(
    rows
      .map((row) => [row.company.name, row.offer.daysIncluded, row.offer.price])
      .sort((a, b) => a[2] - b[2] || a[1] - b[1]),
    [
      ["Aggieland Dumpster Rentals", 1, 300],
      ["Aggieland Dumpster Rentals", 2, 350],
      ["BCS Junk Removal", 3, 380],
      ["Aggieland Dumpster Rentals", 3, 400],
    ],
  );
});

test("the 1-3 day guide is linked and uses only those published short prices", async () => {
  const guide = await readFile(
    path.resolve("src/content/guides/1-3-day-weekend-dumpster-prices.mdx"),
    "utf8",
  );
  const header = await readFile(path.resolve("src/components/Header.astro"), "utf8");
  const footer = await readFile(path.resolve("src/components/Footer.astro"), "utf8");
  assert.match(guide, /title: 1-3 day weekend dumpster prices/);
  assert.match(guide, /maxDays: 3/);
  assert.match(guide, /pricedOnly: true/);
  assert.match(guide, /exactDays: true/);
  assert.match(guide, /updated: "2026-11-26"/);
  assert.match(guide, /\$300 plus tax/);
  assert.match(guide, /\$350 plus tax/);
  assert.match(guide, /\$400 plus tax/);
  assert.match(guide, /\$380/);
  assert.match(guide, /\$60 per ton/);
  assert.match(guide, /does not list the days/);
  assert.equal(guide.includes("\u2014") || guide.includes("\u2013"), false);
  assert.match(header, /\/guides\/1-3-day-weekend-dumpster-prices/);
  assert.match(footer, /\/guides\/1-3-day-weekend-dumpster-prices/);
});

test("the Nov 24 recheck kept call-for-quote prices and moved the date", () => {
  for (const id of recheckedOnNov24) {
    const company = companies.find((item) => item.id === id);
    assert.equal(company.data.checked, "2026-11-24");
    for (const offer of company.data.offers) {
      assert.equal(offer.price, null);
      assert.equal(offer.status, "quote");
      assert.equal(offer.checked, "2026-11-24");
      assert.equal(offer.perTon, null);
      assert.equal(offer.extraDay, null);
    }
  }
  const pronto = companies.find((company) => company.id === "pronto-services");
  assert.deepEqual(
    pronto.data.offers.map((offer) => [offer.id, offer.weightLimitTons, tonsText(offer)]),
    [
      ["20-yard", 4, "4 tons limit"],
      ["30-yard", 5, "5 tons limit"],
      ["40-yard", 6, "6 tons limit"],
    ],
  );
  const bin = companies.find((company) => company.id === "bin-there-dump-that-aggieland");
  assert.equal(daysText(bin.data.offers[0]), "7 days, typical");
  assert.equal(bin.data.phone, "346-742-1020");
  assert.equal(bin.data.address, "41900 N. MIll Drive, Magnolia, Texas 77354");
  assert.equal(JSON.stringify(bin.data).includes("979-205-7587"), false);
  assert.equal(JSON.stringify(bin.data).includes("3608 E. 29th"), false);
  assert.deepEqual(
    bin.data.offers.map((offer) => [offer.id, offer.dimensions, offer.price]),
    [
      ["4-yard", "10 ft long, 5.5 ft wide, 2 ft high", null],
      ["6-yard", "10 ft long, 5.5 ft wide, 3 ft high", null],
      ["10-yard", "10 ft long, 7 ft wide, 4 ft high", null],
      ["15-yard", "11 ft long, 8 ft wide, 4.5 ft high", null],
      ["20-yard", "11 ft long, 8 ft wide, 6 ft high", null],
    ],
  );
  assert.equal(statusLabel("unverified"), "Unverified");
});

test("ton totals use the published allowance and do not treat a blank allowance as zero", () => {
  const aggieland = companies.find((company) => company.id === "aggieland-dumpster-rentals");
  const oneDay = aggieland.data.offers[0];
  assert.equal(overagePriceText(oneDay, 1, "stated"), "$300 plus tax");
  assert.equal(overagePriceText(oneDay, 2, "stated"), "$300 plus tax");
  assert.equal(overagePriceText(oneDay, 3, "stated"), "$350 plus tax");
  assert.equal(overagePriceText(oneDay, 4, "stated"), "$400 plus tax");
  assert.equal(overageTotal(oneDay, 2, "every-ton"), null);
  const falcon = companies.find((company) => company.id === "waste-falcon");
  const twenty = falcon.data.offers.find((offer) => offer.id === "20-yard");
  const thirty = falcon.data.offers.find((offer) => offer.id === "30-yard");
  const ten = falcon.data.offers.find((offer) => offer.id === "10-yard");
  assert.deepEqual(
    [1, 2, 3, 4].map((tons) => overageTotal(twenty, tons, "stated").total),
    [467, 509, 551, 593],
  );
  assert.equal(overageTotal(thirty, 2, "stated").total, 559);
  assert.equal(overageTotal(thirty, 4, "stated").total, 643);
  assert.equal(overageTotal(ten, 2, "stated"), null);
  const bcs = companies.find((company) => company.id === "bcs-junk-removal");
  const threeDay = bcs.data.offers[0];
  const sevenDay = bcs.data.offers[1];
  assert.equal(overageTotal(threeDay, 2, "stated"), null);
  assert.equal(overageTotal(threeDay, 2, "every-ton").total, 500);
  assert.equal(overageTotal(sevenDay, 1, "every-ton").total, 480);
  assert.equal(overageTotal(sevenDay, 2, "every-ton").total, 540);
  assert.equal(overageTotal(sevenDay, 4, "every-ton").total, 660);
});

test("the ton fee guide is linked and uses published rates only", async () => {
  const guide = await readFile(path.resolve("src/content/guides/what-extra-tons-cost.mdx"), "utf8");
  const header = await readFile(path.resolve("src/components/Header.astro"), "utf8");
  const footer = await readFile(path.resolve("src/components/Footer.astro"), "utf8");
  const cities = await readFile(path.resolve("src/pages/cities/[slug].astro"), "utf8");
  assert.match(guide, /title: What 1, 2, 3, and 4 tons add to the price/);
  assert.match(guide, /OverageTable mode="stated"/);
  assert.match(guide, /OverageTable mode="every-ton"/);
  assert.match(guide, /\$509/);
  assert.match(guide, /\$540/);
  assert.match(guide, /\$45 per ton/);
  assert.match(guide, /does not guess/);
  assert.match(guide, /updated: "2026-11-26"/);
  assert.equal(guide.includes("\u2014") || guide.includes("\u2013"), false);
  assert.match(header, /\/guides\/what-extra-tons-cost/);
  assert.match(footer, /\/guides\/what-extra-tons-cost/);
  assert.match(cities, /\/guides\/what-extra-tons-cost/);
});

test("inclusion cells use the published fee and say Not listed when the page does not", () => {
  const aggieland = companies.find((company) => company.id === "aggieland-dumpster-rentals");
  const trailer = aggieland.data.offers[0];
  assert.equal(perTonText(trailer), "$50 per ton");
  assert.equal(deliveryText(trailer), "Included within 20 miles of 77845. $50 if farther.");
  assert.equal(extraDayText(trailer), "Not listed");
  const bcs = companies.find((company) => company.id === "bcs-junk-removal");
  assert.equal(perTonText(bcs.data.offers[0]), "$60 per ton");
  assert.equal(deliveryText(bcs.data.offers[0]), "Not listed");
  const falcon = companies.find((company) => company.id === "waste-falcon");
  const twenty = falcon.data.offers.find((offer) => offer.id === "20-yard");
  assert.equal(tonsText(twenty), "0 included");
  assert.equal(perTonText(twenty), "$42 per ton");
  assert.equal(extraDayText(twenty), "$8 a day after day 10");
  assert.equal(deliveryText(twenty), "Not listed");
  const ten = falcon.data.offers.find((offer) => offer.id === "10-yard");
  assert.equal(perTonText(ten), "Not listed");
  assert.equal(extraDayText(ten), "Not listed");
});

test("the what's included guide is linked and uses published inclusion facts", async () => {
  const guide = await readFile(
    path.resolve("src/content/guides/whats-included-dumpster-rental.mdx"),
    "utf8",
  );
  const header = await readFile(path.resolve("src/components/Header.astro"), "utf8");
  const footer = await readFile(path.resolve("src/components/Footer.astro"), "utf8");
  const cities = await readFile(path.resolve("src/pages/cities/[slug].astro"), "utf8");
  assert.match(guide, /title: "What's included: tons, delivery, overage, extra days"/);
  assert.match(guide, /IncludedTable/);
  assert.match(guide, /\$50 per ton/);
  assert.match(guide, /\$60 per ton/);
  assert.match(guide, /\$42 per ton/);
  assert.match(guide, /\$8 a day after day 10/);
  assert.match(guide, /Not listed/);
  assert.match(guide, /8,000 lbs/);
  assert.equal(guide.includes("\u2014") || guide.includes("\u2013"), false);
  assert.match(header, /\/guides\/whats-included-dumpster-rental/);
  assert.match(footer, /\/guides\/whats-included-dumpster-rental/);
  assert.match(cities, /\/guides\/whats-included-dumpster-rental/);
});

test("the Nov 25 recheck kept call-for-quote prices and moved only the date", () => {
  for (const id of recheckedOnNov25) {
    const company = companies.find((item) => item.id === id);
    assert.equal(company.data.checked, "2026-11-25");
    for (const offer of company.data.offers) {
      assert.equal(offer.price, null);
      assert.equal(offer.status, "quote");
      assert.equal(offer.checked, "2026-11-25");
      assert.equal(offer.perTon, null);
      assert.equal(offer.extraDay, null);
    }
  }
  const bvr = companies.find((company) => company.id === "bvr-waste-and-recycling");
  assert.deepEqual(
    bvr.data.offers.map((offer) => [offer.id, offer.sizeYards, offer.price]),
    [
      ["14-yard", 14, null],
      ["20-yard", 20, null],
      ["30-yard", 30, null],
      ["40-yard", 40, null],
    ],
  );
  assert.match(bvr.data.offers[0].shortNote, /6 pickup loads/);
  assert.match(bvr.data.offers[1].shortNote, /8 pickup loads/);
  assert.match(bvr.data.offers[2].shortNote, /14 pickup loads/);
  assert.match(bvr.data.offers[3].shortNote, /16 pickup loads/);
  assert.match(bvr.data.prohibited, /asbestos, batteries, and flammable liquids/);
  const tds = companies.find((company) => company.id === "texas-disposal-systems");
  assert.deepEqual(
    tds.data.offers.map((offer) => [offer.id, offer.dimensions, offer.price]),
    [
      ["20-yard", "22L x 8W x 3.5H. Unit not stated.", null],
      ["30-yard", "22L x 8W x 6H. Unit not stated.", null],
      ["40-yard", "22L x 8W x 8H. Unit not stated.", null],
    ],
  );
  for (const offer of tds.data.offers) {
    assert.equal(/ft|feet|foot/i.test(offer.dimensions), false);
    assert.equal(offer.weightLimitTons, null);
    assert.equal(offer.includedTons, null);
  }
  const bcs = companies.find((company) => company.id === "bcs-junk-removal");
  assert.equal(bcs.data.checked, "2026-11-26");
  assert.equal(bcs.data.junkRemoval.checked, "2026-11-23");
  assert.deepEqual(
    bcs.data.junkRemoval.items.map((item) => item.amount),
    [125, null, 10, 650, 325, 385, null],
  );
});

test("the dumpster vs junk removal guide uses published prices and is linked", async () => {
  const guide = await readFile(
    path.resolve("src/content/guides/dumpster-vs-junk-removal.mdx"),
    "utf8",
  );
  const header = await readFile(path.resolve("src/components/Header.astro"), "utf8");
  const footer = await readFile(path.resolve("src/components/Footer.astro"), "utf8");
  const cities = await readFile(path.resolve("src/pages/cities/[slug].astro"), "utf8");
  const companyPage = await readFile(path.resolve("src/pages/companies/[slug].astro"), "utf8");
  const haulers = JSON.parse(
    await readFile(path.resolve("src/data/junk-haulers.json"), "utf8"),
  );
  assert.match(guide, /title: Dumpster vs junk removal/);
  assert.match(guide, /ServiceCompareTable/);
  assert.match(guide, /\$380/);
  assert.match(guide, /\$650/);
  assert.match(guide, /\$325/);
  assert.match(guide, /\$385/);
  assert.match(guide, /\$20 to \$30/);
  assert.match(guide, /About \$900|about \$900/);
  assert.match(guide, /\$40 to \$60/);
  assert.equal(guide.includes("\u2014") || guide.includes("\u2013"), false);
  assert.match(header, /\/guides\/dumpster-vs-junk-removal/);
  assert.match(footer, /\/guides\/dumpster-vs-junk-removal/);
  assert.match(cities, /\/guides\/dumpster-vs-junk-removal/);
  assert.match(companyPage, /\/guides\/dumpster-vs-junk-removal/);
  const names = haulers.map((hauler) => hauler.name).sort();
  assert.deepEqual(names, ["979 Junk Removal", "ME3 Junk Solutions"]);
  for (const hauler of haulers) {
    assert.equal(hauler.checked, "2026-11-22");
    for (const item of hauler.items) {
      assert.match(item.sourceUrl, /^https:\/\//);
      assert.equal(item.amount == null, false);
      if (item.priceText) assert.match(item.priceText, /\$/);
    }
  }
  const target = haulers
    .find((hauler) => hauler.name === "ME3 Junk Solutions")
    .items.find((item) => item.amount === 900);
  assert.equal(target.priceText, "About $900");
});

test("missing prices sort last and call for quote does not look like a dollar amount", () => {
  const rows = [
    { name: "quote", price: numberSort(null), label: priceText({ price: null, status: "quote", taxIncluded: null }) },
    { name: "low", price: numberSort(300), label: priceText({ price: 300, status: "verified", taxIncluded: false }) },
    { name: "high", price: numberSort(475), label: priceText({ price: 475, status: "conflict", taxIncluded: null }) },
  ];
  assert.deepEqual(
    sortRows(rows, "price", "asc").map((row) => row.name),
    ["low", "high", "quote"],
  );
  assert.equal(rows[0].label, "Call for quote");
  assert.equal(rows[1].label, "$300 plus tax");
  assert.equal(textSortValue("Not listed").missing, true);
  assert.equal(textSortValue("Not published").missing, true);
  assert.match(extraFeesText({ perTon: null, extraDay: null, extraDayLabel: null, deliveryLabel: null }), /Not listed/);
});

test("the Nov 26 recheck kept the same dollar amounts", () => {
  for (const id of ["aggieland-dumpster-rentals", "bcs-junk-removal", "waste-falcon"]) {
    const company = companies.find((item) => item.id === id);
    assert.equal(company.data.checked, "2026-11-26");
    for (const offer of company.data.offers) assert.equal(offer.checked, "2026-11-26");
  }
  const aggieland = companies.find((company) => company.id === "aggieland-dumpster-rentals");
  assert.deepEqual(
    aggieland.data.offers.map((offer) => offer.price),
    [300, 350, 400, 450],
  );
  const bcs = companies.find((company) => company.id === "bcs-junk-removal");
  assert.deepEqual(
    bcs.data.offers.map((offer) => [offer.price, offer.perTon]),
    [
      [380, 60],
      [420, 60],
    ],
  );
  assert.deepEqual(
    bcs.data.junkRemoval.items.map((item) => item.amount),
    [125, null, 10, 650, 325, 385, null],
  );
  const falcon = companies.find((company) => company.id === "waste-falcon");
  const twenty = falcon.data.offers.find((offer) => offer.id === "20-yard");
  const thirty = falcon.data.offers.find((offer) => offer.id === "30-yard");
  assert.equal(twenty.status, "conflict");
  assert.equal(twenty.price, 425);
  assert.equal(twenty.perTon, 42);
  assert.equal(thirty.status, "conflict");
  assert.equal(thirty.price, 475);
  assert.equal(thirty.perTon, 42);
});

test("item rules use the company file and say Not published when a page is silent", () => {
  const bvr = companies.find((company) => company.id === "bvr-waste-and-recycling");
  assert.match(allowedText(bvr.data), /concrete, asphalt, wood, and scrap metal/);
  assert.match(bannedText(bvr.data), /asbestos, batteries, and flammable liquids/);
  assert.equal(publishedItemFees(bvr.data), "Not published");
  const cti = companies.find((company) => company.id === "cti-response");
  assert.equal(allowedText(cti.data), "Not published");
  assert.match(bannedText(cti.data), /Hazardous materials/);
  assert.equal(publishedItemFees(cti.data), "Not published");
  const aggieland = companies.find((company) => company.id === "aggieland-dumpster-rentals");
  assert.match(publishedItemFees(aggieland.data), /tires, Freon units, or chemicals/);
  assert.match(publishedItemFees(aggieland.data), /not published/i);
  assert.equal(materialSources(aggieland.id, aggieland.data)[0].url, "https://aggielanddumpsters.com/faqs/");
  const bcs = companies.find((company) => company.id === "bcs-junk-removal");
  assert.match(publishedItemFees(bcs.data), /\$10 each/);
  assert.match(materialSources(bcs.id, bcs.data)[0].url, /terms-conditions/);
  const falcon = companies.find((company) => company.id === "waste-falcon");
  assert.match(publishedItemFees(falcon.data), /\$10 each/);
  assert.match(publishedItemFees(falcon.data), /\$25 each/);
  assert.match(falcon.data.prohibited, /not allowed/);
  assert.equal(materialSources(falcon.id, falcon.data).length, 2);
  for (const company of companies) {
    for (const source of materialSources(company.id, company.data)) {
      assert.match(source.url, /^https:\/\//);
      assert.equal(source.label.length > 0, true);
    }
  }
});

test("the what can go in guide is linked and does not invent a price", async () => {
  const guide = await readFile(
    path.resolve("src/content/guides/what-can-you-put-in-a-dumpster.mdx"),
    "utf8",
  );
  const header = await readFile(path.resolve("src/components/Header.astro"), "utf8");
  const footer = await readFile(path.resolve("src/components/Footer.astro"), "utf8");
  const cities = await readFile(path.resolve("src/pages/cities/[slug].astro"), "utf8");
  const companyPage = await readFile(path.resolve("src/pages/companies/[slug].astro"), "utf8");
  assert.match(guide, /title: What you can and can't put in a dumpster/);
  assert.match(guide, /AllowedItemsTable/);
  assert.match(guide, /Not published/);
  assert.match(guide, /That is general guidance/);
  assert.match(guide, /\$10 each/);
  assert.match(guide, /\$25 each/);
  assert.match(guide, /updated: "2026-11-26"/);
  assert.match(guide, /asbestos, batteries, and flammable liquids/);
  assert.equal(guide.includes("\u2014") || guide.includes("\u2013"), false);
  assert.match(header, /\/guides\/what-can-you-put-in-a-dumpster/);
  assert.match(footer, /\/guides\/what-can-you-put-in-a-dumpster/);
  assert.match(cities, /\/guides\/what-can-you-put-in-a-dumpster/);
  assert.match(companyPage, /\/guides\/what-can-you-put-in-a-dumpster/);
});

test("the project size guide is linked and does not invent a project price", async () => {
  const guide = await readFile(
    path.resolve("src/content/guides/what-size-dumpster-for-a-roof-remodel-or-cleanout.mdx"),
    "utf8",
  );
  const header = await readFile(path.resolve("src/components/Header.astro"), "utf8");
  const footer = await readFile(path.resolve("src/components/Footer.astro"), "utf8");
  const cities = await readFile(path.resolve("src/pages/cities/[slug].astro"), "utf8");
  assert.match(guide, /title: What size dumpster for a roof, a remodel, or a cleanout/);
  assert.match(guide, /product: rental/);
  assert.match(guide, /6 pickup loads/);
  assert.match(guide, /14 pickup loads/);
  assert.match(guide, /roof tear-offs/);
  assert.match(guide, /\$380/);
  assert.match(guide, /\$425/);
  assert.match(guide, /\$42 per ton/);
  assert.match(guide, /does not guess/);
  assert.match(guide, /updated: "2026-11-26"/);
  const allowed = new Set([8, 42, 45, 60, 295, 300, 350, 365, 380, 395, 400, 420, 425, 450, 475, 495, 595]);
  for (const match of guide.matchAll(/\$(\d+)/g)) {
    assert.equal(allowed.has(Number(match[1])), true, `unexpected dollar amount ${match[1]}`);
  }
  assert.equal(guide.includes("\u2014") || guide.includes("\u2013"), false);
  assert.match(header, /\/guides\/what-size-dumpster-for-a-roof-remodel-or-cleanout/);
  assert.match(footer, /\/guides\/what-size-dumpster-for-a-roof-remodel-or-cleanout/);
  assert.match(cities, /\/guides\/what-size-dumpster-for-a-roof-remodel-or-cleanout/);
});

test("Rocking H prices come from its item pages and do not pick a landfill rate", () => {
  const company = companies.find((item) => item.id === "rocking-h-dumpsters");
  assert.equal(company.data.name, "Rocking H Dumpsters");
  assert.equal(company.data.phone, "979-398-2755");
  assert.deepEqual(company.data.cities, ["college-station", "bryan"]);
  assert.equal(company.data.checked, "2026-11-26");
  assert.equal(company.data.address, "12098 FM 1940, Franklin, TX 77856");
  assert.deepEqual(
    company.data.offers.map((offer) => [
      offer.id,
      offer.sizeYards,
      offer.price,
      offer.daysIncluded,
      offer.sourceUrl,
    ]),
    [
      ["10-yard", 10, 295, 10, "https://www.rockinghdumpsters.com/items/10_yard_dumpster_(10_day)/"],
      ["20-yard", 20, 395, 10, "https://www.rockinghdumpsters.com/items/20_yard_dumpster_(10_day)/"],
      ["30-yard", 30, 495, 10, "https://www.rockinghdumpsters.com/items/30_yard_dumpster_(10_day)/"],
      ["40-yard", 40, 595, 10, "https://www.rockinghdumpsters.com/items/40_yard_dumpster/"],
    ],
  );
  for (const offer of company.data.offers) {
    assert.equal(offer.status, "verified");
    assert.equal(offer.includedTons, null);
    assert.equal(offer.perTon, null);
    assert.equal(offer.extraDay, 5);
    assert.equal(offer.taxIncluded, null);
    assert.equal(tonsText(offer), "Not listed");
    assert.equal(perTonText(offer), "Not listed");
    assert.equal(extraDayText(offer), "$5 per day to extend rental");
    assert.match(deliveryText(offer), /Fuel surcharge/);
    assert.equal(overageTotal(offer, 2, "every-ton"), null);
    assert.equal(overageTotal(offer, 2, "stated"), null);
    assert.match(offer.shortNote, /\$32 or \$73 per ton/);
  }
  assert.match(publishedItemFees(company.data), /\$10 to \$25 each/);
  assert.match(publishedItemFees(company.data), /\$20 each/);
  const week = selectOffers(companies, {
    days: 7,
    pricedOnly: true,
    exactDays: true,
    product: "rental",
  });
  assert.equal(
    week.some((row) => row.companyId === "rocking-h-dumpsters"),
    false,
  );
});
