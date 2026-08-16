import { pipeline } from '@huggingface/transformers';
import qaData from './simple-qa-data.json';
import { buildTfidfModel, transformQuery, cosineSim, type TfidfModel } from './tfidf';

/**
 * Simple Q&A model, versi ENSEMBLE — gabungan 2 teknik sekaligus:
 *
 * 1. TF-IDF (di-port dari logic Python kita — lihat tfidf.ts) — bagus
 *    buat nangkep kecocokan KATA yang persis/mirip.
 * 2. Transformers.js embedding — bagus buat nangkep kecocokan MAKNA,
 *    walau kata-katanya beda total.
 *
 * Skor akhir = rata-rata berbobot dari keduanya. Kalau salah satu teknik
 * "yakin banget" (skor tinggi), itu ikut ngangkat skor gabungannya —
 * jadi lebih robust daripada ngandelin 1 teknik doang.
 */

const MODEL_NAME = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const CONFIDENCE_THRESHOLD = 0.4;

// Bobot: embedding dikasih porsi lebih besar (0.6) soalnya lebih andal
// buat kasus umum, tapi TF-IDF (0.4) tetap ikut nyumbang — berguna pas
// ada kecocokan kata yang jelas banget yang mungkin kelewat sama
// embedding.
const EMBEDDING_WEIGHT = 0.6;
const TFIDF_WEIGHT = 0.4;

interface QAPair {
  question: string;
  answer: string;
}

export interface MatchResult {
  answer: string;
  confidence: number;
  matchedQuestion: string;
  // Skor mentah per teknik — berguna buat debugging/transparansi, lihat
  // teknik mana yang "menang" buat jawaban tertentu.
  embeddingScore: number;
  tfidfScore: number;
}

const pairs = qaData as QAPair[];
const questions = pairs.map((p) => p.question);

// ── Cache di level module — semuanya cuma dihitung SEKALI per proses
//    server yang jalan, bukan tiap request.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractorPromise: Promise<any> | null = null;
let questionEmbeddingsPromise: Promise<number[][]> | null = null;
let tfidfModel: TfidfModel | null = null;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL_NAME);
  }
  return extractorPromise;
}

async function getQuestionEmbeddings(): Promise<number[][]> {
  if (!questionEmbeddingsPromise) {
    questionEmbeddingsPromise = (async () => {
      const extractor = await getExtractor();
      const output = await extractor(questions, { pooling: 'mean', normalize: true });
      return output.tolist() as number[][];
    })();
  }
  return questionEmbeddingsPromise;
}

function getTfidfModel(): TfidfModel {
  if (!tfidfModel) {
    // Instan — nggak ada async/download sama sekali, murni matematika.
    tfidfModel = buildTfidfModel(questions);
  }
  return tfidfModel;
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export async function matchQuestion(question: string): Promise<MatchResult> {
  // Embedding (Transformers.js) — async, butuh model neural network.
  const extractor = await getExtractor();
  const questionEmbeddings = await getQuestionEmbeddings();
  const output = await extractor([question], { pooling: 'mean', normalize: true });
  const userEmbedding = (output.tolist() as number[][])[0];

  // TF-IDF (port dari Python) — sync, instan, nggak butuh model apapun.
  const tfidf = getTfidfModel();
  const userTfidfVector = transformQuery(tfidf, question);

  let bestIdx = 0;
  let bestCombinedScore = -Infinity;
  let bestEmbeddingScore = 0;
  let bestTfidfScore = 0;

  for (let i = 0; i < questions.length; i++) {
    const embeddingScore = dotProduct(userEmbedding, questionEmbeddings[i]);
    const tfidfScore = cosineSim(userTfidfVector, tfidf.documentVectors[i]);

    const combinedScore = EMBEDDING_WEIGHT * embeddingScore + TFIDF_WEIGHT * tfidfScore;

    if (combinedScore > bestCombinedScore) {
      bestCombinedScore = combinedScore;
      bestIdx = i;
      bestEmbeddingScore = embeddingScore;
      bestTfidfScore = tfidfScore;
    }
  }

  if (bestCombinedScore < CONFIDENCE_THRESHOLD) {
    return {
      answer: 'Maaf, aku belum pernah belajar soal itu.',
      confidence: bestCombinedScore,
      matchedQuestion: '',
      embeddingScore: bestEmbeddingScore,
      tfidfScore: bestTfidfScore,
    };
  }

  return {
    answer: pairs[bestIdx].answer,
    confidence: bestCombinedScore,
    matchedQuestion: pairs[bestIdx].question,
    embeddingScore: bestEmbeddingScore,
    tfidfScore: bestTfidfScore,
  };
}
