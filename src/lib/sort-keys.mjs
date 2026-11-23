export function numberSort(value) {
  if (value == null || value === "") return { missing: true, value: null };
  const number = Number(value);
  if (Number.isNaN(number)) return { missing: true, value: null };
  return { missing: false, value: number };
}

export function textSortValue(text) {
  const value = String(text ?? "").trim();
  if (!value) return { missing: true, value: null };
  const lower = value.toLowerCase();
  if (
    lower === "not listed" ||
    lower === "not published" ||
    lower === "not yet verified" ||
    lower === "call for quote"
  ) {
    return { missing: true, value: null };
  }
  return { missing: false, value: lower };
}

export function compareSortValues(a, b, direction = "asc") {
  if (!a || !b) return 0;
  if (a.missing && b.missing) return 0;
  if (a.missing) return 1;
  if (b.missing) return -1;
  let cmp = 0;
  if (typeof a.value === "number" && typeof b.value === "number") {
    cmp = a.value - b.value;
  } else {
    cmp = String(a.value).localeCompare(String(b.value), "en", { numeric: true, sensitivity: "base" });
  }
  if (cmp === 0) return 0;
  return direction === "desc" ? -cmp : cmp;
}

export function sortRows(rows, key, direction) {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const cmp = compareSortValues(a.row[key], b.row[key], direction);
      if (cmp !== 0) return cmp;
      return a.index - b.index;
    })
    .map((item) => item.row);
}
