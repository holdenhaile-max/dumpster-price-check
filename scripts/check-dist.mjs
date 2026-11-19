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

const required = [
  "index.html",
  path.join("cities", "college-station", "index.html"),
  path.join("cities", "bryan", "index.html"),
  path.join("guides", "10-vs-15-vs-20-yard-dumpsters", "index.html"),
  path.join("guides", "cheapest-7-day-dumpster-brazos-valley", "index.html"),
  path.join("about", "index.html"),
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
  if (rel !== path.join("about", "index.html") && !html.includes("Nov 19, 2026")) {
    problems.push(`${rel} is missing the checked date`);
  }
  if (rel !== path.join("about", "index.html") && !html.includes('datetime="2026-11-19"')) {
    problems.push(`${rel} is missing a machine-readable checked date`);
  }
}

const home = must("index.html");
for (const phrase of ["$300 plus tax", "$420", "$425", "Call for quote", "Not listed", "Dumpster rental prices, checked."]) {
  if (!home.includes(phrase)) problems.push(`Home is missing ${phrase}`);
}
if (home.includes("5stardumps") || home.includes("Aggregate Underground")) {
  problems.push("Home lists an excluded company");
}

const about = must(path.join("about", "index.html"));
if (!about.includes("5stardumps.com")) problems.push("About does not record the unloaded 5 Star site");
if (!about.includes("no email address")) problems.push("About invented or dropped the contact note");

const sizes = must(path.join("guides", "10-vs-15-vs-20-yard-dumpsters", "index.html"));
if (!sizes.includes("Exact yard size not stated") && !sizes.includes("does not state an exact yard size")) {
  problems.push("Size page does not say Aggieland's yard size is not exact");
}
if (!sizes.includes("12 ft long")) problems.push("Size page is missing the published 10-yard dimensions");

const week = must(path.join("guides", "cheapest-7-day-dumpster-brazos-valley", "index.html"));
if (!week.includes("$42 per ton") || !week.includes("$45 per ton")) {
  problems.push("7-day page does not show both Waste Falcon ton rates");
}
if (!week.includes("$540") || !week.includes("$509")) {
  problems.push("7-day page is missing the published-rate arithmetic");
}

const sitemap = await readFile(path.join(dist, "sitemap-index.xml"), "utf8").catch(() => "");
if (!sitemap.includes("dumpster-price-check")) problems.push("Sitemap is missing the project path");

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log(`Built HTML check passed for ${pages.size} pages.`);
