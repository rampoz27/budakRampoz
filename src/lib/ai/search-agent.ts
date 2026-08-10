/**
 * Search Agent — a self-contained, 2-step "AI + Search" pipeline.
 *
 * Step 1 (AI #1 — Query Writer): a small/fast LLM reads the user's question
 * and rewrites it into a short, effective web search query.
 *
 * Step 2 (Search): that query is sent to Tavily's Search API — chosen
 * because it has a genuinely free tier with no card required, and it's
 * built specifically to feed LLM pipelines like this one.
 *
 * Step 3 (AI #1 again — Synthesizer): the same LLM reads the search results
 * and writes a final, cited answer back to the user.
 *
 * This file has no dependency on route.ts or any other provider file on
 * purpose — it can be deleted, swapped, or reused independently.
 */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

// ── Step 1 & 3: the "thinking" LLM ───────────────────────────────
// Groq is used here because it's free-tier friendly and fast. Swap the
// model/endpoint below if you'd rather use OpenAI or another provider —
// this is the only place that needs to change.
async function callLLM(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) {
    throw new Error('GROQ_API_KEY is missing. Add a real key to your .env file.');
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? '').trim();
}

// ── Step 1: turn the user's question into a search query ────────
async function formulateSearchQuery(question: string): Promise<string> {
  const query = await callLLM([
    {
      role: 'user',
      content:
        'You turn user questions into short, effective web search engine queries. ' +
        'Reply with ONLY the query text — no quotes, no explanation, no punctuation ' +
        `at the end.\n\nQuestion: "${question}"\n\nSearch query:`,
    },
  ]);

  // Strip stray quotes the model sometimes adds anyway.
  return query.replace(/^["']|["']$/g, '');
}

// ── Step 2: fetch results from Tavily (free tier, no card required,
//    built specifically for feeding LLM pipelines like this one) ────
async function fetchSearchResults(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey || apiKey.startsWith('your-')) {
    throw new Error('TAVILY_API_KEY is missing. Add a real key to your .env file.');
  }

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 5,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Tavily error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const items = data.results ?? [];

  return items.map((item: { title?: string; url?: string; content?: string }) => ({
    title: item.title ?? '',
    link: item.url ?? '',
    snippet: item.content ?? '',
  }));
}

// ── Step 3: synthesize a final answer from the search results ───
async function synthesizeAnswer(question: string, results: SearchResult[]): Promise<string> {
  if (results.length === 0) {
    return "I searched the web but didn't find any relevant results for that. Could you rephrase the question?";
  }

  const resultsBlock = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.link}`)
    .join('\n\n');

  const answer = await callLLM([
    {
      role: 'user',
      content:
        'You are a research assistant. Answer the user\'s question using ONLY the search ' +
        'results below. Cite claims inline with [1], [2], etc. matching the numbered ' +
        'sources. If the results don\'t fully answer the question, say so honestly. ' +
        'Be concise and practical.\n\n' +
        `Question: ${question}\n\nSearch results:\n${resultsBlock}\n\nAnswer:`,
    },
  ]);

  const sourcesList = results
    .map((r, i) => `[${i + 1}] ${r.title} — ${r.link}`)
    .join('\n');

  return `${answer}\n\n---\n**Sources**\n${sourcesList}`;
}

// ── Public entry point ────────────────────────────────────────────
export async function runSearchAgent(conversation: ChatMessage[]): Promise<string> {
  const lastUserMessage = [...conversation].reverse().find((m) => m.role === 'user');
  if (!lastUserMessage) {
    throw new Error('No user message found to search for.');
  }

  const question = lastUserMessage.content;

  const searchQuery = await formulateSearchQuery(question);
  const results = await fetchSearchResults(searchQuery);
  const finalAnswer = await synthesizeAnswer(question, results);

  return finalAnswer;
}