export const DEFAULT_AGGREGATORS = [
  "SoundOn",
  "FUGA",
  "Believe",
  "Tunecore",
  "DistroKid",
  "CD Baby",
  "LokaMusik",
  "The Orchard",
  "EVEARA",
  "Loka",
  "Manual",
  "Lainnya",
] as const;

export function normalizeAggregators(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_AGGREGATORS];

  const unique = new Map<string, string>();
  for (const item of value) {
    const name = String(item || "").trim().replace(/\s+/g, " ").slice(0, 100);
    if (name) unique.set(name.toLocaleLowerCase("id-ID"), name);
  }

  return unique.size ? Array.from(unique.values()) : [...DEFAULT_AGGREGATORS];
}
