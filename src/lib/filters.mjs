function parseList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (value == null || value === "") return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function offerKey(companyId, offer) {
  return `${companyId}/${offer.id}`;
}

export function flattenCompanies(companies) {
  return companies.flatMap((company) => {
    const data = company.data ?? company;
    const id = company.id;
    return (data.offers || []).map((offer) => ({
      companyId: id,
      company: data,
      offer,
      key: offerKey(id, offer),
    }));
  });
}

export function selectOffers(companies, filter = {}) {
  const sizes = parseList(filter.sizes).map(Number);
  const only = new Set(parseList(filter.only));
  const companyIds = parseList(filter.companies);
  const days = filter.days == null || filter.days === "" ? null : Number(filter.days);
  const maxDays = filter.maxDays == null || filter.maxDays === "" ? null : Number(filter.maxDays);
  const city = filter.city || "";

  return flattenCompanies(companies).filter(({ companyId, company, offer }) => {
    if (only.size && !only.has(offerKey(companyId, offer))) return false;
    if (companyIds.length && !companyIds.includes(companyId)) return false;
    if (city && !(company.cities || []).includes(city)) return false;
    if (sizes.length && (offer.sizeYards == null || !sizes.includes(offer.sizeYards))) return false;
    if (filter.product && offer.product !== filter.product) return false;
    if (filter.pricedOnly && offer.price == null) return false;
    if (filter.quotesOnly && offer.status !== "quote") return false;
    if (days != null && offer.daysIncluded !== days) return false;
    if (filter.exactDays && offer.daysAreTypical) return false;
    if (maxDays != null) {
      if (offer.daysIncluded == null || offer.daysAreTypical) return false;
      if (offer.daysIncluded > maxDays) return false;
    }
    return true;
  });
}
