"use client";

import Link from "next/link";
import { SPEAKING_VOCABULARY_SEED, SPEAKING_TASK_LABELS } from "../../lib/speaking-vocabulary-seed";

/** Admin hub for Source 3 phrases. Full CRUD after `speaking_vocabulary` exists — use Table Editor or add forms + RLS policies. */
export default function AdminSpeakingVocabularyPage() {
  const seed = SPEAKING_VOCABULARY_SEED;
  return (
    <div className="p-8 max-w-4xl">
      <Link href="/admin" className="text-sm text-blue-600 hover:underline">← Admin</Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2">Speaking vocabulary (Source 3)</h1>
      <p className="text-gray-600 mt-2 text-sm leading-relaxed">
        The public <Link href="/vocabulary" className="text-blue-600 underline">Vocabulary</Link> page shows a built-in seed of{" "}
        <strong>{seed.length}</strong> phrases (5 per speaking task). To let admins create/edit rows in the database, run{" "}
        <code className="bg-gray-200 px-1 rounded text-xs">docs/supabase-vocabulary.sql</code>, then add RLS policies for admin inserts/updates
        (or use the service role in a server API). Until then, edit <code className="bg-gray-200 px-1 rounded text-xs">app/lib/speaking-vocabulary-seed.ts</code> and redeploy.
      </p>
      <ul className="mt-6 space-y-2 text-sm border border-gray-200 rounded-xl bg-white p-4 max-h-[480px] overflow-y-auto">
        {seed.map(row => (
          <li key={row.id} className="border-b border-gray-100 pb-2 last:border-0">
            <span className="text-purple-600 font-semibold">{SPEAKING_TASK_LABELS[row.taskNumber]}</span>
            <span className="text-gray-800"> — {row.phrase}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
