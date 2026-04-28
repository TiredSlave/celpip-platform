"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

type Attempt = {
  id: string;
  task_type: string;
  overall_band: number;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      const { data } = await supabase
        .from("attempts")
        .select("id, task_type, overall_band, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setAttempts(data || []);
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function getBandColor(band: number) {
    if (band >= 9) return "text-green-600";
    if (band >= 7) return "text-blue-600";
    if (band >= 5) return "text-yellow-600";
    return "text-red-600";
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  const averageBand = attempts.length > 0
    ? (attempts.reduce((sum, a) => sum + a.overall_band, 0) / attempts.length).toFixed(1)
    : null;

  const bestBand = attempts.length > 0
    ? Math.max(...attempts.map(a => a.overall_band))
    : null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-blue-700 text-white py-6 px-6 shadow">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">My Dashboard</h1>
            <p className="text-blue-200 text-sm mt-1">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5 text-center">
            <p className="text-gray-500 text-sm">Total Attempts</p>
            <p className="text-4xl font-bold text-blue-600 mt-1">{attempts.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 text-center">
            <p className="text-gray-500 text-sm">Average Band</p>
            <p className={`text-4xl font-bold mt-1 ${averageBand ? getBandColor(parseFloat(averageBand)) : "text-gray-400"}`}>
              {averageBand || "—"}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 text-center">
            <p className="text-gray-500 text-sm">Best Band</p>
            <p className={`text-4xl font-bold mt-1 ${bestBand ? getBandColor(bestBand) : "text-gray-400"}`}>
              {bestBand || "—"}
            </p>
          </div>
        </div>

        <a href="/" className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow text-center text-lg transition mb-8">
          🎯 Start New Practice Session
        </a>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Attempts</h2>
          {attempts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-3">📝</p>
              <p>No attempts yet. Start practicing!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="font-medium text-gray-700">{attempt.task_type}</p>
                    <p className="text-sm text-gray-400">{formatDate(attempt.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Band Score</p>
                    <p className={`text-2xl font-bold ${getBandColor(attempt.overall_band)}`}>
                      {attempt.overall_band}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
