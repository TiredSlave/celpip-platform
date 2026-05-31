"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PracticeBackLink from "../../components/PracticeBackLink";
import { buildTaskPracticeHref, practiceListPath } from "../../lib/practice-navigation";
import { supabase } from "../../lib/supabase";
import {
  READING_PARTS,
  readingPartFilterLabel,
  readingPartLabel,
  resolveReadingFilter,
  type ReadingFilter,
} from "../../lib/reading-task-types";
import { fetchReadingPracticeTasks } from "../../lib/reading-practice-tasks";

type Task = {
  id: string;
  task_type: string;
  section?: string | null;
  sequence_number?: number | null;
  title: string;
  content: any;
  created_at: string;
};

function ReadingLibrary() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(() => searchParams.get("filter") || "all");

  useEffect(() => {
    setFilter(searchParams.get("filter") || "all");
  }, [searchParams]);

  const activeFilter = resolveReadingFilter(filter === "all" ? "all" : filter);

  useEffect(() => {
    void loadTasks(activeFilter);
  }, [activeFilter]);

  async function loadTasks(active: ReadingFilter) {
    setLoading(true);
    setLoadError(null);
    try {
      setTasks(await fetchReadingPracticeTasks(active));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load reading tasks");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  function selectFilter(next: ReadingFilter) {
    const param = next === "all" ? "all" : next;
    setFilter(param);
    const params = new URLSearchParams();
    if (next !== "all") params.set("filter", next);
    const qs = params.toString();
    router.push(qs ? `/practice/reading?${qs}` : "/practice/reading", { scroll: false });
  }

  const listPath = practiceListPath(pathname, searchParams.toString());

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <PracticeBackLink fallback="/practice" className="text-sm text-green-600 hover:underline mb-4 block">
            ← Back
          </PracticeBackLink>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📖</span>
            <h1 className="text-3xl font-bold text-gray-900">Reading Practice</h1>
          </div>
          <p className="text-gray-600">Choose a reading task and answer multiple choice questions.</p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            type="button"
            onClick={() => selectFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeFilter === "all" ? "bg-green-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            All Parts
          </button>
          {READING_PARTS.map(part => (
            <button
              key={part.key}
              type="button"
              onClick={() => selectFilter(part.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === part.key ? "bg-green-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {readingPartFilterLabel(part)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="text-center py-20 bg-white rounded-xl border border-red-200">
            <h2 className="text-xl font-bold text-red-800 mb-2">Could not load tasks</h2>
            <p className="text-gray-600 text-sm">{loadError}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No tasks available</h2>
            <p className="text-gray-600 text-sm">
              No tasks for &quot;{activeFilter === "all" ? "all parts" : readingPartLabel(activeFilter)}&quot;.
              In admin, check task_type is task 1–4 or section is Reading.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map(task => (
              <Link
                key={task.id}
                href={buildTaskPracticeHref("reading", task.id, listPath)}
                className="group bg-white border border-green-100 rounded-xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                  {readingPartLabel(task.task_type)}
                </span>
                <h3 className="font-bold text-gray-800 mt-3 mb-2 group-hover:text-green-600 transition">
                  {task.content?.title || task.title || task.task_type}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{task.content?.questions?.length || 0} questions</p>
                <div className="flex items-center justify-end">
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ReadingLibrary />
    </Suspense>
  );
}
