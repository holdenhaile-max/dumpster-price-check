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

export function perTonText(offer) {
  if (offer.perTon == null) return NOT_LISTED;
  return `${money(offer.perTon)} per ton`;
}

export function extraDayText(offer) {
  if (offer.extraDayLabel) return offer.extraDayLabel;
  if (offer.extraDay != null) return `${money(offer.extraDay)} per extra day`;
  return NOT_LISTED;
}

export function deliveryText(offer) {
  if (!offer.deliveryLabel) return NOT_LISTED;
  return offer.deliveryLabel;
}

export function extraFeesText(offer) {
  const ton = offer.perTon == null ? `Per ton: ${NOT_LISTED}` : perTonText(offer);
  const extraDay =
    offer.extraDayLabel || offer.extraDay != null ? extraDayText(offer) : `Extra day: ${NOT_LISTED}`;
  const delivery = offer.deliveryLabel ? `Delivery: ${deliveryText(offer)}` : `Delivery: ${NOT_LISTED}`;
  return `${ton}. ${extraDay}. ${delivery}`;
}

export function kindLabel(kind) {
  if (kind === "dump-trailer") return "Dump trailer";
  if (kind === "roll-off") return "Roll-off";
  return kind;
}
