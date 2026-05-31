"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import PracticeBackLink from "../../components/PracticeBackLink";
import { buildTaskPracticeHref, practiceListPath } from "../../lib/practice-navigation";
import { supabase } from "../../lib/supabase";

type Task = { id: string; task_type: string; title: string; content: any; created_at: string };

function WritingLibrary() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get("filter") || "all");

  useEffect(() => {
    const f = searchParams.get("filter") || "all";
    setFilter(f);
  }, [searchParams]);

  useEffect(() => {
    void loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase
      .from("admin_tasks")
      .select("*")
      .in("task_type", ["Writing Task 1", "Writing Task 2"])
      .order("created_at", { ascending: true });
    setTasks(data || []);
    setLoading(false);
  }

  const filtered = tasks.filter(t => filter === "all" || t.task_type === filter);
  const listPath = practiceListPath(pathname, searchParams.toString());

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <PracticeBackLink fallback="/practice" className="text-sm text-blue-600 hover:underline mb-4 block">
          ← Back
        </PracticeBackLink>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">✍️</span>
          <h1 className="text-3xl font-bold text-gray-900">Writing Practice</h1>
        </div>
        <p className="text-gray-600 mb-8">Choose a task to practice writing under timed conditions with AI feedback.</p>
        <div className="flex gap-2 mb-6">
          {["all", "Writing Task 1", "Writing Task 2"].map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "All Tasks" : f}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No tasks available</h2>
            <p className="text-gray-600 text-sm">Ask an admin to generate writing tasks first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(task => (
              <Link
                key={task.id}
                href={buildTaskPracticeHref("writing", task.id, listPath)}
                className="group bg-white border border-blue-100 rounded-xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">{task.task_type}</span>
                <h3 className="font-bold text-gray-800 mt-3 mb-2 group-hover:text-blue-600 transition">
                  {task.content?.topic || task.content?.scenario?.slice(0, 60) || task.title}
                </h3>
                <p className="text-xs text-gray-600 mb-4">{task.content?.word_limit || 200} words · {task.content?.time_limit_minutes || 27} min</p>
                <div className="flex items-center justify-end">
                  <span className="text-xs font-semibold text-blue-600 group-hover:underline">Start Practice →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WritingPracticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <WritingLibrary />
    </Suspense>
  );
}
