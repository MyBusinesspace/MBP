export function normalize(s) {
  return (s || "").toString().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

export function scoreMatch(needle, haystack) {
  const n = normalize(needle);
  const h = normalize(haystack);
  if (!n || !h) return 0;
  if (h === n) return 1;
  if (h.includes(n)) return Math.min(0.9, n.length / (h.length + 1));
  const words = n.split(" ");
  const hits = words.filter((w) => h.includes(w)).length;
  return hits / Math.max(words.length, 1) * 0.7;
}

export function bestMatches(items, labelKey, query, limit = 10) {
  const q = normalize(query);
  if (!q) return items.slice(0, limit).map((it) => ({ item: it, score: 0 }));
  const scored = items.map((it) => ({ item: it, score: scoreMatch(q, it[labelKey] || "") }));
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}