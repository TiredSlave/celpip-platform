"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    freeUsers: 0,
    premiumUsers: 0,
    totalAttempts: 0,
    totalTasks: 0,
    totalMockTests: 0
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      // Total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Free users
      const { count: freeUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_type", "free");

      // Premium users
      const { count: premiumUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_type", "premium");

      // Total attempts
      const { count: totalAttempts } = await supabase
        .from("attempts")
        .select("*", { count: "exact", head: true });

      // Total tasks
      const { count: totalTasks } = await supabase
        .from("admin_tasks")
        .select("*", { count: "exact", head: true });

      // Total mock tests
      const { count: totalMockTests } = await supabase
        .from("mock_tests")
        .select("*", { count: "exact", head: true });

      setStats({
        totalUsers: totalUsers || 0,
        freeUsers: freeUsers || 0,
        premiumUsers: premiumUsers || 0,
        totalAttempts: totalAttempts || 0,
        totalTasks: totalTasks || 0,
        totalMockTests: totalMockTests || 0
      });

      // Recent users
      const { data: users } = await supabase
        .from("profiles")
        .select("id, email, user_type, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentUsers(users || []);
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) {
    return <p className="text-gray-500">Loading stats...</p>;
  }

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, color: "bg-blue-500", icon: "👥" },
    { label: "Free Users", value: stats.freeUsers, color: "bg-gray-500", icon: "🆓" },
    { label: "Premium Users", value: stats.premiumUsers, color: "bg-yellow-500", icon: "⭐" },
    { label: "Total Attempts", value: stats.totalAttempts, color: "bg-green-500", icon: "📝" },
    { label: "Saved Tasks", value: stats.totalTasks, color: "bg-purple-500", icon: "📚" },
    { label: "Mock Tests", value: stats.totalMockTests, color: "bg-orange-500", icon: "📋" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">{card.icon}</span>
              <span className={`${card.color} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                {card.label}
              </span>
            </div>
            <p className="text-4xl font-bold text-gray-800">{card.value}</p>
            <p className="text-gray-400 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Recent Users</h2>
          <a href="/admin/users" className="text-blue-600 text-sm hover:underline">
            View all
          </a>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b">
              <th className="pb-3">Email</th>
              <th className="pb-3">Type</th>
              <th className="pb-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentUsers.map(user => (
              <tr key={user.id}>
                <td className="py-3 text-gray-700">{user.email}</td>
                <td className="py-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    user.user_type === "premium"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {user.user_type || "free"}
                  </span>
                </td>
                <td className="py-3 text-gray-400 text-sm">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}