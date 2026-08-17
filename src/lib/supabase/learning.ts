import { supabase } from './client';

export interface LearningTopicRow {
  id: string;
  user_id: string;
  topic_name: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface LearningSubtopicRow {
  id: string;
  user_id: string;
  topic_id: string;
  subtopic_name: string;
  order_index: number;
  target_count: number;
  created_at: string;
}

export interface LearnedKnowledgeRow {
  id: string;
  user_id: string;
  topic_id: string;
  subtopic_id: string;
  question: string;
  answer: string;
  source_model: string | null;
  learned_at: string;
}

export interface SubtopicProgress extends LearningSubtopicRow {
  learned_count: number;
  progress_percent: number;
}

export interface TopicProgress extends LearningTopicRow {
  subtopics: SubtopicProgress[];
  overall_percent: number;
}

export async function fetchTopics(): Promise<LearningTopicRow[]> {
  const { data, error } = await supabase
    .from('learning_topics')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTopic(topicName: string): Promise<LearningTopicRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('learning_topics')
    .insert({ user_id: user.id, topic_name: topicName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createSubtopics(
  topicId: string,
  subtopicNames: string[],
  targetCount = 5
): Promise<LearningSubtopicRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const rows = subtopicNames.map((name, i) => ({
    user_id: user.id,
    topic_id: topicId,
    subtopic_name: name,
    order_index: i,
    target_count: targetCount,
  }));

  const { data, error } = await supabase.from('learning_subtopics').insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function fetchSubtopics(topicId: string): Promise<LearningSubtopicRow[]> {
  const { data, error } = await supabase
    .from('learning_subtopics')
    .select('*')
    .eq('topic_id', topicId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveLearnedKnowledge(entry: {
  topicId: string;
  subtopicId: string;
  question: string;
  answer: string;
  embedding: number[];
  sourceModel: string;
}): Promise<LearnedKnowledgeRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('learned_knowledge')
    .insert({
      user_id: user.id,
      topic_id: entry.topicId,
      subtopic_id: entry.subtopicId,
      question: entry.question,
      answer: entry.answer,
      embedding: entry.embedding,
      source_model: entry.sourceModel,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Cek apakah ada pertanyaan yang UDAH tersimpan yang embeddingnya mirip
// banget sama yang baru — biar nggak numpuk duplikat/nyaris-duplikat di
// database. Manggil function SQL find_similar_knowledge yang kita bikin
// di schema.sql.
export async function findSimilarKnowledge(
  topicId: string,
  embedding: number[],
  threshold = 0.85
): Promise<{ id: string; question: string; similarity: number } | null> {
  const { data, error } = await supabase.rpc('find_similar_knowledge', {
    query_embedding: embedding,
    p_topic_id: topicId,
    similarity_threshold: threshold,
  });
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

export async function fetchLearnedCountsBySubtopic(
  topicId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('learned_knowledge')
    .select('subtopic_id')
    .eq('topic_id', topicId);
  if (error) throw error;

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    counts[row.subtopic_id] = (counts[row.subtopic_id] ?? 0) + 1;
  });
  return counts;
}

// Rangkum 1 topik lengkap dengan progres tiap sub-topik (persentase) dan
// progres keseluruhan (rata-rata semua sub-topik) — ini yang dipakai
// buat gambar pizza chart di sidebar.
export async function fetchTopicProgress(topicId: string): Promise<TopicProgress | null> {
  const { data: topic, error: topicError } = await supabase
    .from('learning_topics')
    .select('*')
    .eq('id', topicId)
    .single();
  if (topicError) throw topicError;
  if (!topic) return null;

  const [subtopics, counts] = await Promise.all([
    fetchSubtopics(topicId),
    fetchLearnedCountsBySubtopic(topicId),
  ]);

  const subtopicsWithProgress: SubtopicProgress[] = subtopics.map((s) => {
    const learnedCount = counts[s.id] ?? 0;
    return {
      ...s,
      learned_count: learnedCount,
      progress_percent: Math.min(100, Math.round((learnedCount / s.target_count) * 100)),
    };
  });

  const overallPercent =
    subtopicsWithProgress.length > 0
      ? Math.round(
          subtopicsWithProgress.reduce((sum, s) => sum + s.progress_percent, 0) /
            subtopicsWithProgress.length
        )
      : 0;

  return {
    ...topic,
    subtopics: subtopicsWithProgress,
    overall_percent: overallPercent,
  };
}

export async function fetchAllTopicsWithProgress(): Promise<TopicProgress[]> {
  const topics = await fetchTopics();
  const results = await Promise.all(topics.map((t) => fetchTopicProgress(t.id)));
  return results.filter((t): t is TopicProgress => t !== null);
}
