/**
 * TF-IDF, di-port dari Python (scikit-learn's TfidfVectorizer) ke
 * TypeScript murni — nggak butuh library tambahan sama sekali, cuma
 * matematika biasa. Logic-nya sengaja dibikin SAMA PERSIS kayak versi
 * Python: smoothed IDF (ln((1+n)/(1+df)) + 1) dan L2 normalization,
 * biar hasilnya konsisten/sebanding kalau dibandingin ke versi Python.
 */

export interface TfidfModel {
  vocabulary: string[];
  idf: number[];
  documentVectors: number[][];
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function normalizeVector(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

export function buildTfidfModel(documents: string[]): TfidfModel {
  const tokenizedDocs = documents.map(tokenize);

  const vocabularySet = new Set<string>();
  tokenizedDocs.forEach((tokens) => tokens.forEach((t) => vocabularySet.add(t)));
  const vocabulary = Array.from(vocabularySet);

  // Document frequency: berapa banyak dokumen yang mengandung tiap kata.
  const df = vocabulary.map(
    (term) => tokenizedDocs.filter((tokens) => tokens.includes(term)).length
  );

  const n = documents.length;
  // Smoothed IDF — persis rumus default scikit-learn.
  const idf = df.map((count) => Math.log((n + 1) / (count + 1)) + 1);

  const documentVectors = tokenizedDocs.map((tokens) => {
    const tf: Record<string, number> = {};
    tokens.forEach((t) => {
      tf[t] = (tf[t] ?? 0) + 1;
    });
    const vector = vocabulary.map((term, i) => (tf[term] ?? 0) * idf[i]);
    return normalizeVector(vector);
  });

  return { vocabulary, idf, documentVectors };
}

export function transformQuery(model: TfidfModel, query: string): number[] {
  const tokens = tokenize(query);
  const tf: Record<string, number> = {};
  tokens.forEach((t) => {
    tf[t] = (tf[t] ?? 0) + 1;
  });
  const vector = model.vocabulary.map((term, i) => (tf[term] ?? 0) * model.idf[i]);
  return normalizeVector(vector);
}

// Vektornya udah dinormalisasi (L2) pas dibangun, jadi dot product =
// cosine similarity langsung, sama kayak trik yang dipakai di embedding.
export function cosineSim(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
