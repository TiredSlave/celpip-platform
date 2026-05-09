"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, Suspense } from "next/navigation";
import { supabase } from "../../lib/supabase";
type Task = { id: string; task_type: string; difficulty: string; title: string; content: any; created_at: string; };
const TYPES = ["Speaking Task 1","Speaking Task 2","Speaking Task 3","Speaking Task 4","Speaking Task 5","Speaking Task 6","Speaking Task 7","Speaking Task 8"];
const INFO: Record<string,{desc:string;time:string}> = {
  "Speaking Task 1":{desc:"Give advice to a friend.",time:"30s prep / 90s speak"},
  "Speaking Task 2":{desc:"Talk about a personal experience.",time:"30s prep / 60s speak"},
  "Speaking Task 3":{desc:"Describe a picture in detail.",time:"30s prep / 60s speak"},
  "Speaking Task 4":{desc:"Make predictions about a situation.",time:"30s prep / 60s speak"},
  "Speaking Task 5":{desc:"Compare two pictures.",time:"60s prep / 60s speak"},
  "Speaking Task 6":{desc:"Deal with a difficult situation.",time:"60s prep / 60s speak"},
  "Speaking Task 7":{desc:"Express your opinion on a topic.",time:"30s prep / 60s speak"},
  "Speaking Task 8":{desc:"Describe an unusual situation.",time:"30s prep / 60s speak"},
};
export default function SpeakingPracticePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get("filter") || "all");
  useEffect(() => { loadTasks(); }, []);
  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase.from("admin_tasks").select("*").in("task_type", TYPES).order("created_at", { ascending: false });
    setTasks(data || []); setLoading(false);
  }
  const filtered = tasks.filter(t => filter === "all" || t.task_type === filter);
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6"><div className="max-w-5xl mx-auto">
      <Link href="/practice" className="text-sm text-purple-600 hover:underline mb-4 block">← Back to Practice</Link>
      <div className="flex items-center gap-3 mb-2"><span className="text-3xl">🎤</span><h1 className="text-3xl font-bold text-gray-900">Speaking Practice</h1></div>
      <p className="text-gray-500 mb-8">Practice all 8 speaking tasks with timers and AI feedback.</p>
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "all" ? "bg-purple-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>All</button>
        {TYPES.map(t => <button key={t} onClick={() => setFilter(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === t ? "bg-purple-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>{t.replace("Speaking ","")}</button>)}
      </div>
      {loading ? <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>
      : filtered.length === 0 ? <div className="text-center py-20 bg-white rounded-xl border border-gray-200"><div className="text-5xl mb-4">📭</div><h2 className="text-xl font-bold text-gray-800 mb-2">No tasks available</h2></div>
      : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(task => (
            <Link key={task.id} href={`/speaking?taskId=${task.id}`} className="group bg-white border border-purple-100 rounded-xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-purple-100 text-purple-700">{task.task_type}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${task.difficulty === "hard" ? "bg-red-100 text-red-700" : task.difficulty === "easy" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{task.difficulty}</span>
              </div>
              <h3 className="font-bold text-gray-800 mb-1 group-hover:text-purple-600 transition line-clamp-2">{task.content?.situation?.slice(0,80) || task.title}</h3>
              <p className="text-xs text-gray-500 mb-1">{INFO[task.task_type]?.desc}</p>
              <p className="text-xs text-gray-400 mb-4">⏱ {INFO[task.task_type]?.time}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{new Date(task.created_at).toLocaleDateString()}</span>
                <span className="text-xs font-semibold text-purple-600">Start Practice →</span>
              </div>
            </Link>
          ))}
        </div>}
    </div></div>
  );
}