"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  MOCK_TEST_SKILLS,
  type MockTestSkill,
  getAdminSequenceForSkill,
  tasksForSlot,
  type MockTestTaskRow,
} from "../../lib/mock-test-types";
import {
  collapseSpeakingFullIds,
  expandSpeakingAdminPicks,
  findPairedSpeakingTask4,
  formatSpeaking34PickLabel,
  isSpeakingPair34Slot,
  speakingTask3WithPairChoices,
  type SpeakingTaskRow,
} from "../../lib/speaking-task-pairs";

type MockTest = {
  id: string;
  title: string;
  description: string | null;
  test_type: MockTestSkill | null;
  is_published: boolean;
  time_limit_minutes: number;
  created_at: string;
  mock_test_tasks?: { count: number }[];
};

type Task = SpeakingTaskRow & { id: string; difficulty?: string };

type MockTestTask = {
  id: string;
  task_id: string;
  order_number: number;
  section: string;
  admin_tasks: Task;
};

type GuidedPick = { key: string; taskId: string; taskTypeLabel: string };

const SELECT_DARK =
  "w-full p-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 bg-white shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 [color-scheme:light]";

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const SKILL_LABELS: Record<MockTestSkill, string> = {
  Listening: "Listening only (6 parts in order)",
  Reading: "Reading only (4 parts in order)",
  Writing: "Writing only (2 tasks in order)",
  Speaking: "Speaking only (7 picks — Task 3 auto-includes paired Task 4)",
};

export default function MockTestsPage() {
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignedTaskIds, setAssignedTaskIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const [showBuilder, setShowBuilder] = useState(false);
  const [skill, setSkill] = useState<MockTestSkill>("Reading");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState(60);
  const [picks, setPicks] = useState<GuidedPick[]>([]);
  const [pendingTaskId, setPendingTaskId] = useState("");

  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [testTasks, setTestTasks] = useState<MockTestTask[]>([]);
  const [loadingTestTasks, setLoadingTestTasks] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTimeLimit, setEditTimeLimit] = useState(60);
  const [editTaskIds, setEditTaskIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const sequence = useMemo(() => getAdminSequenceForSkill(skill), [skill]);
  const currentSlot = picks.length < sequence.length ? sequence[picks.length] : null;

  const availableTasks = useMemo(() => {
    return tasks.filter(t => !assignedTaskIds.has(t.id));
  }, [tasks, assignedTaskIds]);

  const choicesForStep = useMemo(() => {
    if (!currentSlot) return [];
    if (skill === "Speaking" && isSpeakingPair34Slot(currentSlot)) {
      return speakingTask3WithPairChoices(availableTasks, assignedTaskIds);
    }
    return tasksForSlot(availableTasks, currentSlot);
  }, [availableTasks, currentSlot, skill]);

  const sequenceComplete = picks.length === sequence.length;

  const editSkill = selectedTest?.test_type as MockTestSkill | null;
  const editSequence = useMemo(
    () => (editSkill ? getAdminSequenceForSkill(editSkill) : []),
    [editSkill],
  );

  const thisMockTaskIds = useMemo(
    () => new Set(testTasks.map(mt => mt.task_id)),
    [testTasks],
  );

  const assignedElsewhere = useMemo(() => {
    const s = new Set(assignedTaskIds);
    for (const id of thisMockTaskIds) s.delete(id);
    return s;
  }, [assignedTaskIds, thisMockTaskIds]);

  function tasksSelectableForEditSlot(slotIndex: number): Task[] {
    if (!editSkill || !editSequence[slotIndex]) return [];
    const slot = editSequence[slotIndex];
    const blocked = new Set(assignedElsewhere);
    for (let i = 0; i < editTaskIds.length; i++) {
      if (i !== slotIndex && editTaskIds[i]) blocked.add(editTaskIds[i]);
    }
    if (editSkill === "Speaking" && isSpeakingPair34Slot(slot)) {
      const currentId = editTaskIds[slotIndex];
      if (currentId) blocked.delete(currentId);
      const pool = tasks.filter(t => !blocked.has(t.id) || t.id === currentId);
      let opts = speakingTask3WithPairChoices(pool, blocked);
      if (currentId && !opts.some(t => t.id === currentId)) {
        const cur = tasks.find(t => t.id === currentId);
        if (cur) opts = [cur, ...opts];
      }
      return opts;
    }
    return tasks.filter(t => {
      if (!slot.matches(t)) return false;
      const id = t.id;
      if (editTaskIds[slotIndex] === id) return true;
      if (editTaskIds.some((picked, i) => i !== slotIndex && picked === id)) return false;
      if (!assignedElsewhere.has(id)) return true;
      return false;
    });
  }

  const editTasksComplete =
    editSequence.length > 0 &&
    editTaskIds.length === editSequence.length &&
    editTaskIds.every(id => Boolean(id));

  const resetBuilder = useCallback(() => {
    setPicks([]);
    setPendingTaskId("");
    setTitle("");
    setDescription("");
  }, []);

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!showBuilder) return;
    resetBuilder();
  }, [skill, showBuilder, resetBuilder]);

  async function authHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session?.access_token || ""}`,
      "Content-Type": "application/json",
    };
  }

  async function loadAll() {
    setLoading(true);
    const headers = await authHeaders();
    const res = await fetch("/api/admin/mock-tests", { headers });
    if (res.ok) {
      const json = await res.json();
      setMockTests(json.tests || []);
      setAssignedTaskIds(new Set(json.assignedTaskIds || []));
    } else {
      const { data } = await supabase.from("mock_tests").select("*").order("created_at", { ascending: true });
      setMockTests(data || []);
    }

    const { data: taskRows } = await supabase.from("admin_tasks").select("*").order("task_type");
    setTasks(taskRows || []);
    setLoading(false);
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
    if (!title.trim()) {
      setMessage("Please enter a title for this mock test.");
      return;
    }
    if (!sequenceComplete) {
      setMessage(`Select all ${sequence.length} tasks in order before creating.`);
      return;
    }

    if (skill === "Speaking") {
      const expanded = expandSpeakingAdminPicks(
        picks.map(p => p.taskId),
        tasks,
      );
      if (!expanded.ok) {
        setMessage("Error: " + expanded.error);
        return;
      }
    }

    setCreating(true);
    const headers = await authHeaders();
    const res = await fetch("/api/admin/mock-tests", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        test_type: skill,
        time_limit_minutes: timeLimit,
        task_ids: picks.map(p => p.taskId),
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage("Error: " + (json.error || res.statusText));
    } else {
      setMessage(`Created mock test "${title.trim()}".`);
      setShowBuilder(false);
      resetBuilder();
      await loadAll();
      setSelectedTest(null);
    }
    setCreating(false);
    setTimeout(() => setMessage(""), 5000);
  }

  function addPick() {
    if (!pendingTaskId || !currentSlot) return;
    const task = tasks.find(t => t.id === pendingTaskId);
    if (!task) return;

    if (skill === "Speaking" && isSpeakingPair34Slot(currentSlot)) {
      const pair = findPairedSpeakingTask4(task, tasks);
      if (!pair) {
        setMessage(
          "Error: This Speaking Task 3 has no paired Task 4. Open it in Tasks → Create paired Task 4, or generate a new 3+4 pair.",
        );
        setTimeout(() => setMessage(""), 6000);
        return;
      }
      setPicks(prev => [
        ...prev,
        {
          key: newKey(),
          taskId: task.id,
          taskTypeLabel: formatSpeaking34PickLabel(task, pair),
        },
      ]);
    } else {
      setPicks(prev => [
        ...prev,
        { key: newKey(), taskId: task.id, taskTypeLabel: task.task_type },
      ]);
    }
    setPendingTaskId("");
  }

  function undoLastPick() {
    setPicks(prev => prev.slice(0, -1));
    setPendingTaskId("");
  }

  async function togglePublish(test: MockTest) {
    const { error } = await supabase
      .from("mock_tests")
      .update({ is_published: !test.is_published })
      .eq("id", test.id);
    setMessage(error ? "Error: " + error.message : test.is_published ? "Unpublished." : "Published.");
    await loadAll();
    setTimeout(() => setMessage(""), 3000);
  }

  async function deleteTest(testId: string) {
    if (!confirm("Delete this mock test? Tasks will become available for other mocks.")) return;
    const { error } = await supabase.from("mock_tests").delete().eq("id", testId);
    setMessage(error ? "Error: " + error.message : "Mock test deleted.");
    if (selectedTest?.id === testId) setSelectedTest(null);
    await loadAll();
    setTimeout(() => setMessage(""), 3000);
  }

  function openTest(test: MockTest) {
    setSelectedTest(test);
    setEditing(false);
    void loadTestTasks(test.id);
  }

  function startEditing() {
    if (!selectedTest?.test_type) {
      setMessage("Error: This mock has no skill type set. Recreate it or set test_type in Supabase.");
      return;
    }
    const ordered = [...testTasks].sort((a, b) => a.order_number - b.order_number);
    const fullIds = ordered.map(mt => mt.task_id);
    setEditTitle(selectedTest.title);
    setEditDescription(selectedTest.description || "");
    setEditTimeLimit(selectedTest.time_limit_minutes);
    setEditTaskIds(
      selectedTest.test_type === "Speaking"
        ? collapseSpeakingFullIds(fullIds, tasks)
        : fullIds,
    );
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  function setEditSlotTask(slotIndex: number, taskId: string) {
    setEditTaskIds(prev => {
      const next = [...prev];
      while (next.length <= slotIndex) next.push("");
      next[slotIndex] = taskId;
      return next;
    });
  }

  async function saveEdit() {
    if (!selectedTest || !editTitle.trim()) {
      setMessage("Title is required.");
      return;
    }
    if (!editTasksComplete) {
      setMessage("Select a task for every part.");
      return;
    }

    if (selectedTest.test_type === "Speaking") {
      const expanded = expandSpeakingAdminPicks(editTaskIds, tasks);
      if (!expanded.ok) {
        setMessage("Error: " + expanded.error);
        return;
      }
    }

    setSavingEdit(true);
    const headers = await authHeaders();
    const res = await fetch(`/api/admin/mock-tests/${selectedTest.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        time_limit_minutes: editTimeLimit,
        task_ids: editTaskIds,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage("Error: " + (json.error || res.statusText));
    } else {
      setMessage("Mock test updated.");
      setEditing(false);
      if (json.test) {
        setSelectedTest(json.test);
        setTestTasks(json.test.mock_test_tasks || []);
      } else {
        await loadTestTasks(selectedTest.id);
      }
      await loadAll();
    }
    setSavingEdit(false);
    setTimeout(() => setMessage(""), 5000);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Mock Test Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Each mock is one skill only. Pick tasks from the library. Select a mock to edit its tasks anytime.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowBuilder(v => !v)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition"
        >
          {showBuilder ? "Close builder" : "+ New mock test"}
        </button>
      </div>

      {message && (
        <div
          className={`rounded-lg p-3 mb-4 text-sm ${
            message.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      {showBuilder && (
        <div className="bg-white rounded-xl shadow-lg border border-indigo-100 p-6 mb-8 space-y-5">
          <h2 className="text-lg font-bold text-gray-900">Create mock test</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Skill (one type per mock)</label>
              <select
                value={skill}
                onChange={e => setSkill(e.target.value as MockTestSkill)}
                className={SELECT_DARK}
              >
                {MOCK_TEST_SKILLS.map(s => (
                  <option key={s} value={s}>
                    {SKILL_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Time limit (minutes)</label>
              <input
                type="number"
                min={1}
                value={timeLimit}
                onChange={e => setTimeLimit(Number(e.target.value) || 60)}
                className={SELECT_DARK}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Title (required)</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Reading Mock — March 2026"
              className={SELECT_DARK}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`${SELECT_DARK} h-20 resize-none`}
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">
              Chosen tasks ({picks.length} / {sequence.length})
            </p>
            {picks.length === 0 ? (
              <p className="text-sm text-gray-600">Use the step below to add tasks in exam order.</p>
            ) : (
              <ol className="list-decimal list-inside text-sm text-gray-900 space-y-1">
                {picks.map((p, i) => (
                  <li key={p.key}>
                    {sequence[i]?.stepTitle || `Step ${i + 1}`} — {p.taskTypeLabel}
                  </li>
                ))}
              </ol>
            )}
            {picks.length > 0 && (
              <button type="button" onClick={undoLastPick} className="mt-2 text-sm text-indigo-800 font-medium hover:underline">
                Undo last
              </button>
            )}
          </div>

          {currentSlot ? (
            <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
              <p className="text-sm font-bold text-gray-900">{currentSlot.stepTitle}</p>
              <p className="text-xs text-gray-700">
                {isSpeakingPair34Slot(currentSlot)
                  ? "Select Speaking Task 3 only — the matching Task 4 is added automatically."
                  : `${choicesForStep.length} available in library (tasks already used in another mock are hidden).`}
              </p>
              <select value={pendingTaskId} onChange={e => setPendingTaskId(e.target.value)} className={SELECT_DARK}>
                <option value="">Select task…</option>
                {choicesForStep.map(t => (
                  <option key={t.id} value={t.id}>
                    {(t.title || "Untitled").slice(0, 80)}
                  </option>
                ))}
              </select>
              {choicesForStep.length === 0 && (
                <p className="text-xs text-amber-800 font-medium">
                  {isSpeakingPair34Slot(currentSlot)
                    ? "No Speaking Task 3 with a paired Task 4 is available. Use Tasks → Generate Task 3+4 pair, or free a pair from another mock."
                    : "No free task for this slot. Generate one in Tasks or remove it from another mock."}
                </p>
              )}
              <button
                type="button"
                disabled={!pendingTaskId}
                onClick={addPick}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                Add and continue
              </button>
            </div>
          ) : (
            <p className="text-sm font-medium text-green-800">All steps selected. Click Create mock test.</p>
          )}

          <button
            type="button"
            disabled={creating || !title.trim() || !sequenceComplete}
            onClick={() => void createMockTest()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {creating ? "Saving…" : "Create mock test"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-bold text-gray-700 mb-4">All mock tests ({mockTests.length})</h2>
          {loading ? (
            <p className="text-gray-600">Loading…</p>
          ) : mockTests.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
              <p>No mock tests yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mockTests.map(test => (
                <div
                  key={test.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") openTest(test);
                  }}
                  onClick={() => openTest(test)}
                  className={`bg-white rounded-xl shadow p-4 cursor-pointer transition ${
                    selectedTest?.id === test.id ? "border-2 border-blue-500" : "border-2 border-transparent hover:border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-bold text-gray-800">{test.title}</h3>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${
                        test.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {test.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                  {test.test_type && (
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {test.test_type}
                    </span>
                  )}
                  {test.description && <p className="text-sm text-gray-600 mt-2">{test.description}</p>}
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-gray-600">{test.time_limit_minutes} min</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          void togglePublish(test);
                        }}
                        className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                      >
                        {test.is_published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          void deleteTest(test.id);
                        }}
                        className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {selectedTest ? (
            <div>
              <div className="flex justify-between items-center mb-4 gap-2">
                <h2 className="text-lg font-bold text-gray-700">{editing ? "Edit mock test" : `Tasks: ${selectedTest.title}`}</h2>
                {!editing && selectedTest.test_type && (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg shrink-0"
                  >
                    Edit details & tasks
                  </button>
                )}
              </div>

              {editing && editSkill ? (
                <div className="bg-white rounded-xl shadow p-5 space-y-4 border border-indigo-100">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className={SELECT_DARK}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      className={`${SELECT_DARK} h-16 resize-none`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Time limit (minutes)</label>
                    <input
                      type="number"
                      min={1}
                      value={editTimeLimit}
                      onChange={e => setEditTimeLimit(Number(e.target.value) || 60)}
                      className={SELECT_DARK}
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    Skill: <strong>{editSkill}</strong> (cannot change). Replace tasks per part below.
                  </p>
                  <div className="space-y-3">
                    {editSequence.map((slot, index) => {
                      const options = tasksSelectableForEditSlot(index);
                      return (
                        <div key={slot.stepTitle} className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                          <p className="text-xs font-semibold text-gray-800 mb-2">
                            {index + 1}. {slot.stepTitle}
                          </p>
                          <select
                            value={editTaskIds[index] || ""}
                            onChange={e => setEditSlotTask(index, e.target.value)}
                            className={SELECT_DARK}
                          >
                            <option value="">Select task…</option>
                            {options.map(t => (
                              <option key={t.id} value={t.id}>
                                {(t.title || "Untitled").slice(0, 72)}
                              </option>
                            ))}
                          </select>
                          {options.length === 0 && (
                            <p className="text-xs text-amber-800 mt-1">
                              {isSpeakingPair34Slot(slot)
                                ? "No Task 3 with a paired Task 4 available. Generate a 3+4 pair in Tasks first."
                                : "No available task for this slot."}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={savingEdit || !editTitle.trim() || !editTasksComplete}
                      onClick={() => void saveEdit()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                    >
                      {savingEdit ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="text-gray-700 font-medium px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : loadingTestTasks ? (
                <p className="text-gray-600 text-sm">Loading…</p>
              ) : testTasks.length === 0 ? (
                <p className="text-sm text-gray-600">No tasks linked.</p>
              ) : (
                <div className="space-y-2">
                  {testTasks.map((mt, index) => (
                    <div key={mt.id} className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
                      <span className="text-gray-600 font-bold text-sm w-6">{index + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{mt.admin_tasks?.task_type}</p>
                        <p className="text-xs text-gray-600">{mt.admin_tasks?.title || "Untitled"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-600">
              <p>Select a mock test to view its tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
