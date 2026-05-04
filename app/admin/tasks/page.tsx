"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Task = {
  id: string;
  task_type: string;
  difficulty: string;
  title: string;
  content: any;
  created_at: string;
};


export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [generatingPair, setGeneratingPair] = useState(false);
  const [pairType, setPairType] = useState("3+4");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskType, setTaskType] = useState("Writing Task 1");
  const [difficulty, setDifficulty] = useState("medium");
  const [selectedSection, setSelectedSection] = useState("Writing");
  const [sequenceNumber, setSequenceNumber] = useState(1);
  const [selectedModule, setSelectedModule] = useState("");

  const taskTypes = [
  "Writing Task 1",
  "Writing Task 2",
  "Reading for Information",
  "Reading for Viewpoints",
  "Reading Correspondence",
  "Reading to Apply Information",
  "Speaking Task 1",
  "Speaking Task 2",
  "Speaking Task 3",
  "Speaking Task 4",
  "Speaking Task 5",
  "Speaking Task 6",
  "Speaking Task 7",
  "Speaking Task 8",
  "Listening - Daily Life Conversation",
  "Listening - Workplace Discussion",
  "Listening - Phone Conversation",
  "Listening - News Report",
  "Listening - Announcement",
  "Listening - Interview"
];

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase
      .from("admin_tasks")
      .select("*")
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }

  async function generateAndSaveTask() {
  console.log("Generating:", taskType, difficulty);
  setGenerating(true);
  setMessage(""); 
  try {
    const { data: { session } } = await supabase.auth.getSession();

    let endpoint = "";
    let body: any = {};
    let title = "";

    if (taskType === "Writing Task 1" || taskType === "Writing Task 2") {
      endpoint = "/api/admin/tasks/generate";
      body = { taskType };
    } else if (taskType.includes("Reading")) {
      endpoint = "/api/admin/reading/generate";
      body = { readingType: taskType };
    } else if (taskType.includes("Speaking")) {
      const taskNum = parseInt(taskType.split(" ")[2]) || 1;
      endpoint = "/api/admin/speaking/generate";
      body = { taskNumber: taskNum };
    } else if (taskType.includes("Listening")) {
      endpoint = "/api/admin/listening/generate";
      const listeningType = taskType.replace("Listening - ", "") || "Daily Life Conversation";
      body = { listeningType };
    }

    console.log("Endpoint:", endpoint, "Body:", body);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const taskContent = await res.json();
    console.log("Generated:", taskContent);

    if (taskContent.error) {
      setMessage("Error: " + taskContent.error);
      setGenerating(false);
      return;
    }

    // Extract title based on task type
    if (taskType.includes("Writing")) {
      title = taskContent.scenario?.slice(0, 80) || taskType;
    } else if (taskType.includes("Reading")) {
      title = taskContent.title || taskType;
    } else if (taskType.includes("Speaking")) {
      title = taskContent.situation?.slice(0, 80) || taskType;
    } else if (taskType === "Listening") {
      title = taskContent.title || taskType;
    }

    const { error } = await supabase
      .from("admin_tasks")
      .insert({
        task_type: taskType,
        difficulty,
        title,
        content: taskContent,
        created_by: session?.user?.id,
        section: selectedSection,
        sequence_number: sequenceNumber
      });

    if (error) {
      setMessage("Error saving: " + error.message);
    } else {
      setMessage("Task saved successfully!");
      loadTasks();
    }
  } catch (err) {
    console.error("Error:", err);
    setMessage("Something went wrong. Please try again.");
  }
  }
  async function generateTaskPair() {
    setGeneratingPair(true);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/speaking/generate-pair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + (session?.access_token || "")
        },
        body: JSON.stringify({ pairType, difficulty })
      });
      const data = await res.json();
      if (data.error) {
        setMessage("Error: " + data.error);
      } else {
        setMessage("Task " + pairType + " pair generated successfully!");
        loadTasks();
      }
    } catch (err) {
      setMessage("Something went wrong. Please try again.");
    }
    setGeneratingPair(false);
    setTimeout(() => setMessage(""), 5000);
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    const { error } = await supabase
      .from("admin_tasks")
      .delete()
      .eq("id", taskId);
    if (error) {
      setMessage("Error deleting task: " + error.message);
    } else {
      setMessage("Task deleted!");
      loadTasks();
    }
    setTimeout(() => setMessage(""), 3000);
  }

  const filteredTasks = tasks.filter(task =>
    filter === "all" || task.task_type.includes(filter)
  );

  function getTaskOptions(module: string) {
  const options: { value: string; label: string; description: string }[] = [];

  if (module === "Writing") {
    options.push(
      { value: "Writing Task 1", label: "Task 1 — Write an Email", description: "150 words, 27 minutes" },
      { value: "Writing Task 2", label: "Task 2 — Respond to Survey", description: "200 words, 26 minutes" }
    );
  } else if (module === "Reading") {
    options.push(
      { value: "Reading for Information", label: "Reading for Information", description: "Read and find specific info" },
      { value: "Reading for Viewpoints", label: "Reading for Viewpoints", description: "Understand opinions and views" },
      { value: "Reading Correspondence", label: "Reading Correspondence", description: "Read emails and letters" },
      { value: "Reading to Apply Information", label: "Reading to Apply Info", description: "Use info to complete a task" }
    );
  } else if (module === "Speaking") {
    options.push(
      { value: "Speaking Task 1", label: "Task 1 — Give Advice", description: "30s prep, 60s speak" },
      { value: "Speaking Task 2", label: "Task 2 — Talk About Experience", description: "30s prep, 60s speak" },
      { value: "Speaking Task 3", label: "Task 3 — Describe a Picture", description: "30s prep, 60s speak" },
      { value: "Speaking Task 4", label: "Task 4 — Make Predictions", description: "30s prep, 60s speak" },
      { value: "Speaking Task 5", label: "Task 5 — Compare Pictures", description: "30s prep, 60s speak" },
      { value: "Speaking Task 6", label: "Task 6 — Deal with a Situation", description: "30s prep, 60s speak" },
      { value: "Speaking Task 7", label: "Task 7 — Express Opinion", description: "30s prep, 60s speak" },
      { value: "Speaking Task 8", label: "Task 8 — Unusual Situation", description: "30s prep, 60s speak" }
    );
  } else if (module === "Listening") {
    options.push(
      { value: "Listening - Daily Life Conversation", label: "Daily Life Conversation", description: "Everyday topics between people" },
      { value: "Listening - Workplace Discussion", label: "Workplace Discussion", description: "Professional work conversations" },
      { value: "Listening - Phone Conversation", label: "Phone Conversation", description: "Telephone dialogue" },
      { value: "Listening - News Report", label: "News Report", description: "Radio or TV news style" },
      { value: "Listening - Announcement", label: "Announcement", description: "Public announcements" },
      { value: "Listening - Interview", label: "Interview", description: "Job or media interview" }
    );
  }

  return options;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Task Management</h1>

      {message && (
        <div className={`rounded-lg p-3 mb-4 text-sm ${
          message.includes("Error")
            ? "bg-red-50 text-red-700"
            : "bg-green-50 text-green-700"
        }`}>
          {message}
        </div>
      )}

      {/* Generate Speaking Pair */}
<div className="bg-white rounded-xl shadow p-6 mb-6 border-l-4 border-purple-600">
  <h2 className="text-lg font-bold text-gray-800 mb-2">
    Generate Speaking Task Pair
  </h2>
  <p className="text-sm text-gray-500 mb-4">
    Tasks 3+4 share one image. Tasks 5+6 share two images.
    Generate them together to ensure they are related.
  </p>
  <div className="grid grid-cols-3 gap-4 mb-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Pair Type
      </label>
      <div className="grid grid-cols-2 gap-2">
        {["3+4", "5+6"].map(p => (
          <button
            key={p}
            onClick={() => setPairType(p)}
            className={`py-2 rounded-lg text-sm font-bold transition ${
              pairType === p
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Task {p}
          </button>
        ))}
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Difficulty
      </label>
      <select
        value={difficulty}
        onChange={e => setDifficulty(e.target.value)}
        className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
      >
        <option value="easy">Easy (Band 4-6)</option>
        <option value="medium">Medium (Band 7-8)</option>
        <option value="hard">Hard (Band 9-12)</option>
      </select>
    </div>
    <div className="flex items-end">
      <button
        onClick={generateTaskPair}
        disabled={generatingPair}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
      >
        {generatingPair
          ? "⏳ Generating Pair..."
          : `Generate Task ${pairType} Pair`}
      </button>
    </div>
  </div>
  <p className="text-xs text-gray-400">
    This will generate 2 tasks at once with shared image(s).
    May take 30-60 seconds.
  </p>
</div>

      {/* Generate Task */}
{/* Generate Task - Step by Step */}
<div className="bg-white rounded-xl shadow p-6 mb-6">
  <h2 className="text-lg font-bold text-gray-800 mb-6">
    Generate New Task
  </h2>

  {/* Step 1 - Choose Module */}
  <div className="mb-6">
    <label className="block text-sm font-bold text-gray-700 mb-2">
      Step 1 — Choose Module
    </label>
    <div className="grid grid-cols-4 gap-3">
      {["Writing", "Reading", "Speaking", "Listening"].map(module => (
        <button
          key={module}
          onClick={() => {
            setSelectedModule(module);
            setTaskType("");
          }}
          className={`py-3 rounded-xl font-semibold text-sm transition border-2 ${
            selectedModule === module
              ? module === "Writing" ? "bg-blue-600 text-white border-blue-600"
              : module === "Reading" ? "bg-green-600 text-white border-green-600"
              : module === "Speaking" ? "bg-purple-600 text-white border-purple-600"
              : "bg-orange-600 text-white border-orange-600"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          }`}
        >
          {module === "Writing" ? "✍️" : module === "Reading" ? "📖" : module === "Speaking" ? "🎤" : "🎧"} {module}
        </button>
      ))}
    </div>
  </div>

  {/* Step 2 - Choose Specific Task */}
  {selectedModule && (
    <div className="mb-6">
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Step 2 — Choose Task Type
      </label>
      <div className="grid grid-cols-2 gap-2">
        {getTaskOptions(selectedModule).map(option => (
          <button
            key={option.value}
            onClick={() => setTaskType(option.value)}
            className={`p-3 rounded-xl text-sm text-left transition border-2 ${
              taskType === option.value
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-400"
            }`}
          >
            <p className="font-semibold">{option.label}</p>
            <p className={`text-xs mt-1 ${taskType === option.value ? "text-gray-300" : "text-gray-400"}`}>
              {option.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  )}

  {/* Step 3 - Difficulty and Sequence */}
  {taskType && (
    <div className="mb-6">
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Step 3 — Settings
      </label>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Difficulty</label>
          <div className="grid grid-cols-3 gap-1">
            {["easy", "medium", "hard"].map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`py-2 rounded-lg text-xs font-bold capitalize transition ${
                  difficulty === d
                    ? d === "easy" ? "bg-green-500 text-white"
                    : d === "medium" ? "bg-yellow-500 text-white"
                    : "bg-red-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
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
          <label className="block text-xs text-gray-500 mb-1">Sequence Number</label>
          <input
            type="number"
            value={sequenceNumber}
            onChange={e => setSequenceNumber(Number(e.target.value))}
            min={1}
            max={20}
            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>
    </div>
  )}

  {/* Step 4 - Generate */}
  {taskType && (
    <button
      onClick={generateAndSaveTask}
      disabled={generating}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 text-lg"
    >
      {generating ? "⏳ Generating..." : `Generate ${taskType}`}
    </button>
  )}

  {/* Summary of selection */}
  {taskType && (
    <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
      Ready to generate: <strong>{taskType}</strong> —
      Difficulty: <strong>{difficulty}</strong> —
      Section: <strong>{selectedSection}</strong> —
      Sequence: <strong>#{sequenceNumber}</strong>
    </div>
  )}
</div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 flex gap-2 flex-wrap">
        {["all", "Writing", "Reading", "Speaking", "Listening"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "All Tasks" : f}
          </button>
        ))}
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500 text-sm">
              <th className="px-6 py-4">Task Type</th>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Difficulty</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  Loading tasks...
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  No tasks yet. Generate your first task above!
                </td>
              </tr>
            ) : filteredTasks.map(task => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    task.task_type.includes("Writing") ? "bg-blue-100 text-blue-700" :
                    task.task_type.includes("Reading") ? "bg-green-100 text-green-700" :
                    task.task_type.includes("Speaking") ? "bg-purple-100 text-purple-700" :
                    "bg-orange-100 text-orange-700"
                  }`}>
                    {task.task_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-700 text-sm max-w-xs truncate">
                  {task.title || "No title"}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    task.difficulty === "hard" ? "bg-red-100 text-red-700" :
                    task.difficulty === "easy" ? "bg-green-100 text-green-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {task.difficulty}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(task.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 transition"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Task Preview Modal */}
{selectedTask && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Task Preview</h2>
        <button
          onClick={() => setSelectedTask(null)}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          x
        </button>
      </div>

      {/* Task Info */}
      <div className="flex gap-2 mb-4">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          selectedTask.task_type.includes("Writing") ? "bg-blue-100 text-blue-700" :
          selectedTask.task_type.includes("Reading") ? "bg-green-100 text-green-700" :
          selectedTask.task_type.includes("Speaking") ? "bg-purple-100 text-purple-700" :
          "bg-orange-100 text-orange-700"
        }`}>
          {selectedTask.task_type}
        </span>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          selectedTask.difficulty === "hard" ? "bg-red-100 text-red-700" :
          selectedTask.difficulty === "easy" ? "bg-green-100 text-green-700" :
          "bg-yellow-100 text-yellow-700"
        }`}>
          {selectedTask.difficulty}
        </span>
      </div>

      {/* Task Content */}
      {selectedTask.task_type.includes("Writing") && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="font-semibold text-gray-700 mb-1">Scenario:</p>
            <p className="text-gray-700">{selectedTask.content.scenario}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Instructions:</p>
            <p className="text-gray-700">{selectedTask.content.instructions}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-2">Bullet Points:</p>
            <ul className="space-y-1">
              {selectedTask.content.bullet_points?.map((point: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-gray-700">
                  <span className="text-blue-600 font-bold">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Word limit: {selectedTask.content.word_limit}</span>
            <span>Time: {selectedTask.content.time_limit_minutes} min</span>
          </div>

          {/* Sample Answer */}
          {selectedTask.content.sample_answer && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-green-700">Sample Answer</h3>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                  Band {selectedTask.content.sample_answer_band}
                </span>
              </div>
              <div className="bg-green-50 rounded-lg p-4 mb-3">
                <p className="text-gray-700 text-sm whitespace-pre-wrap">
                  {selectedTask.content.sample_answer}
                </p>
              </div>
              {selectedTask.content.sample_answer_notes && (
                <div>
                  <p className="font-semibold text-gray-700 text-sm mb-1">
                    Why this is a high band answer:
                  </p>
                  <ul className="space-y-1">
                    {selectedTask.content.sample_answer_notes.map((note: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-green-500 font-bold">✓</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reading Task Preview */}
      {selectedTask.task_type.includes("Reading") && (
        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-800 mb-2">
              {selectedTask.content.title}
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              {selectedTask.content.passage}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-2">
              Questions ({selectedTask.content.questions?.length}):
            </p>
            <div className="space-y-3">
              {selectedTask.content.questions?.map((q: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-700 text-sm mb-2">
                    {i + 1}. {q.question}
                  </p>
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    {Object.entries(q.options).map(([key, val]) => (
                      <p key={key} className={`text-xs p-1 rounded ${
                        key === q.correct_answer
                          ? "bg-green-100 text-green-700 font-bold"
                          : "text-gray-600"
                      }`}>
                        {key}. {val as string}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-green-600">
                    ✓ {q.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Speaking Task Preview */}
      {selectedTask.task_type.includes("Speaking") && (
        <div className="space-y-4">
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="font-semibold text-gray-700 mb-1">Situation:</p>
            <p className="text-gray-700">{selectedTask.content.situation}</p>
          </div>
          {/* Task 3 - Single Image */}
          {selectedTask.content.image_url && (
            <div className="mb-2">
              <p className="font-semibold text-gray-700 mb-2">Task Image:</p>
              <img src={selectedTask.content.image_url} alt="Task image" className="w-full rounded-lg shadow" style={{maxHeight: "400px", objectFit: "cover"}} />
            </div>
          )}
          {/* Task 5 - Two Images */}
          {selectedTask.content.image_url_1 && (
            <div className="mb-2">
              <p className="font-semibold text-gray-700 mb-2">Comparison Images:</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1 text-center">Image 1</p>
                  <img src={selectedTask.content.image_url_1} alt="Image 1" className="w-full rounded-lg shadow" style={{height: "250px", objectFit: "cover"}} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1 text-center">Image 2</p>
                  <img src={selectedTask.content.image_url_2} alt="Image 2" className="w-full rounded-lg shadow" style={{height: "250px", objectFit: "cover"}} />
                </div>
              </div>
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-700 mb-1">Task:</p>
            <p className="text-gray-800">{selectedTask.content.prompt}</p>
          </div>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Prep: {selectedTask.content.preparation_time_seconds}s</span>
            <span>Speaking: {selectedTask.content.speaking_time_seconds}s</span>
          </div>

          {/* Sample Answer */}
          {selectedTask.content.sample_answer && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-green-700">Sample Answer</h3>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                  Band {selectedTask.content.sample_answer_band}
                </span>
              </div>
              <div className="bg-green-50 rounded-lg p-4 mb-3">
                <p className="text-gray-700 text-sm italic">
                  "{selectedTask.content.sample_answer}"
                </p>
              </div>
              {selectedTask.content.sample_answer_notes && (
                <div>
                  <p className="font-semibold text-gray-700 text-sm mb-1">
                    Why this is a high band answer:
                  </p>
                  <ul className="space-y-1">
                    {selectedTask.content.sample_answer_notes.map((note: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-green-500 font-bold">✓</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
  </div>
)}

      {/* Listening Task Preview */}
      {selectedTask.task_type.includes("Listening") && (
        <div className="space-y-4">
          <div className="bg-orange-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-800 mb-3">
              {selectedTask.content.title}
            </h3>
            <div className="space-y-2">
              {selectedTask.content.dialogue?.map((line: any, i: number) => (
                <div key={i} className="flex gap-2">
                  <span className="font-bold text-orange-600 text-sm whitespace-nowrap">
                    {line.speaker}:
                  </span>
                  <p className="text-gray-700 text-sm">{line.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-2">Questions:</p>
            <div className="space-y-3">
              {selectedTask.content.questions?.map((q: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-700 text-sm mb-2">
                    {i + 1}. {q.question}
                  </p>
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    {Object.entries(q.options).map(([key, val]) => (
                      <p key={key} className={`text-xs p-1 rounded ${
                        key === q.correct_answer
                          ? "bg-green-100 text-green-700 font-bold"
                          : "text-gray-600"
                      }`}>
                        {key}. {val as string}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-green-600">
                    ✓ {q.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setSelectedTask(null)}
        className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-xl transition"
      >
        Close
      </button>
    </div>
  </div>
      )}
    </div>
  );
}
