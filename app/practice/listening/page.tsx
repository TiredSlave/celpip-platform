"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import PracticeBackLink from "../../components/PracticeBackLink";
import { buildTaskPracticeHref, practiceListPath } from "../../lib/practice-navigation";
import { supabase } from "../../lib/supabase";

type Task = { id: string; task_type: string; title: string; content: any; created_at: string; };
const TYPES = ["Listening - Problem Solving","Listening - Daily Life Conversation","Listening - Listening for Information","Listening - News Item","Listening - Discussion","Listening - Viewpoints"];
const PART: Record<string,{part:string;q:number}> = {
  "Listening - Problem Solving":{part:"Part 1",q:8},
  "Listening - Daily Life Conversation":{part:"Part 2",q:5},
  "Listening - Listening for Information":{part:"Part 3",q:6},
  "Listening - News Item":{part:"Part 4",q:5},
  "Listening - Discussion":{part:"Part 5",q:8},
  "Listening - Viewpoints":{part:"Part 6",q:6},
};

function ListeningLibrary() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get("filter") || "all");

  useEffect(() => {
    const f = searchParams.get("filter") || "all";
    setFilter(f);
  }, [searchParams]);

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase.from("admin_tasks").select("*")
      .in("task_type", TYPES).order("created_at", { ascending: true });
    setTasks(data || []);
    setLoading(false);
  }

  const filtered = tasks.filter(t => filter === "all" || t.task_type === filter);
  const listPath = practiceListPath(pathname, searchParams.toString());

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <PracticeBackLink fallback="/practice" className="text-sm text-orange-600 hover:underline mb-4 block">
            ← Back
          </PracticeBackLink>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🎧</span>
            <h1 className="text-3xl font-bold text-gray-900">Listening Practice</h1>
          </div>
          <p className="text-gray-600">Listen to audio passages and answer comprehension questions.</p>
        </div>
        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "all" ? "bg-orange-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>All</button>
          {TYPES.map(t => <button key={t} onClick={() => setFilter(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === t ? "bg-orange-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>{PART[t].part}</button>)}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No tasks available</h2>
            <p className="text-gray-600 text-sm">Ask an admin to generate listening tasks first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(task => (
              <Link key={task.id} href={buildTaskPracticeHref("listening", task.id, listPath)}
                className="group bg-white border border-orange-100 rounded-xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5">
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                  {PART[task.task_type]?.part} — {task.task_type.replace("Listening - ", "")}
                </span>
                <h3 className="font-bold text-gray-800 mt-3 mb-2 group-hover:text-orange-600 transition">
                  {task.content?.topic || task.content?.title || task.title}
                </h3>
                <p className="text-xs text-gray-600 mb-4">{PART[task.task_type]?.q} questions</p>
                <div className="flex items-center justify-end">
                  <span className="text-xs font-semibold text-orange-600 group-hover:underline">Start Practice →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ListeningPracticePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <ListeningLibrary />
    </Suspense>
  );
}
