import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve("dist");
const base = process.env.PUBLIC_BASE_PATH || "/dumpster-price-check";
const normalized = base.endsWith("/") && base.length > 1 ? base.slice(0, -1) : base;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

const files = await walk(dist);
const pages = new Map();
for (const file of files) {
  pages.set(path.relative(dist, file), await readFile(file, "utf8"));
}

function must(rel) {
  const html = pages.get(rel);
  if (!html) {
    console.error(`Missing built page: ${rel}`);
    process.exit(1);
  }
  return html;
}

const about = path.join("about", "index.html");
const weekend = path.join("guides", "1-3-day-weekend-dumpster-prices", "index.html");
const week = path.join("guides", "cheapest-7-day-dumpster-brazos-valley", "index.html");
const included = path.join("guides", "whats-included-dumpster-rental", "index.html");
const versus = path.join("guides", "dumpster-vs-junk-removal", "index.html");
const materials = path.join("guides", "what-can-you-put-in-a-dumpster", "index.html");
const tons = path.join("guides", "what-extra-tons-cost", "index.html");
const projectSize = path.join("guides", "what-size-dumpster-for-a-roof-remodel-or-cleanout", "index.html");
const required = [
  "index.html",
  path.join("cities", "college-station", "index.html"),
  path.join("cities", "bryan", "index.html"),
  path.join("guides", "10-vs-15-vs-20-yard-dumpsters", "index.html"),
  week,
  weekend,
  included,
  versus,
  materials,
  tons,
  projectSize,
  about,
];

const problems = [];
for (const rel of required) {
  const html = must(rel);
  if (!html.includes(`${normalized}/`)) {
    problems.push(`${rel} is missing the base path ${normalized}/`);
  }
  if (html.includes("\u2014") || html.includes("\u2013")) {
    problems.push(`${rel} contains a dash that is not a hyphen`);
  }
  if (rel === weekend) {
    if (!html.includes("Nov 26, 2026") || !html.includes('datetime="2026-11-26"')) {
      problems.push(`${rel} is missing the Nov 26 checked date`);
    }
    continue;
  }
  if (rel === week) {
    if (!html.includes("Nov 26, 2026") || !html.includes('datetime="2026-11-26"')) {
      problems.push(`${rel} is missing the Nov 26 checked date`);
    }
    if (!html.includes("Nov 24, 2026") || !html.includes('datetime="2026-11-24"')) {
      problems.push(`${rel} is missing the Nov 24 checked date`);
    }
    continue;
  }
  if (rel === tons || rel === projectSize) {
    continue;
  }
  if (rel === versus) {
    for (const phrase of [
      "Published dumpster prices and junk removal prices",
      "Which one fits you",
      "$300 plus tax",
      "$380",
      "$420",
      "$650",
      "$325",
      "$385",
      "$60 per ton",
      "$125",
      "$20 to $30",
      "$150",
      "About $900",
      "$40 to $60",
      "ME3 Junk Solutions",
      "979 Junk Removal",
      "Call for quote",
      'datetime="2026-11-22"',
      'datetime="2026-11-26"',
    ]) {
      if (!html.includes(phrase)) problems.push(`Dumpster vs junk removal page is missing ${phrase}`);
    }
    if (!html.includes(`${normalized}/guides/dumpster-vs-junk-removal/`)) {
      problems.push("Dumpster vs junk removal page is missing its own nav link");
    }
    continue;
  }
  const dated = [
    ["Nov 19, 2026", "2026-11-19"],
    ["Nov 22, 2026", "2026-11-22"],
    ["Nov 23, 2026", "2026-11-23"],
    ["Nov 24, 2026", "2026-11-24"],
    ["Nov 25, 2026", "2026-11-25"],
    ["Nov 26, 2026", "2026-11-26"],
  ].some(([label, iso]) => html.includes(label) && html.includes(`datetime="${iso}"`));
  if (rel !== about && !dated) {
    problems.push(`${rel} is missing a checked date`);
  }
}

const home = must("index.html");
for (const phrase of ["$300 plus tax", "$420", "$425", "Call for quote", "Not listed", "Dumpster rental prices, checked.", "1-3 day weekend dumpster prices", "tons, delivery, overage, extra days"]) {
  if (!home.includes(phrase)) problems.push(`Home is missing ${phrase}`);
}
if (home.includes("5stardumps") || home.includes("Aggregate Underground")) {
  problems.push("Home lists an excluded company");
}

const aboutHtml = must(about);
if (!aboutHtml.includes("5stardumps.com")) problems.push("About does not record the unloaded 5 Star site");
if (!aboutHtml.includes("no email address")) problems.push("About invented or dropped the contact note");

const sizes = must(path.join("guides", "10-vs-15-vs-20-yard-dumpsters", "index.html"));
if (!sizes.includes("Exact yard size not stated") && !sizes.includes("does not state an exact yard size")) {
  problems.push("Size page does not say Aggieland's yard size is not exact");
}
if (!sizes.includes("12 ft long")) problems.push("Size page is missing the published 10-yard dimensions");

const weekHtml = must(week);
if (!weekHtml.includes("$42 per ton") || !weekHtml.includes("$45 per ton")) {
  problems.push("7-day page does not show both Waste Falcon ton rates");
}
if (!weekHtml.includes("$540") || !weekHtml.includes("$509")) {
  problems.push("7-day page is missing the published-rate arithmetic");
}

const shortRental = must(weekend);
for (const phrase of ["$300 plus tax", "$350 plus tax", "$400 plus tax", "$380", "$60 per ton", "does not list the days", "not exact"]) {
  if (!shortRental.includes(phrase)) problems.push(`1-3 day page is missing ${phrase}`);
}
if (!shortRental.includes(`${normalized}/guides/1-3-day-weekend-dumpster-prices/`)) {
  problems.push("1-3 day page is missing its own nav link");
}

const includedHtml = must(included);
for (const phrase of [
  "2 tons included",
  "$50 per ton",
  "Included within 20 miles of 77845",
  "$60 per ton",
  "0 included",
  "$42 per ton",
  "$8 a day after day 10",
  "4 tons limit",
  "7 days, typical",
  "Not listed",
  'datetime="2026-11-24"',
]) {
  if (!includedHtml.includes(phrase)) problems.push(`What's included page is missing ${phrase}`);
}
if (!includedHtml.includes(`${normalized}/guides/whats-included-dumpster-rental/`)) {
  problems.push("What's included page is missing its own nav link");
}

const materialsHtml = must(materials);
for (const phrase of [
  "Allowed, banned, and extra item fees",
  "That is general guidance",
  "Not published",
  "Extra fees apply if tires, Freon units, or chemicals",
  "$10 each",
  "$25 each",
  "brush or hazardous waste",
  "chemicals and asbestos",
  "Oil, asbestos, gasoline, tires",
  "appliances with Freon removed",
  "BVR Waste and Recycling",
  "asbestos, batteries, and flammable liquids",
  'datetime="2026-11-26"',
  'datetime="2026-11-25"',
  'datetime="2026-11-24"',
]) {
  if (!materialsHtml.includes(phrase)) problems.push(`What can go in page is missing ${phrase}`);
}
if (!materialsHtml.includes(`${normalized}/guides/what-can-you-put-in-a-dumpster/`)) {
  problems.push("What can go in page is missing its own nav link");
}

for (const id of ["aggieland-dumpster-rentals", "bcs-junk-removal", "waste-falcon"]) {
  const html = must(path.join("companies", id, "index.html"));
  if (!html.includes('datetime="2026-11-26"')) {
    problems.push(`${id} is missing the Nov 26 checked date`);
  }
  if (html.includes("2026-11-20")) {
    problems.push(`${id} still shows the old checked date`);
  }
}

for (const id of ["bvr-waste-and-recycling", "texas-commercial-waste", "texas-disposal-systems"]) {
  const html = must(path.join("companies", id, "index.html"));
  if (!html.includes('datetime="2026-11-25"')) {
    problems.push(`${id} is missing the Nov 25 checked date`);
  }
  if (html.includes("2026-11-22") || html.includes("2026-11-19")) {
    problems.push(`${id} still shows an old checked date`);
  }
  if (!html.includes("Call for quote")) {
    problems.push(`${id} no longer shows Call for quote`);
  }
}
const bvrPage = must(path.join("companies", "bvr-waste-and-recycling", "index.html"));
for (const phrase of ["14 yard", "6 pickup loads", "8 pickup loads", "14 pickup loads", "16 pickup loads"]) {
  if (!bvrPage.includes(phrase)) problems.push(`BVR page is missing ${phrase}`);
}
const tdsPage = must(path.join("companies", "texas-disposal-systems", "index.html"));
if (!tdsPage.includes("22L x 8W x 3.5H") || !tdsPage.includes("Unit not stated")) {
  problems.push("Texas Disposal Systems page is missing the published dimensions");
}
if (!tdsPage.includes("roof tear-offs")) {
  problems.push("Texas Disposal Systems page is missing the published roof use");
}
if (/\bft\b|feet|foot/i.test(tdsPage.match(/22L x 8W x 3\.5H[\s\S]{0,80}/)?.[0] || "")) {
  problems.push("Texas Disposal Systems dimensions were given a unit the page did not name");
}

for (const id of ["bin-there-dump-that-aggieland", "cti-response", "pronto-services"]) {
  const html = must(path.join("companies", id, "index.html"));
  if (!html.includes('datetime="2026-11-24"')) {
    problems.push(`${id} is missing the Nov 24 checked date`);
  }
  if (html.includes("2026-11-21") || html.includes("2026-11-19")) {
    problems.push(`${id} still shows an old checked date`);
  }
  if (!html.includes("Call for quote")) {
    problems.push(`${id} no longer shows Call for quote`);
  }
}
const binPage = must(path.join("companies", "bin-there-dump-that-aggieland", "index.html"));
for (const phrase of [
  "10 ft long, 5.5 ft wide, 2 ft high",
  "11 ft long, 8 ft wide, 4.5 ft high",
  "346-742-1020",
  "346-590-7202",
  "41900 N. MIll Drive",
]) {
  if (!binPage.includes(phrase)) problems.push(`Bin There Dump That page is missing ${phrase}`);
}
if (binPage.includes("979-205-7587") || binPage.includes("3608 E. 29th")) {
  problems.push("Bin There Dump That page still shows the old phone or Bryan suite address");
}

const rocking = must(path.join("companies", "rocking-h-dumpsters", "index.html"));
for (const phrase of [
  "$295",
  "$395",
  "$495",
  "$595",
  "$32 or $73",
  "$5 per day to extend rental",
  "Fuel surcharge",
  "979-398-2755",
  'datetime="2026-11-26"',
]) {
  if (!rocking.includes(phrase)) problems.push(`Rocking H page is missing ${phrase}`);
}
for (const city of ["bryan", "college-station"]) {
  const html = must(path.join("cities", city, "index.html"));
  if (!html.includes("Rocking H Dumpsters")) {
    problems.push(`${city} page is missing Rocking H Dumpsters`);
  }
  if (!html.includes("$295") || !html.includes("$595")) {
    problems.push(`${city} page is missing a Rocking H price`);
  }
}

const tonsHtml = must(tons);
for (const phrase of [
  "$300 plus tax",
  "$350 plus tax",
  "$467",
  "$509",
  "$559",
  "$540",
  "$500",
  "$45 per ton",
  "does not guess",
  "Included tons are not listed",
  "8,000 lbs",
  'datetime="2026-11-26"',
]) {
  if (!tonsHtml.includes(phrase)) problems.push(`Ton fee page is missing ${phrase}`);
}
if (!tonsHtml.includes(`${normalized}/guides/what-extra-tons-cost/`)) {
  problems.push("Ton fee page is missing its own nav link");
}

const sitemapNames = (await readdir(dist)).filter((name) => name.startsWith("sitemap") && name.endsWith(".xml"));
let sitemap = "";
for (const name of sitemapNames) sitemap += await readFile(path.join(dist, name), "utf8");
if (!sitemap.includes("dumpster-price-check")) problems.push("Sitemap is missing the project path");
if (!sitemap.includes("/guides/1-3-day-weekend-dumpster-prices/")) {
  problems.push("Sitemap is missing the 1-3 day guide");
}
if (!sitemap.includes("/guides/whats-included-dumpster-rental/")) {
  problems.push("Sitemap is missing the what's included guide");
}
if (!sitemap.includes("/guides/dumpster-vs-junk-removal/")) {
  problems.push("Sitemap is missing the dumpster vs junk removal guide");
}
if (!sitemap.includes("/guides/what-can-you-put-in-a-dumpster/")) {
  problems.push("Sitemap is missing the what can go in guide");
}
if (!sitemap.includes("/guides/what-extra-tons-cost/")) {
  problems.push("Sitemap is missing the ton fee guide");
}
if (!sitemap.includes("/guides/what-size-dumpster-for-a-roof-remodel-or-cleanout/")) {
  problems.push("Sitemap is missing the project size guide");
}

const projectHtml = must(projectSize);
for (const phrase of [
  "Size, days, included tons, and price",
  "6 pickup loads",
  "14 pickup loads",
  "roof tear-offs",
  "$425",
  "$380",
  "$42 per ton",
  "Call for quote",
  "does not guess",
  'datetime="2026-11-25"',
]) {
  if (!projectHtml.includes(phrase)) problems.push(`Project size page is missing ${phrase}`);
}
if (!projectHtml.includes(`${normalized}/guides/what-size-dumpster-for-a-roof-remodel-or-cleanout/`)) {
  problems.push("Project size page is missing its own nav link");
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log(`Built HTML check passed for ${pages.size} pages.`);
