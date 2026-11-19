import { CALL_FOR_QUOTE, NOT_LISTED, money } from "./format.mjs";

export function priceText(offer) {
  if (offer.price == null) {
    return offer.status === "quote" ? CALL_FOR_QUOTE : NOT_LISTED;
  }
  const base = money(offer.price);
  if (offer.taxIncluded === false) return `${base} plus tax`;
  if (offer.taxIncluded === true) return `${base}, tax included`;
  return base;
}

export function taxLine(offer) {
  if (offer.price == null) return "";
  if (offer.taxIncluded === true) return "Tax included";
  if (offer.taxIncluded === false) return "";
  return "Tax: Not listed";
}

export function sizeText(offer) {
  if (offer.sizeYards == null) return NOT_LISTED;
  return `${offer.sizeYards} yard`;
}

export function sizeDetail(company, offer) {
  const bits = [];
  if (offer.product === "swap") bits.push("Swap, not the first drop-off");
  if (offer.dimensions) bits.push(offer.dimensions);
  if (company.kind === "dump-trailer") bits.push("Dump trailer. Exact yard size not stated");
  else if (offer.sizeYards == null && !offer.dimensions) bits.push("Size not stated");
  return bits.join(". ");
}

export function daysText(offer) {
  if (offer.daysIncluded == null) return NOT_LISTED;
  const unit = offer.daysIncluded === 1 ? "day" : "days";
  if (offer.daysAreTypical) return `${offer.daysIncluded} ${unit}, typical`;
  return `${offer.daysIncluded} ${unit}`;
}

export function tonsText(offer) {
  if (offer.includedTons != null) {
    if (offer.includedTons === 0) return "0 included";
    const unit = offer.includedTons === 1 ? "ton" : "tons";
    return `${offer.includedTons} ${unit} included`;
  }
  if (offer.weightLimitTons != null) {
    const unit = offer.weightLimitTons === 1 ? "ton" : "tons";
    return `${offer.weightLimitTons} ${unit} limit`;
  }
  return NOT_LISTED;
}

export function extraFeesText(offer) {
  const ton = offer.perTon == null ? "Per ton: Not listed" : `${money(offer.perTon)} per ton`;
  let extraDay = "Extra day: Not listed";
  if (offer.extraDayLabel) extraDay = offer.extraDayLabel;
  else if (offer.extraDay != null) extraDay = `${money(offer.extraDay)} per extra day`;
  const delivery = offer.deliveryLabel ? `Delivery: ${offer.deliveryLabel}` : "Delivery: Not listed";
  return `${ton}. ${extraDay}. ${delivery}`;
}

export function kindLabel(kind) {
  if (kind === "dump-trailer") return "Dump trailer";
  if (kind === "roll-off") return "Roll-off";
  return kind;
}
