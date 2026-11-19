import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { selectOffers } from "../src/lib/filters.mjs";
import { daysText, extraFeesText, priceText, sizeText, tonsText } from "../src/lib/present.mjs";
import { numberSort, sortRows, textSortValue } from "../src/lib/sort-keys.mjs";

const dir = path.resolve("src/data/companies");
const files = (await readdir(dir)).filter((name) => name.endsWith(".json"));
const companies = await Promise.all(
  files.map(async (name) => ({
    id: name.replace(/\.json$/, ""),
    data: JSON.parse(await readFile(path.join(dir, name), "utf8")),
  })),
);

const priced = new Set([300, 350, 400, 450, 365, 380, 420, 425, 475]);
const perTon = new Set([50, 60, 42]);

test("excluded companies are not in the price files", () => {
  const blob = JSON.stringify(companies);
  assert.equal(blob.includes("5stardumps"), false);
  assert.equal(blob.includes("Aggregate Underground"), false);
  assert.equal(blob.includes("aggregateuat"), false);
});

test("every published dollar amount is one of the checked prices", () => {
  const offers = companies.flatMap((company) => company.data.offers);
  assert.equal(offers.length, 28);
  for (const offer of offers) {
    assert.equal(offer.checked, "2026-11-19");
    if (offer.price == null) {
      assert.equal(offer.status, "quote");
    } else {
      assert.equal(priced.has(offer.price), true);
      assert.notEqual(offer.status, "quote");
    }
    if (offer.perTon != null) assert.equal(perTon.has(offer.perTon), true);
    assert.notEqual(offer.perTon, 45);
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
  assert.match(extraFeesText({ perTon: null, extraDay: null, extraDayLabel: null, deliveryLabel: null }), /Not listed/);
});
