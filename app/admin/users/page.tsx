"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type User = {
  id: string;
  email: string;
  full_name: string;
  user_type: string;
  is_admin: boolean;
  is_suspended: boolean;
  premium_expires_at: string | null;
  created_at: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  async function updateUser(userId: string, updates: any) {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("User updated successfully!");
      loadUsers();
      setEditingUser(null);
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  }

  async function suspendUser(userId: string, suspend: boolean) {
    await updateUser(userId, { is_suspended: suspend });
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" ||
      (filter === "premium" && user.user_type === "premium") ||
      (filter === "free" && user.user_type === "free") ||
      (filter === "suspended" && user.is_suspended) ||
      (filter === "admin" && user.is_admin);
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">User Management</h1>

      {message && (
        <div className="bg-green-50 text-green-700 rounded-lg p-3 mb-4 text-sm">
          {message}
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 flex gap-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email or name..."
          className="flex-1 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">All Users ({users.length})</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
          <option value="suspended">Suspended</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-700 text-sm font-semibold">
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Premium Expires</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-600">
                  Loading users...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-600">
                  No users found
                </td>
              </tr>
            ) : filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-800">{user.email}</p>
                  <p className="text-sm text-gray-600">{user.full_name || "No name"}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    user.user_type === "premium"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {user.user_type || "free"}
                  </span>
                  {user.is_admin && (
                    <span className="ml-1 text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      admin
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {user.premium_expires_at
                    ? new Date(user.premium_expires_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    user.is_suspended
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {user.is_suspended ? "Suspended" : "Active"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => suspendUser(user.id, !user.is_suspended)}
                      className={`text-xs px-3 py-1 rounded-lg transition ${
                        user.is_suspended
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      {user.is_suspended ? "Unsuspend" : "Suspend"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Edit User
            </h2>
            <p className="text-gray-600 text-sm mb-4">{editingUser.email}</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Type
              </label>
              <select
                value={editingUser.user_type || "free"}
                onChange={e => setEditingUser({
                  ...editingUser,
                  user_type: e.target.value
                })}
                className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="free">Free</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            {editingUser.user_type === "premium" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Premium Expiry Date
                </label>
                <input
                  type="date"
                  value={editingUser.premium_expires_at
                    ? new Date(editingUser.premium_expires_at).toISOString().split("T")[0]
                    : ""}
                  onChange={e => setEditingUser({
                    ...editingUser,
                    premium_expires_at: e.target.value
                  })}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            )}

            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingUser.is_admin || false}
                  onChange={e => setEditingUser({
                    ...editingUser,
                    is_admin: e.target.checked
                  })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  Admin Access
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => updateUser(editingUser.id, {
                  user_type: editingUser.user_type,
                  premium_expires_at: editingUser.premium_expires_at,
                  is_admin: editingUser.is_admin
                })}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}