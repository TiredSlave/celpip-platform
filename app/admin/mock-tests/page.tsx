"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  content: unknown;
};

type MockTestTask = {
  id: string;
  task_id: string;
  order_number: number;
  section: string;
  admin_tasks: Task;
};

const SKILL_SECTIONS = ["Listening", "Reading", "Writing", "Speaking"] as const;
type SkillSection = (typeof SKILL_SECTIONS)[number];

type GuidedKind = "full" | SkillSection | "custom";

type GuidedPick = {
  key: string;
  section: SkillSection;
  taskId: string;
  taskTypeLabel: string;
};

/** Strong contrast for native selects (options often inherit poorly on Windows). */
const SELECT_DARK =
  "w-full p-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 bg-white shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 " +
  "[color-scheme:light]";

type SequenceSlot = {
  section: SkillSection;
  /** Shown to admin as the current step. */
  stepTitle: string;
  /** Only tasks matching this slot (current sequence position), not the whole skill. */
  matches: (t: Task) => boolean;
};

const LISTENING_ORDER = [
  "Listening - Problem Solving",
  "Listening - Daily Life Conversation",
  "Listening - Listening for Information",
  "Listening - News Item",
  "Listening - Discussion",
  "Listening - Viewpoints",
] as const;

const READING_ORDER = [
  "Reading Correspondence",
  "Reading to Apply Information",
  "Reading for Information",
  "Reading for Viewpoints",
] as const;

const READING_ALIASES: Record<string, string[]> = {
  "Reading Correspondence": ["Task 1: Correspondence"],
  "Reading to Apply Information": ["Task 2: to Apply Information"],
  "Reading for Information": ["Task 3: Information"],
  "Reading for Viewpoints": ["Task 4: Viewpoints"],
};

const WRITING_ORDER = ["Writing Task 1", "Writing Task 2"] as const;

const SPEAKING_ORDER = ["Speaking Task 1", "Speaking Task 2", "Speaking Task 3", "Speaking Task 4", "Speaking Task 5", "Speaking Task 6", "Speaking Task 7", "Speaking Task 8"] as const;

function taskMatchesSlotType(t: Task, primary: string, aliases: readonly string[] = []): boolean {
  if (t.task_type === primary) return true;
  for (const a of aliases) {
    if (t.task_type === a) return true;
  }
  if (primary.startsWith("Listening -")) {
    const tail = primary.replace(/^Listening - /, "");
    return t.task_type.includes("Listening") && t.task_type.includes(tail);
  }
  return false;
}

function slotFromListeningType(type: (typeof LISTENING_ORDER)[number]): SequenceSlot {
  const short = type.replace("Listening - ", "");
  return {
    section: "Listening",
    stepTitle: `Listening — ${short}`,
    matches: t => taskMatchesSlotType(t, type),
  };
}

function slotFromReadingType(type: (typeof READING_ORDER)[number]): SequenceSlot {
  const aliases = READING_ALIASES[type] || [];
  return {
    section: "Reading",
    stepTitle: `Reading — ${type.replace(/^Reading /, "")}`,
    matches: t => taskMatchesSlotType(t, type, aliases),
  };
}

function slotFromWritingType(type: (typeof WRITING_ORDER)[number]): SequenceSlot {
  return {
    section: "Writing",
    stepTitle: type,
    matches: t => t.task_type === type,
  };
}

function slotFromSpeakingType(type: (typeof SPEAKING_ORDER)[number]): SequenceSlot {
  return {
    section: "Speaking",
    stepTitle: type,
    matches: t => t.task_type === type,
  };
}

function getSequenceForKind(kind: GuidedKind): SequenceSlot[] | null {
  if (kind === "custom") return null;
  if (kind === "full") {
    return [
      ...LISTENING_ORDER.map(slotFromListeningType),
      ...READING_ORDER.map(slotFromReadingType),
      ...WRITING_ORDER.map(slotFromWritingType),
      ...SPEAKING_ORDER.map(slotFromSpeakingType),
    ];
  }
  if (kind === "Listening") return LISTENING_ORDER.map(slotFromListeningType);
  if (kind === "Reading") return READING_ORDER.map(slotFromReadingType);
  if (kind === "Writing") return WRITING_ORDER.map(slotFromWritingType);
  if (kind === "Speaking") return SPEAKING_ORDER.map(slotFromSpeakingType);
  return [];
}

function tasksForSlot(tasks: Task[], slot: SequenceSlot): Task[] {
  return tasks.filter(slot.matches);
}

function inferSectionFromTaskType(taskType: string): SkillSection {
  if (taskType.includes("Listening")) return "Listening";
  if (taskType.includes("Speaking")) return "Speaking";
  if (taskType.includes("Writing")) return "Writing";
  const readingAliases = Object.values(READING_ALIASES).flat();
  if (
    taskType.includes("Reading") ||
    (READING_ORDER as readonly string[]).includes(taskType) ||
    readingAliases.includes(taskType)
  ) {
    return "Reading";
  }
  return "Reading";
}

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildAutoRecordName(picks: { section: string }[]): string {
  const counts: Record<string, number> = {};
  return picks
    .map(p => {
      const key = p.section.trim().toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
      return `${key}-${counts[key]}`;
    })
    .join(".");
}

function uniqueSortedTaskTypes(tasks: Task[]): string[] {
  const s = new Set(tasks.map(t => t.task_type).filter(Boolean));
  return [...s].sort((a, b) => a.localeCompare(b));
}

export default function MockTestsPage() {
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [testTasks, setTestTasks] = useState<MockTestTask[]>([]);
  const [loadingTestTasks, setLoadingTestTasks] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTimeLimit, setNewTimeLimit] = useState(120);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedSection, setSelectedSection] = useState("Writing");

  const [showGuidedWizard, setShowGuidedWizard] = useState(false);
  const [guidedKind, setGuidedKind] = useState<GuidedKind>("full");
  const [guidedPicks, setGuidedPicks] = useState<GuidedPick[]>([]);
  const [guidedPendingTaskId, setGuidedPendingTaskId] = useState("");
  const [guidedTimeLimit, setGuidedTimeLimit] = useState(180);
  const [guidedTitleOverride, setGuidedTitleOverride] = useState("");

  const [customTaskType, setCustomTaskType] = useState("");

  const sequence = useMemo(() => getSequenceForKind(guidedKind), [guidedKind]);

  const clearGuidedWizard = useCallback(() => {
    setGuidedPicks([]);
    setGuidedPendingTaskId("");
    setCustomTaskType("");
  }, []);

  useEffect(() => {
    loadMockTests();
    loadTasks();
  }, []);

  useEffect(() => {
    if (!showGuidedWizard) return;
    clearGuidedWizard();
  }, [guidedKind, showGuidedWizard, clearGuidedWizard]);

  const currentSlot = sequence && guidedPicks.length < sequence.length ? sequence[guidedPicks.length] : null;

  const choicesForCurrentStep = useMemo(() => {
    if (guidedKind === "custom") {
      if (!customTaskType) return [];
      return tasks.filter(t => t.task_type === customTaskType);
    }
    if (!currentSlot) return [];
    return tasksForSlot(tasks, currentSlot);
  }, [guidedKind, customTaskType, tasks, currentSlot]);

  const autoRecordName = useMemo(() => buildAutoRecordName(guidedPicks), [guidedPicks]);

  const sequenceComplete =
    guidedKind === "custom"
      ? guidedPicks.length >= 1
      : Boolean(sequence && guidedPicks.length === sequence.length);

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
        created_by: session?.user?.id,
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

  async function createGuidedMockTest() {
    if (guidedKind !== "custom" && sequence && guidedPicks.length !== sequence.length) {
      setMessage("Finish every step in order before creating the record.");
      setTimeout(() => setMessage(""), 4000);
      return;
    }
    if (guidedKind === "custom" && guidedPicks.length === 0) {
      setMessage("Add at least one task using the custom flow.");
      setTimeout(() => setMessage(""), 4000);
      return;
    }

    const slug = buildAutoRecordName(guidedPicks);
    const title = guidedTitleOverride.trim() || slug;
    const description = `Auto record: ${slug}`;

    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();

    const { data: inserted, error: testErr } = await supabase
      .from("mock_tests")
      .insert({
        title,
        description,
        time_limit_minutes: guidedTimeLimit,
        created_by: session?.user?.id,
      })
      .select("id")
      .single();

    if (testErr || !inserted) {
      setMessage("Error creating mock test: " + (testErr?.message || "unknown"));
      setCreating(false);
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    const rows = guidedPicks.map((p, i) => ({
      mock_test_id: inserted.id,
      task_id: p.taskId,
      order_number: i + 1,
      section: p.section,
    }));

    const { error: tasksErr } = await supabase.from("mock_test_tasks").insert(rows);

    if (tasksErr) {
      setMessage(
        "Mock test created but tasks failed: " + tasksErr.message + " — remove the empty test in the dashboard if needed."
      );
      await supabase.from("mock_tests").delete().eq("id", inserted.id);
    } else {
      setMessage(`Created mock test "${title}" (${slug}).`);
      setShowGuidedWizard(false);
      setGuidedTitleOverride("");
      loadMockTests();
      setSelectedTest(null);
    }
    setCreating(false);
    setTimeout(() => setMessage(""), 5000);
  }

  function addSequencedPick() {
    if (!guidedPendingTaskId || !currentSlot) return;
    const task = tasks.find(t => t.id === guidedPendingTaskId);
    if (!task) return;
    setGuidedPicks(prev => [
      ...prev,
      {
        key: newKey(),
        section: currentSlot.section,
        taskId: task.id,
        taskTypeLabel: task.task_type,
      },
    ]);
    setGuidedPendingTaskId("");
  }

  function addCustomPick() {
    if (!guidedPendingTaskId || !customTaskType) return;
    const task = tasks.find(t => t.id === guidedPendingTaskId);
    if (!task) return;
    const section = inferSectionFromTaskType(task.task_type);
    setGuidedPicks(prev => [
      ...prev,
      {
        key: newKey(),
        section,
        taskId: task.id,
        taskTypeLabel: task.task_type,
      },
    ]);
    setGuidedPendingTaskId("");
  }

  function removeLastPick() {
    setGuidedPicks(prev => prev.slice(0, -1));
    setGuidedPendingTaskId("");
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
    const { error } = await supabase.from("mock_tests").delete().eq("id", testId);

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

    const { error } = await supabase.from("mock_test_tasks").insert({
      mock_test_id: selectedTest.id,
      task_id: selectedTaskId,
      order_number: testTasks.length + 1,
      section: selectedSection,
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
    const { error } = await supabase.from("mock_test_tasks").delete().eq("id", mockTestTaskId);

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

  const singleSkillOptions: { value: SkillSection; label: string }[] = [
    { value: "Listening", label: "Listening only (6 parts in order)" },
    { value: "Reading", label: "Reading only (4 parts in order)" },
    { value: "Writing", label: "Writing only (2 tasks in order)" },
    { value: "Speaking", label: "Speaking only (8 tasks in order)" },
  ];

  const uniqueTypes = useMemo(() => uniqueSortedTaskTypes(tasks), [tasks]);

  const stepProgressText =
    guidedKind === "custom"
      ? `Custom — ${guidedPicks.length} task(s) added`
      : sequence
        ? `Step ${Math.min(guidedPicks.length + 1, sequence.length)} of ${sequence.length}`
        : "";

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Mock Test Management</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setShowGuidedWizard(v => !v);
              setShowCreateForm(false);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition"
          >
            {showGuidedWizard ? "Close guided builder" : "Guided mock test"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(v => !v);
              setShowGuidedWizard(false);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition"
          >
            + Manual create
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg p-3 mb-4 text-sm ${
            message.includes("Error") || message.includes("failed")
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      {showGuidedWizard && (
        <div className="bg-white rounded-xl shadow-lg border border-indigo-100 p-6 mb-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Guided mock test builder</h2>
            <p className="text-sm text-gray-700 mt-1">
              Add tasks <strong>one at a time</strong>. For each step, the task list is filtered to the{" "}
              <strong>current position in the sequence</strong> (for example only &quot;Listening — Problem Solving&quot; for
              part 1), not every listening task in your library.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Mock test type</label>
              <select
                value={guidedKind === "full" || guidedKind === "custom" ? guidedKind : guidedKind}
                onChange={e => {
                  const v = e.target.value;
                  if (v === "full" || v === "custom") setGuidedKind(v);
                  else setGuidedKind(v as SkillSection);
                }}
                className={SELECT_DARK}
              >
                <option value="full">Full CELPIP sequence (20 steps: L6 → R4 → W2 → S8)</option>
                {singleSkillOptions.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
                <option value="custom">Custom — choose exact task type, then one task per step</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Time limit (minutes)</label>
              <input
                type="number"
                min={1}
                value={guidedTimeLimit}
                onChange={e => setGuidedTimeLimit(Number(e.target.value) || 120)}
                className={SELECT_DARK}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Display title (optional)</label>
            <input
              type="text"
              value={guidedTitleOverride}
              onChange={e => setGuidedTitleOverride(e.target.value)}
              placeholder={autoRecordName || "Uses auto record name when empty"}
              className={SELECT_DARK}
            />
            <p className="text-xs text-gray-600 mt-1">
              Auto record name: <code className="bg-gray-100 px-1 rounded text-gray-900">{autoRecordName || "—"}</code>
            </p>
          </div>

          {/* Chosen so far */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold text-gray-900">Chosen order ({guidedPicks.length})</p>
              <p className="text-xs font-medium text-gray-700">{stepProgressText}</p>
            </div>
            {guidedPicks.length === 0 ? (
              <p className="text-sm text-gray-600">No tasks yet. Use the current step below.</p>
            ) : (
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-900">
                {guidedPicks.map((p, i) => (
                  <li key={p.key}>
                    <span className="font-medium">{p.section}</span> — {p.taskTypeLabel}{" "}
                    <span className="text-gray-600">({(tasks.find(t => t.id === p.taskId)?.title || "").slice(0, 56) || "Untitled"})</span>
                  </li>
                ))}
              </ol>
            )}
            {guidedPicks.length > 0 && (
              <button
                type="button"
                onClick={removeLastPick}
                className="mt-3 text-sm text-indigo-800 font-medium hover:underline"
              >
                Undo last task
              </button>
            )}
          </div>

          {/* Current step — one dropdown */}
          <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
            <p className="text-sm font-bold text-gray-900">Current step</p>

            {guidedKind === "custom" ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">1. Task type (exact match in your library)</label>
                  <select
                    value={customTaskType}
                    onChange={e => {
                      setCustomTaskType(e.target.value);
                      setGuidedPendingTaskId("");
                    }}
                    className={SELECT_DARK}
                  >
                    <option value="">Select task type…</option>
                    {uniqueTypes.map(ty => (
                      <option key={ty} value={ty}>
                        {ty}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">2. Task for this type only</label>
                  <select
                    value={guidedPendingTaskId}
                    onChange={e => setGuidedPendingTaskId(e.target.value)}
                    disabled={!customTaskType}
                    className={SELECT_DARK + " disabled:opacity-50"}
                  >
                    <option value="">Select task…</option>
                    {choicesForCurrentStep.map(t => (
                      <option key={t.id} value={t.id}>
                        {(t.title || "Untitled").slice(0, 72)}
                      </option>
                    ))}
                  </select>
                  {customTaskType && choicesForCurrentStep.length === 0 && (
                    <p className="text-xs text-amber-800 mt-1 font-medium">
                      No admin tasks with this exact task_type. Generate one in Tasks first.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!guidedPendingTaskId}
                  onClick={addCustomPick}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  Add this task to the mock
                </button>
              </>
            ) : currentSlot ? (
              <>
                <p className="text-sm text-gray-900 font-medium">{currentSlot.stepTitle}</p>
                <p className="text-xs text-gray-700">
                  Only tasks that match this part are listed ({choicesForCurrentStep.length} available).
                </p>
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">Select one task</label>
                  <select
                    value={guidedPendingTaskId}
                    onChange={e => setGuidedPendingTaskId(e.target.value)}
                    className={SELECT_DARK}
                  >
                    <option value="">Choose task…</option>
                    {choicesForCurrentStep.map(t => (
                      <option key={t.id} value={t.id}>
                        {(t.title || "Untitled").slice(0, 80)}
                      </option>
                    ))}
                  </select>
                  {choicesForCurrentStep.length === 0 && (
                    <p className="text-xs text-amber-800 mt-1 font-medium">
                      No task in the library for this slot yet. Create a matching task in Tasks, then refresh this page.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!guidedPendingTaskId}
                  onClick={addSequencedPick}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  Add and go to next step
                </button>
              </>
            ) : (
              <p className="text-sm font-medium text-green-800">All steps complete. Review the list above, then create the record.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              disabled={creating || !sequenceComplete}
              onClick={() => void createGuidedMockTest()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50"
            >
              {creating ? "Saving…" : "Create mock test record"}
            </button>
            <button
              type="button"
              onClick={clearGuidedWizard}
              className="text-gray-800 text-sm px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-medium"
            >
              Clear all picks
            </button>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Create mock test (manual)</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. CELPIP Full Mock Test 1"
                className={SELECT_DARK}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes)</label>
              <input
                type="number"
                value={newTimeLimit}
                onChange={e => setNewTimeLimit(Number(e.target.value))}
                className={SELECT_DARK}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              placeholder="Brief description of this mock test..."
              className={`${SELECT_DARK} h-24 resize-none`}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void createMockTest()}
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Test"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-bold text-gray-700 mb-4">All Mock Tests ({mockTests.length})</h2>
          <div className="space-y-3">
            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : mockTests.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400">
                <p className="text-4xl mb-2">📋</p>
                <p>No mock tests yet.</p>
                <p className="text-sm mt-1">Use Guided mock test or Manual create.</p>
              </div>
            ) : (
              mockTests.map(test => (
                <div
                  key={test.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") openTest(test);
                  }}
                  className={`bg-white rounded-xl shadow p-4 cursor-pointer transition ${
                    selectedTest?.id === test.id
                      ? "border-2 border-blue-500"
                      : "border-2 border-transparent hover:border-gray-200"
                  }`}
                  onClick={() => openTest(test)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800">{test.title}</h3>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        test.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {test.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                  {test.description && <p className="text-sm text-gray-500 mb-3">{test.description}</p>}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">{test.time_limit_minutes} min</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          void togglePublish(test);
                        }}
                        className={`text-xs px-2 py-1 rounded-lg transition ${
                          test.is_published
                            ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        {test.is_published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          void deleteTest(test.id);
                        }}
                        className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg hover:bg-red-200 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          {selectedTest ? (
            <div>
              <h2 className="text-lg font-bold text-gray-700 mb-4">Tasks in: {selectedTest.title}</h2>

              <div className="bg-white rounded-xl shadow p-4 mb-4">
                <h3 className="font-semibold text-gray-700 mb-3">Add Task</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-medium">Section</label>
                    <select
                      value={selectedSection}
                      onChange={e => setSelectedSection(e.target.value)}
                      className={SELECT_DARK}
                    >
                      <option value="Writing">Writing</option>
                      <option value="Reading">Reading</option>
                      <option value="Speaking">Speaking</option>
                      <option value="Listening">Listening</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-medium">Task</label>
                    <select
                      value={selectedTaskId}
                      onChange={e => setSelectedTaskId(e.target.value)}
                      className={SELECT_DARK}
                    >
                      <option value="">Select a task...</option>
                      {tasks
                        .filter(t => t.task_type.includes(selectedSection))
                        .map(t => (
                          <option key={t.id} value={t.id}>
                            {t.task_type} — {(t.title || "").slice(0, 40) || "No title"}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void addTaskToTest()}
                  disabled={!selectedTaskId}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 text-sm"
                >
                  Add Task to Test
                </button>
              </div>

              <div className="space-y-2">
                {loadingTestTasks ? (
                  <p className="text-gray-400 text-sm">Loading tasks...</p>
                ) : testTasks.length === 0 ? (
                  <div className="bg-white rounded-xl shadow p-4 text-center text-gray-400 text-sm">
                    No tasks added yet. Add tasks from the panel above.
                  </div>
                ) : (
                  testTasks.map((mt, index) => (
                    <div key={mt.id} className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-bold text-sm w-6">{index + 1}</span>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{mt.admin_tasks?.task_type}</p>
                          <p className="text-xs text-gray-600">{(mt.admin_tasks?.title || "").slice(0, 50) || "No title"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full ${
                            mt.section === "Writing"
                              ? "bg-blue-100 text-blue-700"
                              : mt.section === "Reading"
                                ? "bg-green-100 text-green-700"
                                : mt.section === "Speaking"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {mt.section}
                        </span>
                        <button
                          type="button"
                          onClick={() => void removeTaskFromTest(mt.id)}
                          className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg hover:bg-red-200 transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
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
