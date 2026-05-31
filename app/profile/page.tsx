"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [targetBand, setTargetBand] = useState(9);
  const [testDate, setTestDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);

      // Load profile
      const profileRes = await fetch("/api/profile", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "X-User-Id": session.user.id
        }
      });
      const profile = await profileRes.json();
      if (profile && !profile.error) {
        setFullName(profile.full_name || "");
        setTargetBand(profile.target_band || 9);
        setTestDate(profile.test_date || "");
      }

      // Load attempts for stats
      const { data } = await supabase
        .from("attempts")
        .select("overall_band, task_type, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      setAttempts(data || []);
      setLoading(false);
    }
    loadData();
  }, []);

  async function saveProfile() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || ""}`
        },
        body: JSON.stringify({
          userId: session?.user?.id,
          email: session?.user?.email,
          fullName,
          targetBand,
          testDate
        })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      setError("Failed to save profile. Please try again.");
    }
    setSaving(false);
  }

  function getDaysUntilTest() {
    if (!testDate) return null;
    const today = new Date();
    const test = new Date(testDate);
    const diff = Math.ceil((test.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function getLatestBand() {
    if (attempts.length === 0) return null;
    return attempts[0].overall_band;
  }

  function getAverageBand() {
    if (attempts.length === 0) return null;
    return (attempts.reduce((s, a) => s + a.overall_band, 0) / attempts.length).toFixed(1);
  }

  function getBandColor(band: number) {
    if (band >= 9) return "text-green-600";
    if (band >= 7) return "text-blue-600";
    if (band >= 5) return "text-yellow-600";
    return "text-red-600";
  }

  function getProgressPercent() {
    const latest = getLatestBand();
    if (!latest) return 0;
    return Math.min(Math.round((latest / targetBand) * 100), 100);
  }

  function getProgressMessage() {
    const latest = getLatestBand();
    if (!latest) return "Start practicing to see your progress!";
    if (latest >= targetBand) return "You have reached your target band! Keep it up!";
    const gap = targetBand - latest;
    return `You are ${gap} band${gap > 1 ? "s" : ""} away from your target.`;
  }

  const daysUntilTest = getDaysUntilTest();
  const progressPercent = getProgressPercent();

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-indigo-700 text-white py-6 px-6 shadow">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-indigo-100 text-sm mt-1">{user?.email}</p>
          </div>
          <a
            href="/dashboard"
            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Dashboard
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Navigation */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <a href="/" className="px-4 py-2 bg-white border rounded-full text-gray-600 text-sm hover:border-blue-400">Writing</a>
          <a href="/reading" className="px-4 py-2 bg-white border rounded-full text-gray-600 text-sm hover:border-green-400">Reading</a>
          <a href="/speaking" className="px-4 py-2 bg-white border rounded-full text-gray-600 text-sm hover:border-purple-400">Speaking</a>
          <a href="/dashboard" className="px-4 py-2 bg-white border rounded-full text-gray-600 text-sm hover:border-blue-400">Dashboard</a>
          <span className="px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-semibold">Profile</span>
        </div>

        {/* Goal Progress Card */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Goal Progress</h2>

          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Progress to Band {targetBand}</span>
            <span className="text-sm font-bold text-indigo-600">{progressPercent}%</span>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-4 mb-4">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                progressPercent >= 100 ? "bg-green-500" :
                progressPercent >= 70 ? "bg-blue-500" :
                progressPercent >= 40 ? "bg-yellow-500" : "bg-red-400"
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <p className="text-gray-600 text-sm mb-4">{getProgressMessage()}</p>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-700 mb-1">Latest Band</p>
              <p className={`text-2xl font-bold ${getLatestBand() ? getBandColor(getLatestBand()!) : "text-gray-600"}`}>
                {getLatestBand() || "—"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-700 mb-1">Target Band</p>
              <p className="text-2xl font-bold text-indigo-600">{targetBand}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-700 mb-1">Days Left</p>
              <p className={`text-2xl font-bold ${
                daysUntilTest === null ? "text-gray-600" :
                daysUntilTest < 7 ? "text-red-500" :
                daysUntilTest < 30 ? "text-yellow-500" : "text-green-600"
              }`}>
                {daysUntilTest === null ? "—" :
                 daysUntilTest < 0 ? "Past" : daysUntilTest}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Profile Settings</h2>

          {error && (
            <div className="bg-red-50 text-red-600 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          {saved && (
            <div className="bg-green-50 text-green-700 rounded-lg p-3 mb-4 text-sm">
              Profile saved successfully!
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full p-3 border border-gray-100 rounded-lg bg-gray-50 text-gray-600"
            />
            <p className="text-xs text-gray-600 mt-1">Email cannot be changed</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Band Score
            </label>
            <div className="grid grid-cols-8 gap-2">
              {[5,6,7,8,9,10,11,12].map(band => (
                <button
                  key={band}
                  onClick={() => setTargetBand(band)}
                  className={`py-2 rounded-lg text-sm font-bold transition ${
                    targetBand === band
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {band}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Date
            </label>
            <input
              type="date"
              value={testDate}
              onChange={e => setTestDate(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-gray-600 mt-1">
              Set your CELPIP test date to track countdown
            </p>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>

        {/* Practice Stats */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Practice Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {attempts.filter(a => a.task_type.includes("Writing")).length}
              </p>
              <p className="text-gray-600 text-sm mt-1">Writing Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {attempts.filter(a => a.task_type.includes("Reading")).length}
              </p>
              <p className="text-gray-600 text-sm mt-1">Reading Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {attempts.filter(a => a.task_type.includes("Speaking")).length}
              </p>
              <p className="text-gray-600 text-sm mt-1">Speaking Sessions</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-4xl font-bold text-indigo-600">{attempts.length}</p>
            <p className="text-gray-600 text-sm mt-1">Total Practice Sessions</p>
          </div>
        </div>
      </div>
    </main>
  );
}
