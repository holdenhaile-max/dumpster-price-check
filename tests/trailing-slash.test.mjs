import assert from "node:assert/strict";
import test from "node:test";
import { pageHref } from "../src/lib/trailing-slash.mjs";

test("internal pages get a trailing slash and keep the base path", () => {
  assert.equal(pageHref("/about", "/dumpster-price-check"), "/dumpster-price-check/about/");
  assert.equal(
    pageHref("/cities/college-station", "/dumpster-price-check"),
    "/dumpster-price-check/cities/college-station/",
  );
  assert.equal(pageHref("/", "/dumpster-price-check"), "/dumpster-price-check/");
  assert.equal(pageHref("/about/", "/dumpster-price-check"), "/dumpster-price-check/about/");
});

test("files, phone links, and off-site links are not rewritten", () => {
  assert.equal(pageHref("/favicon.svg", "/dumpster-price-check"), "/dumpster-price-check/favicon.svg");
  assert.equal(
    pageHref("/sitemap-index.xml", "/dumpster-price-check"),
    "/dumpster-price-check/sitemap-index.xml",
  );
  assert.equal(
    pageHref("https://aggielanddumpsters.com/", "/dumpster-price-check"),
    "https://aggielanddumpsters.com/",
  );
  assert.equal(pageHref("tel:+19795742303", "/dumpster-price-check"), "tel:+19795742303");
  assert.equal(pageHref("#main", "/dumpster-price-check"), "#main");
});

test("a site served at the domain root still uses a trailing slash", () => {
  assert.equal(pageHref("/about", ""), "/about/");
  assert.equal(pageHref("/", ""), "/");
  assert.equal(pageHref("/", "/"), "/");
});
