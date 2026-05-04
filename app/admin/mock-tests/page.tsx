"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type MockTest = {
  id: string;
  title: string;
  description: string;
  is_published: boolean;
  time_limit_minutes: number;
  created_at: string;
};

type Task = {
  id: string;
  task_type: string;
  difficulty: string;
  title: string;
  content: any;
};

type MockTestTask = {
  id: string;
  task_id: string;
  order_number: number;
  section: string;
  admin_tasks: Task;
};

export default function MockTestsPage() {
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [testTasks, setTestTasks] = useState<MockTestTask[]>([]);
  const [loadingTestTasks, setLoadingTestTasks] = useState(false);

  // New test form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTimeLimit, setNewTimeLimit] = useState(120);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Add task to test
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedSection, setSelectedSection] = useState("Writing");

  useEffect(() => {
    loadMockTests();
    loadTasks();
  }, []);

  async function loadMockTests() {
    setLoading(true);
    const { data } = await supabase
      .from("mock_tests")
      .select("*")
      .order("created_at", { ascending: false });
    setMockTests(data || []);
    setLoading(false);
  }

  async function loadTasks() {
    const { data } = await supabase
      .from("admin_tasks")
      .select("*")
      .order("task_type");
    setTasks(data || []);
  }

  async function loadTestTasks(testId: string) {
    setLoadingTestTasks(true);
    const { data } = await supabase
      .from("mock_test_tasks")
      .select("*, admin_tasks(*)")
      .eq("mock_test_id", testId)
      .order("order_number");
    setTestTasks(data || []);
    setLoadingTestTasks(false);
  }

  async function createMockTest() {
    if (!newTitle.trim()) {
      setMessage("Please enter a title.");
      return;
    }
    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase
      .from("mock_tests")
      .insert({
        title: newTitle,
        description: newDescription,
        time_limit_minutes: newTimeLimit,
        created_by: session?.user?.id
      });

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Mock test created!");
      setNewTitle("");
      setNewDescription("");
      setNewTimeLimit(120);
      setShowCreateForm(false);
      loadMockTests();
    }
    setCreating(false);
    setTimeout(() => setMessage(""), 3000);
  }

  async function togglePublish(test: MockTest) {
    const { error } = await supabase
      .from("mock_tests")
      .update({ is_published: !test.is_published })
      .eq("id", test.id);

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage(test.is_published ? "Test unpublished!" : "Test published!");
      loadMockTests();
    }
    setTimeout(() => setMessage(""), 3000);
  }

  async function deleteTest(testId: string) {
    if (!confirm("Delete this mock test? This cannot be undone.")) return;
    const { error } = await supabase
      .from("mock_tests")
      .delete()
      .eq("id", testId);

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Mock test deleted!");
      if (selectedTest?.id === testId) setSelectedTest(null);
      loadMockTests();
    }
    setTimeout(() => setMessage(""), 3000);
  }

  async function addTaskToTest() {
    if (!selectedTest || !selectedTaskId) return;

    const { error } = await supabase
      .from("mock_test_tasks")
      .insert({
        mock_test_id: selectedTest.id,
        task_id: selectedTaskId,
        order_number: testTasks.length + 1,
        section: selectedSection
      });

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Task added to test!");
      loadTestTasks(selectedTest.id);
      setSelectedTaskId("");
    }
    setTimeout(() => setMessage(""), 3000);
  }

  async function removeTaskFromTest(mockTestTaskId: string) {
    const { error } = await supabase
      .from("mock_test_tasks")
      .delete()
      .eq("id", mockTestTaskId);

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Task removed!");
      if (selectedTest) loadTestTasks(selectedTest.id);
    }
    setTimeout(() => setMessage(""), 3000);
  }

  function openTest(test: MockTest) {
    setSelectedTest(test);
    loadTestTasks(test.id);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Mock Test Management</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition"
        >
          + Create Mock Test
        </button>
      </div>

      {message && (
        <div className={`rounded-lg p-3 mb-4 text-sm ${
          message.includes("Error")
            ? "bg-red-50 text-red-700"
            : "bg-green-50 text-green-700"
        }`}>
          {message}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Create New Mock Test</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. CELPIP Full Mock Test 1"
                className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Limit (minutes)
              </label>
              <input
                type="number"
                value={newTimeLimit}
                onChange={e => setNewTimeLimit(Number(e.target.value))}
                className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              placeholder="Brief description of this mock test..."
              className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 h-24 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={createMockTest}
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Test"}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Mock Tests List */}
        <div>
          <h2 className="text-lg font-bold text-gray-700 mb-4">
            All Mock Tests ({mockTests.length})
          </h2>
          <div className="space-y-3">
            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : mockTests.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400">
                <p className="text-4xl mb-2">📋</p>
                <p>No mock tests yet.</p>
                <p className="text-sm mt-1">Create your first test above!</p>
              </div>
            ) : mockTests.map(test => (
              <div
                key={test.id}
                className={`bg-white rounded-xl shadow p-4 cursor-pointer transition ${
                  selectedTest?.id === test.id
                    ? "border-2 border-blue-500"
                    : "border-2 border-transparent hover:border-gray-200"
                }`}
                onClick={() => openTest(test)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-800">{test.title}</h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    test.is_published
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {test.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                {test.description && (
                  <p className="text-sm text-gray-500 mb-3">{test.description}</p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">
                    {test.time_limit_minutes} min
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); togglePublish(test); }}
                      className={`text-xs px-2 py-1 rounded-lg transition ${
                        test.is_published
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {test.is_published ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteTest(test.id); }}
                      className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg hover:bg-red-200 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Tasks Panel */}
        <div>
          {selectedTest ? (
            <div>
              <h2 className="text-lg font-bold text-gray-700 mb-4">
                Tasks in: {selectedTest.title}
              </h2>

              {/* Add Task Form */}
              <div className="bg-white rounded-xl shadow p-4 mb-4">
                <h3 className="font-semibold text-gray-700 mb-3">Add Task</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Section</label>
                    <select
                      value={selectedSection}
                      onChange={e => setSelectedSection(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="Writing">Writing</option>
                      <option value="Reading">Reading</option>
                      <option value="Speaking">Speaking</option>
                      <option value="Listening">Listening</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Task</label>
                    <select
                      value={selectedTaskId}
                      onChange={e => setSelectedTaskId(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Select a task...</option>
                      {tasks
                        .filter(t => t.task_type.includes(selectedSection))
                        .map(t => (
                          <option key={t.id} value={t.id}>
                            {t.task_type} — {t.title?.slice(0, 40) || "No title"}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={addTaskToTest}
                  disabled={!selectedTaskId}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 text-sm"
                >
                  Add Task to Test
                </button>
              </div>

              {/* Tasks in Test */}
              <div className="space-y-2">
                {loadingTestTasks ? (
                  <p className="text-gray-400 text-sm">Loading tasks...</p>
                ) : testTasks.length === 0 ? (
                  <div className="bg-white rounded-xl shadow p-4 text-center text-gray-400 text-sm">
                    No tasks added yet. Add tasks from the panel above.
                  </div>
                ) : testTasks.map((mt, index) => (
                  <div key={mt.id} className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-bold text-sm w-6">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-700 text-sm">
                          {mt.admin_tasks?.task_type}
                        </p>
                        <p className="text-xs text-gray-400">
                          {mt.admin_tasks?.title?.slice(0, 50) || "No title"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        mt.section === "Writing" ? "bg-blue-100 text-blue-700" :
                        mt.section === "Reading" ? "bg-green-100 text-green-700" :
                        mt.section === "Speaking" ? "bg-purple-100 text-purple-700" :
                        "bg-orange-100 text-orange-700"
                      }`}>
                        {mt.section}
                      </span>
                      <button
                        onClick={() => removeTaskFromTest(mt.id)}
                        className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg hover:bg-red-200 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
              <p className="text-4xl mb-3">👈</p>
              <p>Select a mock test to manage its tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}