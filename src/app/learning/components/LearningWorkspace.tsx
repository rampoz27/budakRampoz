'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import PizzaChart from './PizzaChart';
import {
  fetchAllTopicsWithProgress,
  createTopic,
  createSubtopics,
  saveLearnedKnowledge,
  findSimilarKnowledge,
  type TopicProgress,
} from '@/lib/supabase/learning';

export default function LearningWorkspace() {
  const [topics, setTopics] = useState<TopicProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTopicName, setNewTopicName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [learningTopicId, setLearningTopicId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  const loadTopics = useCallback(async () => {
    try {
      const data = await fetchAllTopicsWithProgress();
      setTopics(data);
    } catch (err) {
      console.error('Failed to load topics', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const handleCreateTopic = async () => {
    if (!newTopicName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const topic = await createTopic(newTopicName.trim());

      const res = await fetch('/api/auto-learn/generate-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: newTopicName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal generate learning path.');

      await createSubtopics(topic.id, data.subtopics);
      setNewTopicName('');
      await loadTopics();
    } catch (err) {
      console.error('Failed to create topic', err);
      alert(err instanceof Error ? err.message : 'Gagal bikin topik baru.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartLearning = async (topic: TopicProgress) => {
    if (learningTopicId) return; // udah ada proses jalan, jangan tumpuk
    setLearningTopicId(topic.id);
    setStatusText(`Menyiapkan pertanyaan buat "${topic.topic_name}"...`);

    try {
      const res = await fetch('/api/auto-learn/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: topic.id,
          subtopics: topic.subtopics.map((s) => ({
            id: s.id,
            subtopic_name: s.subtopic_name,
            target_count: s.target_count,
            learned_count: s.learned_count,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menjalankan proses belajar.');

      const results: Array<{
        subtopicId: string;
        question: string;
        answer: string;
        embedding: number[];
        sourceModel: string;
      }> = data.results;

      let savedCount = 0;
      let skippedCount = 0;

      for (const [i, item] of results.entries()) {
        setStatusText(`Menyimpan hasil belajar ${i + 1}/${results.length}...`);

        const similar = await findSimilarKnowledge(topic.id, item.embedding);
        if (similar) {
          skippedCount += 1;
          continue; // terlalu mirip sama yang udah ada, skip biar nggak duplikat
        }

        await saveLearnedKnowledge({
          topicId: topic.id,
          subtopicId: item.subtopicId,
          question: item.question,
          answer: item.answer,
          embedding: item.embedding,
          sourceModel: item.sourceModel,
        });
        savedCount += 1;
      }

      setStatusText(`✅ Selesai — ${savedCount} hal baru dipelajari, ${skippedCount} dilewati (mirip yang udah ada).`);
      await loadTopics();
    } catch (err) {
      console.error('Learning process failed', err);
      setStatusText(`⚠️ ${err instanceof Error ? err.message : 'Gagal menjalankan proses belajar.'}`);
    } finally {
      setLearningTopicId(null);
      setTimeout(() => setStatusText(''), 5000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-foreground mb-1">📚 Pembelajaran AI</h1>
        <p className="text-sm text-muted-foreground mb-6">
          AI kamu belajar sendiri, generate pertanyaan &amp; jawaban sesuai topik yang kamu tentukan.
        </p>

        {/* Bikin topik baru */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
            placeholder="Topik baru, misal: Python, Web Development..."
            className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTopic()}
          />
          <button
            onClick={handleCreateTopic}
            disabled={isCreating || !newTopicName.trim()}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {isCreating ? 'Menyusun...' : '+ Topik Baru'}
          </button>
        </div>

        {statusText && (
          <div className="mb-4 bg-muted border border-border rounded-lg px-4 py-2 text-sm text-secondary-foreground">
            {statusText}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="ArrowPathIcon" size={20} className="text-muted-foreground animate-spin" />
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Belum ada topik. Tambahin topik baru buat mulai.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topics.map((topic) => (
              <div key={topic.id} className="bg-muted border border-border rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <PizzaChart percent={topic.overall_percent} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{topic.topic_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {topic.subtopics.length} sub-topik
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleStartLearning(topic)}
                    disabled={learningTopicId !== null || topic.overall_percent >= 100}
                    className="flex-1 bg-primary/10 text-primary text-xs font-medium py-1.5 rounded-lg disabled:opacity-50 hover:bg-primary/20 transition-colors"
                  >
                    {learningTopicId === topic.id
                      ? 'Belajar...'
                      : topic.overall_percent >= 100
                        ? '✅ Selesai'
                        : 'Mulai Belajar'}
                  </button>
                  <button
                    onClick={() => setExpandedTopicId(expandedTopicId === topic.id ? null : topic.id)}
                    className="text-xs text-muted-foreground px-2 hover:text-foreground transition-colors"
                  >
                    {expandedTopicId === topic.id ? 'Tutup' : 'Detail'}
                  </button>
                </div>

                {expandedTopicId === topic.id && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    {topic.subtopics.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs">
                        <span className="text-secondary-foreground truncate flex-1">{s.subtopic_name}</span>
                        <span className="text-muted-foreground ml-2">
                          {s.learned_count}/{s.target_count} ({s.progress_percent}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
