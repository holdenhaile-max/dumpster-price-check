import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const status = z.enum(["verified", "quote", "conflict"]);

const offer = z.object({
  id: z.string(),
  product: z.enum(["rental", "swap"]),
  sizeYards: z.number().nullable(),
  dimensions: z.string().nullable(),
  fit: z.string(),
  daysIncluded: z.number().nullable(),
  daysAreTypical: z.boolean(),
  includedTons: z.number().nullable(),
  weightLimitTons: z.number().nullable(),
  price: z.number().nullable(),
  taxIncluded: z.boolean().nullable(),
  perTon: z.number().nullable(),
  extraDay: z.number().nullable(),
  extraDayLabel: z.string().nullable(),
  deliveryLabel: z.string().nullable(),
  status,
  shortNote: z.string(),
  note: z.string(),
  sourceUrl: z.string().url(),
  sourceLabel: z.string(),
  checked: date,
});

const junkItem = z.object({
  label: z.string(),
  amount: z.number().nullable(),
  detail: z.string().nullable(),
});

const companies = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/data/companies" }),
  schema: z.object({
    name: z.string(),
    website: z.string().url(),
    phone: z.string().nullable(),
    cities: z.array(z.string()),
    kind: z.enum(["roll-off", "dump-trailer"]),
    summary: z.string(),
    checked: date,
    accepted: z.string().nullable(),
    prohibited: z.string().nullable(),
    address: z.string().nullable(),
    gaps: z.array(z.string()),
    junkRemoval: z
      .object({
        summary: z.string(),
        items: z.array(junkItem),
        sources: z.array(z.object({ label: z.string(), url: z.string().url() })),
      })
      .nullable(),
    offers: z.array(offer).min(1),
  }),
});

const faq = z.object({
  question: z.string(),
  answer: z.string(),
});

const cities = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/data/cities" }),
  schema: z.object({
    name: z.string(),
    state: z.string(),
    title: z.string(),
    description: z.string(),
    summary: z.string(),
    order: z.number(),
    faqs: z.array(faq).min(1),
  }),
});

const tableFilter = z.object({
  caption: z.string(),
  sizes: z.string().optional(),
  days: z.number().optional(),
  maxDays: z.number().optional(),
  pricedOnly: z.boolean().optional(),
  quotesOnly: z.boolean().optional(),
  exactDays: z.boolean().optional(),
  product: z.enum(["rental", "swap"]).optional(),
  companies: z.string().optional(),
  only: z.string().optional(),
  city: z.string().optional(),
});

const guides = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/guides" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    eyebrow: z.string(),
    updated: date,
    order: z.number(),
    featured: z.boolean().default(false),
    tables: z.array(tableFilter).default([]),
    faqs: z.array(faq).default([]),
    sources: z.array(z.object({ label: z.string(), url: z.string() })),
  }),
});

export const collections = { companies, cities, guides };
