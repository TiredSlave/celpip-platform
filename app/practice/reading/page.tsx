"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Task = { id: string; task_type: string; difficulty: string; title: string; content: any; created_at: string; };
const TYPES = ["Reading Correspondence","Reading to Apply Information","Reading for Information","Reading for Viewpoints"];

function ReadingLibrary() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get("filter") || "all");

  // Sync filter when URL changes (e.g. clicking navbar links)
  useEffect(() => {
    const f = searchParams.get("filter") || "all";
    setFilter(f);
  }, [searchParams]);

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase.from("admin_tasks").select("*")
      .in("task_type", TYPES).order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }

  const filtered = tasks.filter(t => filter === "all" || t.task_type === filter);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/practice" className="text-sm text-green-600 hover:underline mb-4 block">← Back to Practice</Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📖</span>
            <h1 className="text-3xl font-bold text-gray-900">Reading Practice</h1>
          </div>
          <p className="text-gray-500">Choose a reading task and answer multiple choice questions.</p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", ...TYPES].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f ? "bg-green-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}>
              {f === "all" ? "All Parts" : f.replace("Reading ", "")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No tasks available</h2>
            <p className="text-gray-500 text-sm">Ask an admin to generate reading tasks first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(task => (
              <Link key={task.id} href={`/practice/reading/task?taskId=${task.id}`}
                className="group bg-white border border-green-100 rounded-xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                    {task.task_type.replace("Reading ", "")}
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    task.difficulty === "hard" ? "bg-red-100 text-red-700"
                    : task.difficulty === "easy" ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                  }`}>{task.difficulty}</span>
                </div>
                <h3 className="font-bold text-gray-800 mb-2 group-hover:text-green-600 transition">
                  {task.content?.title || task.title || task.task_type}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{task.content?.questions?.length || 0} questions</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{new Date(task.created_at).toLocaleDateString()}</span>
                  <span className="text-xs font-semibold text-green-600 group-hover:underline">Start Practice →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReadingPracticePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <ReadingLibrary />
    </Suspense>
  );
}
