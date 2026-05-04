"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

<a href="/pricing" className="bg-yellow-500 hover:bg-yellow-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
  Upgrade
</a>
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
  const [targetBand, setTargetBand] = useState(9);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const { data } = await supabase
        .from("attempts")
        .select("id, task_type, overall_band, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(20);
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

  function getBandBg(band: number) {
    if (band >= 9) return "bg-green-50 border-green-200";
    if (band >= 7) return "bg-blue-50 border-blue-200";
    if (band >= 5) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  }

  function formatFullDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-CA", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading your dashboard...</p>
      </main>
    );
  }

  const averageBand = attempts.length > 0
    ? parseFloat((attempts.reduce((sum, a) => sum + a.overall_band, 0) / attempts.length).toFixed(1))
    : null;
  const bestBand = attempts.length > 0 ? Math.max(...attempts.map(a => a.overall_band)) : null;
  const latestBand = attempts.length > 0 ? attempts[attempts.length - 1].overall_band : null;

  const chartData = attempts.map((a, index) => ({
    name: formatDate(a.created_at),
    band: a.overall_band,
    task: a.task_type,
    index: index + 1
  }));

  const writingAttempts = attempts.filter(a => a.task_type.includes("Writing"));
  const readingAttempts = attempts.filter(a => a.task_type.includes("Reading"));
  const speakingAttempts = attempts.filter(a => a.task_type.includes("Speaking"));
  const listeningAttempts = attempts.filter(a => a.task_type.includes("Listening"));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow p-3 text-sm">
          <p className="text-gray-500 mb-1">{label}</p>
          <p className="font-bold text-blue-600">Band: {payload[0].value}</p>
          <p className="text-gray-500">{payload[0].payload.task}</p>
        </div>
      );
    }
    return null;
  };

  function ModuleCard({ title, count, color, avg }: { title: string; count: number; color: string; avg: number | null }) {
    return (
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
        <p className={`text-3xl font-bold ${color}`}>{count}</p>
        <p className="text-gray-400 text-sm">attempts</p>
        {avg !== null && (
          <p className="text-sm text-gray-600 mt-2">
            Avg: <span className={`font-bold ${getBandColor(avg)}`}>{avg}</span>
          </p>
        )}
        {count === 0 && <p className="text-xs text-gray-400 mt-2">No attempts yet</p>}
      </div>
    );
  }

  const calcAvg = (arr: Attempt[]) => arr.length > 0
    ? parseFloat((arr.reduce((s, a) => s + a.overall_band, 0) / arr.length).toFixed(1))
    : null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-blue-700 text-white py-6 px-6 shadow">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">My Dashboard</h1>
            <p className="text-blue-200 text-sm mt-1">{user?.email}</p>
          </div>
          <div className="flex gap-3">
            <a href="/profile" className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition">
              Profile
            </a>
            <button onClick={handleLogout} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5 text-center">
            <p className="text-gray-500 text-sm">Total Attempts</p>
            <p className="text-4xl font-bold text-blue-600 mt-1">{attempts.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 text-center">
            <p className="text-gray-500 text-sm">Latest Band</p>
            <p className={`text-4xl font-bold mt-1 ${latestBand ? getBandColor(latestBand) : "text-gray-400"}`}>
              {latestBand || "—"}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 text-center">
            <p className="text-gray-500 text-sm">Average Band</p>
            <p className={`text-4xl font-bold mt-1 ${averageBand ? getBandColor(averageBand) : "text-gray-400"}`}>
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

        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Score Progress</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Target Band:</label>
              <select
                value={targetBand}
                onChange={e => setTargetBand(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {[5,6,7,8,9,10,11,12].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {attempts.length < 2 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📊</p>
              <p>Complete at least 2 practice sessions to see your progress chart</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <YAxis domain={[0, 12]} ticks={[0, 3, 6, 9, 12]} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={targetBand} stroke="#f59e0b" strokeDasharray="5 5"
                  label={{ value: `Target: ${targetBand}`, position: "right", fontSize: 12, fill: "#f59e0b" }}
                />
                <Line
                  type="monotone"
                  dataKey="band"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const color = payload.task.includes("Writing") ? "#2563eb"
                      : payload.task.includes("Reading") ? "#16a34a"
                      : payload.task.includes("Speaking") ? "#9333ea"
                      : "#ea580c";
                    return <circle key={`dot-${payload.index}`} cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />;
                  }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {attempts.length >= 2 && (
            <div className="flex gap-4 mt-4 justify-center text-sm flex-wrap">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600"></div><span className="text-gray-500">Writing</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-600"></div><span className="text-gray-500">Reading</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-600"></div><span className="text-gray-500">Speaking</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-600"></div><span className="text-gray-500">Listening</span></div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <ModuleCard title="Writing" count={writingAttempts.length} color="text-blue-600" avg={calcAvg(writingAttempts)} />
          <ModuleCard title="Reading" count={readingAttempts.length} color="text-green-600" avg={calcAvg(readingAttempts)} />
          <ModuleCard title="Speaking" count={speakingAttempts.length} color="text-purple-600" avg={calcAvg(speakingAttempts)} />
          <ModuleCard title="Listening" count={listeningAttempts.length} color="text-orange-600" avg={calcAvg(listeningAttempts)} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <a href="/" className="block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow text-center transition">Writing</a>
          <a href="/reading" className="block bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl shadow text-center transition">Reading</a>
          <a href="/speaking" className="block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-xl shadow text-center transition">Speaking</a>
          <a href="/listening" className="block bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 rounded-xl shadow text-center transition">Listening</a>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Attempts</h2>
          {attempts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-3">📝</p>
              <p>No attempts yet. Start practicing!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...attempts].reverse().slice(0, 10).map((attempt) => (
                <div key={attempt.id} className={`flex items-center justify-between rounded-lg p-4 border ${getBandBg(attempt.overall_band)}`}>
                  <div>
                    <p className="font-medium text-gray-700">{attempt.task_type}</p>
                    <p className="text-sm text-gray-400">{formatFullDate(attempt.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Band Score</p>
                    <p className={`text-2xl font-bold ${getBandColor(attempt.overall_band)}`}>{attempt.overall_band}</p>
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