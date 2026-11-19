import assert from "node:assert/strict";
import test from "node:test";
import { compareSortValues, numberSort, sortRows, textSortValue } from "../src/lib/sort-keys.mjs";

test("missing numbers sort last in both directions, and zero stays a real value", () => {
  const rows = [
    { name: "mid", price: numberSort(100) },
    { name: "blank", price: numberSort(null) },
    { name: "low", price: numberSort(40) },
    { name: "zero", price: numberSort(0) },
  ];
  assert.deepEqual(
    sortRows(rows, "price", "asc").map((row) => row.name),
    ["zero", "low", "mid", "blank"],
  );
  assert.deepEqual(
    sortRows(rows, "price", "desc").map((row) => row.name),
    ["mid", "low", "zero", "blank"],
  );
});

test("not listed text sorts as missing", () => {
  const rows = [
    { name: "bryan", location: textSortValue("Bryan") },
    { name: "gap", location: textSortValue("Not listed") },
    { name: "station", location: textSortValue("College Station") },
  ];
  assert.deepEqual(
    sortRows(rows, "location", "asc").map((row) => row.name),
    ["bryan", "station", "gap"],
  );
  assert.equal(compareSortValues(rows[1].location, rows[0].location, "desc"), 1);
});
