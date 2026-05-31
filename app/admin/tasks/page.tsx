"use client";
import { useEffect, useState } from "react";
import { ReadingLabeledPassage } from "../../components/reading/ReadingLabeledPassage";
import { supabase } from "../../lib/supabase";
import {
  isReadingAdminTask,
  partNumberFromRow,
  inferAdminTaskSection,
  isReadingTaskType,
  matchesAdminTasksFilter,
  readingOnlyPartNumber,
} from "../../lib/reading-task-types";
import { speakingTask34LearnerPrompt } from "../../lib/speaking-task34-requirement";
import { task5OptionImageUrl } from "../../lib/speaking-task5-ui";
import {
  speakingTask3NeedsPair,
  type SpeakingTaskRow,
} from "../../lib/speaking-task-pairs";

type Task = {
  id: string;
  task_type: string;
  section?: string | null;
  sequence_number?: number | null;
  difficulty: string;
  title: string;
  content: any;
  created_at: string;
};

const LIST_FILTERS = ["all", "Writing", "Reading", "Speaking", "Listening"] as const;

type CreatedSortOrder = "asc" | "desc";

function formatCreatedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Step 2 option value — generates Speaking Task 3 + 4 together (shared image). */
const SPEAKING_PAIR_34 = "__speaking_pair_34__";

function SpeakingSampleAnswerPreview({ content }: { content: Record<string, unknown> }) {
  const sampleAnswer = content.sample_answer;
  if (!sampleAnswer) return null;

  if (typeof sampleAnswer === "object" && sampleAnswer !== null) {
    const obj = sampleAnswer as {
      band?: number;
      response?: string;
      chosen_option?: string;
      analysis?: Record<string, string>;
    };
    return (
      <div className="border-t pt-3">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h3 className="font-bold text-green-700">Sample Answer</h3>
          {obj.band != null && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
              Band {obj.band}
            </span>
          )}
          {obj.chosen_option && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              Option {obj.chosen_option}
            </span>
          )}
        </div>
        {obj.response && (
          <div className="bg-green-50 rounded-lg p-4 mb-3">
            <p className="text-gray-700 text-sm italic whitespace-pre-wrap">&quot;{obj.response}&quot;</p>
          </div>
        )}
        {obj.analysis && (
          <div className="space-y-1">
            <p className="font-semibold text-gray-700 text-sm mb-1">Response Analysis:</p>
            {Object.entries(obj.analysis).map(([key, val]) => (
              <div key={key} className="flex gap-2 text-xs text-gray-600">
                <span className="text-green-500 font-bold capitalize whitespace-nowrap">
                  ✓ {key.replace(/_/g, " ")}:
                </span>
                <span>{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof sampleAnswer === "string") {
    return (
      <div className="border-t pt-3">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-green-700">Sample Answer</h3>
          {(content.sample_answer_band as number | undefined) != null && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
              Band {content.sample_answer_band as number}
            </span>
          )}
        </div>
        <div className="bg-green-50 rounded-lg p-4 mb-3">
          <p className="text-gray-700 text-sm italic whitespace-pre-wrap">&quot;{sampleAnswer}&quot;</p>
        </div>
        {Array.isArray(content.sample_answer_notes) && (
          <div>
            <p className="font-semibold text-gray-700 text-sm mb-1">Why this is a high band answer:</p>
            <ul className="space-y-1">
              {(content.sample_answer_notes as string[]).map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-green-500 font-bold">✓</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function speakingLearnerPromptPreview(
  content: Record<string, unknown>,
  taskType: string,
): string {
  const seq = taskType.match(/Speaking Task (\d+)/)?.[1];
  const taskNum = seq ? Number(seq) : undefined;
  const stored = content.prompt as string | undefined;
  if (taskNum) {
    return speakingTask34LearnerPrompt(taskNum, stored) || stored || "";
  }
  return stored || "";
}

function SpeakingGenerationScriptPanel({
  content,
}: {
  content: Record<string, unknown>;
}) {
  const script = content.generation_script as Record<string, unknown> | undefined;
  if (!script && !content.describe_focus && !content.why_unusual && !content.theme) return null;

  const focal =
    (content.describe_focus as string[] | undefined) ||
    (script?.focal_points as string[] | undefined);
  type PredictionHook = {
    id: string;
    subject: string;
    visible_now: string;
    prediction_prompt: string;
  };
  const hooks =
    (content.prediction_hooks as PredictionHook[] | undefined) ||
    (script?.prediction_hooks as PredictionHook[] | undefined);

  return (
    <details className="border border-gray-200 rounded-lg bg-gray-50 text-sm">
      <summary className="cursor-pointer px-4 py-2 font-semibold text-gray-800">
        Generation script (prompts used)
      </summary>
      <div className="px-4 pb-4 space-y-3 border-t border-gray-200">
        {script?.requirement != null && (
          <div>
            <p className="font-medium text-gray-700">Picture requirement</p>
            <p className="text-gray-600">{String(script.requirement)}</p>
          </div>
        )}
        {(content.authoring_guidance as string | undefined) && (
          <div>
            <p className="font-medium text-gray-700">Question-setter guidance (not shown to learners)</p>
            <p className="text-gray-600">{String(content.authoring_guidance)}</p>
          </div>
        )}
        {(script?.theme != null || (content.theme as string | undefined)) && (
          <div>
            <p className="font-medium text-gray-700">Choice theme</p>
            <p className="text-gray-600">{String(script?.theme ?? content.theme)}</p>
          </div>
        )}
        {script?.scene_setting != null && script?.theme == null && (
          <div>
            <p className="font-medium text-gray-700">Scene</p>
            <p className="text-gray-600">{String(script.scene_setting)}</p>
          </div>
        )}
        {script?.visual_plan_a != null && (
          <div>
            <p className="font-medium text-gray-700">Picture A visual plan</p>
            <pre className="text-xs whitespace-pre-wrap text-gray-600 bg-white p-2 rounded border">
              {String(script.visual_plan_a)}
            </pre>
          </div>
        )}
        {script?.visual_plan_b != null && (
          <div>
            <p className="font-medium text-gray-700">Picture B visual plan</p>
            <pre className="text-xs whitespace-pre-wrap text-gray-600 bg-white p-2 rounded border">
              {String(script.visual_plan_b)}
            </pre>
          </div>
        )}
        {script?.bizarre_action != null && (
          <div>
            <p className="font-medium text-gray-700">Bizarre action</p>
            <p className="text-gray-600">{String(script.bizarre_action)}</p>
          </div>
        )}
        {(script?.why_unusual != null || (content.why_unusual as string | undefined)) && (
          <div>
            <p className="font-medium text-gray-700">Why it is unusual</p>
            <p className="text-gray-600">
              {String(script?.why_unusual ?? content.why_unusual)}
            </p>
          </div>
        )}
        {Array.isArray(focal) && focal.length > 0 && (
          <div>
            <p className="font-medium text-gray-700">Activities in one scene (Task 3 — describe each; Task 4 — predict next)</p>
            <ol className="list-decimal list-inside text-gray-600 space-y-1">
              {focal.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          </div>
        )}
        {Array.isArray(hooks) && hooks.length > 0 && (
          <div>
            <p className="font-medium text-gray-700">Prediction hooks (Task 4)</p>
            <ul className="space-y-2 text-gray-600">
              {hooks.map((h) => (
                <li key={h.id} className="bg-white rounded p-2 border border-gray-100">
                  <span className="font-medium">{h.id}. {h.subject}</span>
                  <span className="block text-xs mt-1">Now: {h.visible_now}</span>
                  <span className="block text-xs">Predict: {h.prediction_prompt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {script?.vision_description_a != null && (
          <div>
            <p className="font-medium text-gray-700">Vision — Picture A (from generated image)</p>
            <pre className="text-xs whitespace-pre-wrap text-gray-600 bg-white p-2 rounded border">
              {String(script.vision_description_a)}
            </pre>
          </div>
        )}
        {script?.vision_description_b != null && (
          <div>
            <p className="font-medium text-gray-700">Vision — Picture B (from generated image)</p>
            <pre className="text-xs whitespace-pre-wrap text-gray-600 bg-white p-2 rounded border">
              {String(script.vision_description_b)}
            </pre>
          </div>
        )}
        {script?.visual_plan != null && (
          <div>
            <p className="font-medium text-gray-700">Visual plan</p>
            <pre className="text-xs whitespace-pre-wrap text-gray-600 bg-white p-2 rounded border">
              {String(script.visual_plan)}
            </pre>
          </div>
        )}
        {script?.stability_prompt != null && (
          <div>
            <p className="font-medium text-gray-700">Stability AI image prompt</p>
            <pre className="text-xs whitespace-pre-wrap text-gray-600 bg-white p-2 rounded border max-h-40 overflow-y-auto">
              {String(script.stability_prompt)}
            </pre>
          </div>
        )}
        {script?.task4_llm_prompt != null && (
          <div>
            <p className="font-medium text-gray-700">Task 4 LLM prompt</p>
            <pre className="text-xs whitespace-pre-wrap text-gray-600 bg-white p-2 rounded border max-h-48 overflow-y-auto">
              {String(script.task4_llm_prompt)}
            </pre>
          </div>
        )}
        {script?.vision_description != null && (
          <div>
            <p className="font-medium text-gray-700">Vision description (from image)</p>
            <pre className="text-xs whitespace-pre-wrap text-gray-600 bg-white p-2 rounded border">
              {String(script.vision_description)}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskType, setTaskType] = useState("Writing Task 1");
  const [difficulty, setDifficulty] = useState("medium");
  const [selectedSection, setSelectedSection] = useState("Writing");
  const [sequenceNumber, setSequenceNumber] = useState(1);
  const [selectedModule, setSelectedModule] = useState("");
  const [createdSortOrder, setCreatedSortOrder] = useState<CreatedSortOrder>("asc");

  const taskTypes = [
  "Writing Task 1",
  "Writing Task 2",
  "Task 3: Information",
  "Task 4: Viewpoints",
  "Task 1: Correspondence",
  "Task 2: to Apply Information",
  "Speaking Task 1",
  "Speaking Task 2",
  "Speaking Task 3",
  "Speaking Task 4",
  "Speaking Task 5",
  "Speaking Task 6",
  "Speaking Task 7",
  "Speaking Task 8",
  "Listening - Problem Solving",
  "Listening - Daily Life Conversation",
  "Listening - Listening for Information",
  "Listening - News Item",
  "Listening - Discussion",
  "Listening - Viewpoints"
];

  useEffect(() => {
    void loadTasks();
  }, [createdSortOrder]);

  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase
      .from("admin_tasks")
      .select("*")
      .order("created_at", { ascending: createdSortOrder === "asc" });
    setTasks(data || []);
    setLoading(false);
  }

  async function generateAndSaveTask() {
  console.log("Generating:", taskType, difficulty);
  setGenerating(true);
  setMessage("");
  let imageWarnings: string[] = [];
  try {
    const { data: { session } } = await supabase.auth.getSession();

    let endpoint = "";
    let body: any = {};
    let title = "";

    if (taskType === "Writing Task 1" || taskType === "Writing Task 2") {
      endpoint = "/api/admin/writing/generate";
      body = { taskType };
    } else if (isReadingTaskType(taskType)) {
      endpoint = "/api/admin/reading/generate";
      body = { taskType };
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

    if (!res.ok) {
      setMessage("Error: " + (taskContent.error || res.statusText));
      setGenerating(false);
      return;
    }

    if (taskContent.error) {
      setMessage("Error: " + taskContent.error);
      setGenerating(false);
      return;
    }

    imageWarnings = Array.isArray(taskContent.warnings) ? taskContent.warnings : [];
    if (taskType.includes("Speaking")) {
      const taskNum = parseInt(taskType.split(" ")[2]) || 0;
      const needsPicture = taskNum === 3 || taskNum === 5 || taskNum === 8;
      const hasPicture =
        taskNum === 5
          ? Boolean(
              taskContent.option_a?.image_url ||
                taskContent.option_b?.image_url ||
                taskContent.image_url_1,
            )
          : Boolean(taskContent.image_url);
      if (needsPicture && !hasPicture && imageWarnings.length === 0) {
        imageWarnings.push("No image URL returned. Check STABILITY_API_KEY and Supabase task-images bucket.");
      }
    }

    // Extract title based on task type
    if (taskType.includes("Writing")) {
      title = (taskContent.topic || taskContent.scenario || "").slice(0, 80) || taskType;
    } else if (isReadingTaskType(taskType)) {
      title = taskContent.title || taskType;
    } else if (taskType.includes("Speaking")) {
      title = taskContent.situation?.slice(0, 80) || taskType;
    } else if (taskType.includes("Listening")) {
      title = (taskContent.topic || taskContent.title || "").slice(0, 80) || taskType;
    }

    const readingPartNum = readingOnlyPartNumber(taskType);
    const { warnings: _w, ...contentToSave } = taskContent as Record<string, unknown> & {
      warnings?: string[];
    };
    const { error } = await supabase
      .from("admin_tasks")
      .insert({
        task_type: taskType,
        difficulty,
        title,
        content: contentToSave,
        created_by: session?.user?.id,
        section: inferAdminTaskSection(taskType),
        sequence_number: readingPartNum ?? sequenceNumber,
      });

    if (error) {
      setMessage("Error saving: " + error.message);
    } else if (imageWarnings.length > 0) {
      setMessage("Task saved, but image failed: " + imageWarnings.join(" | "));
      loadTasks();
    } else {
      const taskNum = parseInt(taskType.split(" ")[2]) || 0;
      const grounded =
        taskNum === 8 && (taskContent as { image_grounded?: boolean }).image_grounded;
      setMessage(
        grounded
          ? "Task saved — situation and sample answer describe the generated image."
          : "Task saved successfully!",
      );
      loadTasks();
    }
  } catch (err) {
    console.error("Error:", err);
    setMessage("Something went wrong. Please try again.");
  } finally {
    setGenerating(false);
    const clearMs = imageWarnings.length > 0 ? 12000 : 3000;
    setTimeout(() => setMessage(""), clearMs);
  }
  }
  async function generateTaskPair() {
    setGenerating(true);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/speaking/generate-pair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + (session?.access_token || "")
        },
        body: JSON.stringify({ pairType: "3+4", difficulty })
      });
      const data = await res.json();
      if (data.error) {
        setMessage("Error: " + data.error);
      } else if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        setMessage("Pair saved with image warnings: " + data.warnings.join(" | "));
        loadTasks();
      } else {
        const sceneHint = data.scene ? ` Scene: ${data.scene}.` : "";
        setMessage(`Speaking Task 3+4 pair generated successfully!${sceneHint}`);
        loadTasks();
      }
    } catch (err) {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
      setTimeout(() => setMessage(""), 5000);
    }
  }

  async function repairTask34Pair(task3Id: string) {
    setGenerating(true);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/speaking/generate-pair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ pairType: "3+4-repair", task3Id }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage("Error: " + data.error);
      } else if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        setMessage("Paired Task 4 created with warnings: " + data.warnings.join(" | "));
        await loadTasks();
      } else {
        setMessage("Paired Task 4 created. You can now add this Task 3 to a Speaking mock.");
        await loadTasks();
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
      setTimeout(() => setMessage(""), 8000);
    }
  }

  async function deleteTask(taskId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const usageRes = await fetch(`/api/admin/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usage = await usageRes.json().catch(() => ({}));
      const mockTests: { id: string; title: string; is_published: boolean }[] =
        usageRes.ok && Array.isArray(usage.mockTests) ? usage.mockTests : [];

      let confirmText = "Delete this task from the library? This cannot be undone.";
      if (mockTests.length > 0) {
        const names = mockTests.map(m => m.title).join(", ");
        confirmText +=
          `\n\nUsed in mock test(s): ${names}.` +
          "\nThe task will be removed from those mocks." +
          "\nAny mock that is no longer complete will be unpublished automatically.";
      }
      if (!confirm(confirmText)) return;

      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data.error || res.statusText;
        console.error("DELETE /api/admin/tasks failed:", res.status, detail);
        setMessage("Error deleting task: " + detail);
        setTimeout(() => setMessage(""), 8000);
        return;
      }
      const unpublished: { title: string }[] = Array.isArray(data.unpublishedMocks)
        ? data.unpublishedMocks
        : [];
      let msg = "Task deleted.";
      if (unpublished.length > 0) {
        msg +=
          " Unpublished incomplete mock(s): " +
          unpublished.map((m: { title: string }) => m.title).join(", ") +
          ". Re-open them in Admin → Mock Tests to add replacement tasks.";
      }
      setMessage(msg);
      void loadTasks();
      setTimeout(() => setMessage(""), unpublished.length > 0 ? 10000 : 3000);
    } catch (e) {
      setMessage("Error deleting task: " + String(e));
      setTimeout(() => setMessage(""), 5000);
    }
  }

  const filteredTasks = tasks.filter(task => matchesAdminTasksFilter(task, filter));

  function getTaskOptions(module: string) {
  const options: { value: string; label: string; description: string }[] = [];

  if (module === "Writing") {
    options.push(
      { value: "Writing Task 1", label: "Task 1 — Write an Email", description: "150-200 words, 26 minutes" },
      { value: "Writing Task 2", label: "Task 2 — Respond to Survey", description: "150-200 words, 27 minutes" }
    );
  } else if (module === "Reading") {
    options.push(
      { value: "task 1", label: "Part 1 — Correspondence", description: "Email/letter ~150–250 words" },
      { value: "task 2", label: "Part 2 — Apply Information", description: "Use info to complete a task" },
      { value: "task 3", label: "Part 3 — Reading for Information", description: "4 ¶ labeled A–D · ~300–450 words" },
      { value: "task 4", label: "Part 4 — Viewpoints", description: "4 ¶ labeled A–D · ~350–500 words" },
    );
  } else if (module === "Speaking") {
    options.push(
      { value: "Speaking Task 1", label: "Task 1 — Give Advice", description: "30s prep, 60s speak" },
      { value: "Speaking Task 2", label: "Task 2 — Talk About Experience", description: "30s prep, 60s speak" },
      {
        value: SPEAKING_PAIR_34,
        label: "Task 3 + 4 — Picture pair",
        description: "One square image, 4–5 clear activities · describe + predict",
      },
      { value: "Speaking Task 5", label: "Task 5 — Compare Pictures", description: "30s prep, 60s speak" },
      { value: "Speaking Task 6", label: "Task 6 — Deal with a Situation", description: "60s prep, 60s speak" },
      { value: "Speaking Task 7", label: "Task 7 — Express Opinion", description: "30s prep, 60s speak" },
      { value: "Speaking Task 8", label: "Task 8 — Unusual Situation", description: "30s prep, 60s speak" }
    );
  } else if (module === "Listening") {
    options.push(
      { value: "Listening - Problem Solving", label: "Part 1 — Problem Solving", description: "2 speakers solving a problem (8 questions)" },
      { value: "Listening - Daily Life Conversation", label: "Part 2 — Daily Life Conversation", description: "Short casual conversation (5 questions)" },
      { value: "Listening - Listening for Information", label: "Part 3 — Listening for Information", description: "Instructions or directions (6 questions)" },
      { value: "Listening - News Item", label: "Part 4 — News Item", description: "Formal news report (5 questions)" },
      { value: "Listening - Discussion", label: "Part 5 — Discussion", description: "Multiple speakers, opinions (8 questions)" },
      { value: "Listening - Viewpoints", label: "Part 6 — Viewpoints", description: "Speaker defending a viewpoint (6 questions)" }
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
            if (module === "Reading") {
              setSelectedSection("Reading");
              setSequenceNumber(1);
            } else if (module === "Speaking") {
              setSelectedSection("Speaking");
            } else if (module === "Listening") {
              setSelectedSection("Listening");
            } else if (module === "Writing") {
              setSelectedSection("Writing");
            }
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
            onClick={() => {
              setTaskType(option.value);
              if (selectedModule === "Reading") {
                setSelectedSection("Reading");
                const n = readingOnlyPartNumber(option.value);
                if (n !== null) setSequenceNumber(n);
              }
            }}
            className={`p-3 rounded-xl text-sm text-left transition border-2 ${
              taskType === option.value
                ? option.value === SPEAKING_PAIR_34
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-gray-800 text-white border-gray-800"
                : option.value === SPEAKING_PAIR_34
                  ? "bg-purple-50 text-purple-900 border-purple-200 hover:border-purple-400"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-400"
            }`}
          >
            <p className="font-semibold">{option.label}</p>
            <p
              className={`text-xs mt-1 ${
                taskType === option.value ? "text-white/90" : "text-gray-600"
              }`}
            >
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
          <label className="block text-xs text-gray-600 mb-1">Difficulty</label>
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
          <label className="block text-xs text-gray-600 mb-1">Section</label>
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
          <label className="block text-xs text-gray-600 mb-1">Sequence Number</label>
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
      onClick={taskType === SPEAKING_PAIR_34 ? generateTaskPair : generateAndSaveTask}
      disabled={generating}
      className={`w-full font-semibold py-3 rounded-xl transition disabled:opacity-50 text-lg ${
        taskType === SPEAKING_PAIR_34
          ? "bg-purple-600 hover:bg-purple-700 text-white"
          : "bg-blue-600 hover:bg-blue-700 text-white"
      }`}
    >
      {generating
        ? taskType === SPEAKING_PAIR_34
          ? "⏳ Generating Task 3+4 pair..."
          : "⏳ Generating..."
        : taskType === SPEAKING_PAIR_34
          ? "Generate Task 3+4 Pair"
          : `Generate ${taskType}`}
    </button>
  )}

  {/* Summary of selection */}
  {taskType && (
    <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
      Ready to generate:{" "}
      <strong>
        {taskType === SPEAKING_PAIR_34 ? "Speaking Task 3 + 4 (shared image)" : taskType}
      </strong>{" "}
      — Difficulty: <strong>{difficulty}</strong>
      {taskType !== SPEAKING_PAIR_34 && (
        <>
          {" "}
          — Section: <strong>{selectedSection}</strong> — Sequence: <strong>#{sequenceNumber}</strong>
        </>
      )}
      {taskType === SPEAKING_PAIR_34 && (
        <span className="block text-xs text-gray-600 mt-1">
          Creates two linked tasks with one picture. May take 30–60 seconds.
        </span>
      )}
    </div>
  )}
</div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 flex gap-2 flex-wrap">
        {LIST_FILTERS.map(f => {
          const label = f === "all" ? "All Tasks" : f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-700 text-sm font-semibold">
              <th className="px-6 py-4">Task Type</th>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Difficulty</th>
              <th className="px-6 py-4">
                <button
                  type="button"
                  onClick={() => setCreatedSortOrder(o => (o === "asc" ? "desc" : "asc"))}
                  className="inline-flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900"
                  title="Sort by created date"
                >
                  Created
                  <span className="text-gray-600">{createdSortOrder === "asc" ? "↑" : "↓"}</span>
                </button>
              </th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-600">
                  Loading tasks...
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-600">
                  {tasks.length > 0 && filter !== "all"
                    ? `No ${filter} tasks in the list. Other sections may have been saved with the wrong label — regenerate or check task type.`
                    : "No tasks yet. Generate your first task above!"}
                </td>
              </tr>
            ) : filteredTasks.map(task => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    task.task_type.includes("Writing") ? "bg-blue-100 text-blue-700" :
                    isReadingAdminTask(task) ? "bg-green-100 text-green-700" :
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
                <td className="px-6 py-4 text-gray-600 text-sm whitespace-nowrap">
                  {task.created_at ? formatCreatedAt(task.created_at) : "—"}
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
          className="text-gray-600 hover:text-gray-600 text-2xl font-bold"
        >
          x
        </button>
      </div>

      {/* Task Info */}
      <div className="flex gap-2 mb-4">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          matchesAdminTasksFilter(selectedTask, "Writing") ? "bg-blue-100 text-blue-700" :
          matchesAdminTasksFilter(selectedTask, "Reading") ? "bg-green-100 text-green-700" :
          matchesAdminTasksFilter(selectedTask, "Speaking") ? "bg-purple-100 text-purple-700" :
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
          <div className="flex gap-4 text-sm text-gray-600">
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
      {isReadingAdminTask(selectedTask) && (
        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-800 mb-2">{selectedTask.content.title}</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ maxHeight: "70vh" }}>
              {/* LEFT — Passage */}
              <div className="bg-white border rounded-lg p-4 overflow-y-auto">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Passage</p>

                {/* Part 2 - HTML Visual Document */}
                {selectedTask.content.html_content && (
                  <div
                    className="border rounded-lg overflow-auto"
                    style={{ backgroundColor: "white", color: "#1a1a1a" }}
                    dangerouslySetInnerHTML={{ __html: selectedTask.content.html_content }}
                  />
                )}

                {selectedTask.content.response_message && !selectedTask.content.main_message && (
                  <div className="bg-white border rounded-lg p-3 mt-3">
                    <p className="text-xs text-gray-600">From: {selectedTask.content.response_message.from}</p>
                    <p className="text-xs text-gray-600">To: {selectedTask.content.response_message.to}</p>
                    <p className="text-xs font-bold text-gray-700">
                      Subject: {selectedTask.content.response_message.subject}
                    </p>
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                      {selectedTask.content.response_message.body}
                    </p>
                  </div>
                )}

                {/* Part 1 - Email Correspondence */}
                {selectedTask.content.main_message && (
                  <div className="space-y-3 mt-2">
                    <div className="bg-white border rounded-lg p-3">
                      <p className="text-xs text-gray-600">From: {selectedTask.content.main_message.from}</p>
                      <p className="text-xs text-gray-600">To: {selectedTask.content.main_message.to}</p>
                      <p className="text-xs font-bold text-gray-700">
                        Subject: {selectedTask.content.main_message.subject}
                      </p>
                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                        {selectedTask.content.main_message.body}
                      </p>
                    </div>
                    {selectedTask.content.response_message && (
                      <div className="bg-white border rounded-lg p-3">
                        <p className="text-xs text-gray-600">From: {selectedTask.content.response_message.from}</p>
                        <p className="text-xs text-gray-600">To: {selectedTask.content.response_message.to}</p>
                        <p className="text-xs font-bold text-gray-700">
                          Subject: {selectedTask.content.response_message.subject}
                        </p>
                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                          {selectedTask.content.response_message.body}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Part 3/4 - Regular Passage */}
                {selectedTask.content.passage && (
                  <div className="text-gray-700 text-sm leading-relaxed mt-2">
                    {partNumberFromRow(selectedTask) === 3 ||
                    partNumberFromRow(selectedTask) === 4 ? (
                      <ReadingLabeledPassage
                        passage={String(selectedTask.content.passage)}
                        taskId={selectedTask.id}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {selectedTask.content.passage}
                      </div>
                    )}
                  </div>
                )}

                {/* Part 4 - Viewpoints */}
                {selectedTask.content.viewpoints && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs text-gray-600 font-bold">Topic: {selectedTask.content.topic}</p>
                    {selectedTask.content.viewpoints.map((v: any, i: number) => (
                      <div key={i} className="bg-white border rounded-lg p-3">
                        <p className="text-xs font-bold text-gray-700">
                          {v.name} — {v.role}
                        </p>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{v.opinion}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT — Questions */}
              <div className="bg-white border rounded-lg p-4 overflow-y-auto">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
                  Questions ({selectedTask.content.questions?.length})
                </p>
                <div className="space-y-3">
                  {selectedTask.content.questions?.map((q: any, i: number) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <p className="font-medium text-gray-700 text-sm mb-2">
                        {i + 1}. {q.question}
                      </p>
                      <div className="grid grid-cols-2 gap-1 mb-2">
                        {Object.entries(q.options).map(([key, val]) => (
                          <p
                            key={key}
                            className={`text-xs p-1 rounded ${
                              key === q.correct_answer
                                ? "bg-green-100 text-green-700 font-bold"
                                : "text-gray-600"
                            }`}
                          >
                            {key}. {val as string}
                          </p>
                        ))}
                      </div>
                      <p className="text-xs text-green-600">✓ {q.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Speaking Task Preview */}
{selectedTask.task_type.includes("Speaking") && (
  <div className="space-y-4">

    {/* Situation */}
    <div className="bg-purple-50 rounded-lg p-4">
      <p className="font-semibold text-gray-700 mb-1">Situation:</p>
      <p className="text-gray-700">{selectedTask.content.situation}</p>
      {selectedTask.task_type === "Speaking Task 8" && (
        <p className="mt-2 text-xs">
          {selectedTask.content.image_grounded ? (
            <span className="text-green-700 font-medium">
              ✓ Text aligned to generated image (vision)
            </span>
          ) : (
            <span className="text-amber-700">
              Older task — regenerate to align situation and sample answer with the picture.
            </span>
          )}
        </p>
      )}
      {(selectedTask.task_type === "Speaking Task 3" ||
        selectedTask.task_type === "Speaking Task 4") && (
        <p className="mt-2 text-xs">
          {selectedTask.content.image_grounded ? (
            <span className="text-green-700 font-medium">
              ✓ Text aligned to generated image (vision)
            </span>
          ) : selectedTask.content.scene_profile ? (
            <span className="text-amber-700">
              Scene: {selectedTask.content.scene_profile as string}
              {selectedTask.content.scene_variation
                ? ` · ${selectedTask.content.scene_variation as string}`
                : ""}
            </span>
          ) : (
            <span className="text-amber-700">
              Older task — regenerate for a distinct scene and aligned text.
            </span>
          )}
        </p>
      )}
      {selectedTask.task_type === "Speaking Task 3" &&
        speakingTask3NeedsPair(selectedTask as SpeakingTaskRow, tasks as SpeakingTaskRow[]) && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-900">
              This Task 3 has no paired Task 4, so it cannot be used in a Speaking mock test yet.
            </p>
            <button
              type="button"
              disabled={generating || !selectedTask.content?.image_url}
              onClick={() => void repairTask34Pair(selectedTask.id)}
              className="mt-2 rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {generating ? "Creating paired Task 4…" : "Create paired Task 4"}
            </button>
          </div>
        )}
    </div>

    {(selectedTask.task_type === "Speaking Task 3" ||
      selectedTask.task_type === "Speaking Task 4") && (
      <SpeakingGenerationScriptPanel content={selectedTask.content} />
    )}

    {/* Task 3 / 8 — single image */}
    {(selectedTask.task_type === "Speaking Task 3" ||
      selectedTask.task_type === "Speaking Task 8") && (
      <div className="mb-2">
        <p className="font-semibold text-gray-700 mb-2">Task Image:</p>
        {selectedTask.content.image_url ? (
          <img
            src={selectedTask.content.image_url}
            alt="Task image"
            className="w-full max-w-md aspect-square object-cover rounded-lg shadow"
          />
        ) : (
          <div className="w-full max-w-md aspect-square rounded-lg bg-amber-50 border-2 border-dashed border-amber-300 flex flex-col items-center justify-center text-amber-900 text-sm text-center p-6">
            <span className="text-3xl mb-2">🖼️</span>
            <span className="font-semibold">No image on this task</span>
            <span className="mt-2 text-xs text-amber-800">
              Regenerate the task and check the yellow banner for Stability AI or storage errors.
            </span>
          </div>
        )}
        <div className="bg-purple-50 rounded-lg p-3 mt-3 max-w-md">
          <p className="font-semibold text-gray-700 text-sm mb-1">Instructions (learner question):</p>
          <p className="text-gray-700 text-sm">
            {speakingLearnerPromptPreview(selectedTask.content, selectedTask.task_type)}
          </p>
        </div>
      </div>
    )}

    {/* Task 5 - Two Images */}
    {selectedTask.task_type === "Speaking Task 5" && (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-600 mb-1 text-center font-bold">
              {selectedTask.content.option_a?.label ? "Option A" : "Picture 1"}
            </p>
            {task5OptionImageUrl(selectedTask.content, "A") ? (
              <img
                src={task5OptionImageUrl(selectedTask.content, "A")}
                alt="Image 1"
                className="w-full aspect-square object-cover rounded-lg shadow"
              />
            ) : (
              <div className="w-full aspect-square rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-600 text-xs text-center p-4">
                <span className="text-2xl mb-2">🖼️</span>
                <span>Image not generated</span>
                <span className="mt-1 text-gray-600">Stability AI credits exhausted</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1 text-center font-bold">
              {selectedTask.content.option_b?.label ? "Option B" : "Picture 2"}
            </p>
            {task5OptionImageUrl(selectedTask.content, "B") ? (
              <img
                src={task5OptionImageUrl(selectedTask.content, "B")}
                alt="Image 2"
                className="w-full aspect-square object-cover rounded-lg shadow"
              />
            ) : (
              <div className="w-full aspect-square rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-600 text-xs text-center p-4">
                <span className="text-2xl mb-2">🖼️</span>
                <span>Image not generated</span>
                <span className="mt-1 text-gray-600">Stability AI credits exhausted</span>
              </div>
            )}
          </div>
        </div>

        {/* Task 5 — Literal info / facts */}
        {(Array.isArray(selectedTask.content.option_a?.facts) || Array.isArray(selectedTask.content.option_b?.facts)) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-700 mb-2">Option A — Info</p>
              {Array.isArray(selectedTask.content.option_a?.facts) && selectedTask.content.option_a.facts.length > 0 ? (
                <ul className="space-y-1">
                  {selectedTask.content.option_a.facts.slice(0, 5).map((fact: string, i: number) => (
                    <li key={i} className="text-xs text-gray-600 flex gap-2">
                      <span className="text-gray-600">•</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-600">No facts provided.</p>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-700 mb-2">Option B — Info</p>
              {Array.isArray(selectedTask.content.option_b?.facts) && selectedTask.content.option_b.facts.length > 0 ? (
                <ul className="space-y-1">
                  {selectedTask.content.option_b.facts.slice(0, 5).map((fact: string, i: number) => (
                    <li key={i} className="text-xs text-gray-600 flex gap-2">
                      <span className="text-gray-600">•</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-600">No facts provided.</p>
              )}
            </div>
          </div>
        )}

        {/* Prompt */}
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="font-semibold text-gray-700 text-sm mb-1">Task (learner sees):</p>
          <p className="text-gray-700 text-sm">
            {speakingLearnerPromptPreview(selectedTask.content, selectedTask.task_type)}
          </p>
        </div>

        {selectedTask.content.person_to_persuade && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-700">
              <span className="font-bold">Person to persuade:</span> {selectedTask.content.person_to_persuade}
            </p>
          </div>
        )}

        {/* Timings */}
        <div className="flex gap-4 text-sm text-gray-600">
          <span>⏱ Prep: {selectedTask.content.preparation_time_seconds}s</span>
          <span>🎤 Speaking: {selectedTask.content.speaking_time_seconds}s</span>
        </div>

        {/* Tips */}
        {selectedTask.content.tips && (
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="font-semibold text-gray-700 text-sm mb-2">💡 Tips:</p>
            <ul className="space-y-1">
              {selectedTask.content.tips.map((tip: string, i: number) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                  <span className="text-yellow-500 font-bold">•</span>{tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Scoring Criteria */}
        {selectedTask.content.scoring_criteria && (
          <div className="border-t pt-3">
            <p className="font-semibold text-gray-700 text-sm mb-2">📊 Scoring Criteria:</p>
            <div className="space-y-1">
              {Object.entries(selectedTask.content.scoring_criteria).map(([key, val]) => (
                <div key={key} className="bg-gray-50 rounded p-2">
                  <p className="text-xs font-bold text-gray-700 capitalize">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-600">{val as string}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <SpeakingSampleAnswerPreview content={selectedTask.content} />
      </div>
    )}
    {/* Task 6 - Two Options */}
    {selectedTask.task_type === "Speaking Task 6" ? (
      <div className="space-y-3">
        {/* Options */}
        <p className="font-semibold text-gray-700">Choose ONE person to address:</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-xs font-bold text-purple-700 mb-1">Option A</p>
            <p className="text-sm font-semibold text-gray-800">
              {selectedTask.content.option_a?.person}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {selectedTask.content.option_a?.instruction}
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-xs font-bold text-purple-700 mb-1">Option B</p>
            <p className="text-sm font-semibold text-gray-800">
              {selectedTask.content.option_b?.person}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {selectedTask.content.option_b?.instruction}
            </p>
          </div>
        </div>

        {/* Timings */}
        <div className="flex gap-4 text-sm text-gray-600">
          <span>⏱ Prep: {selectedTask.content.preparation_time_seconds}s</span>
          <span>🎤 Speaking: {selectedTask.content.speaking_time_seconds}s</span>
        </div>

        {/* Tips */}
        {selectedTask.content.tips && (
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="font-semibold text-gray-700 text-sm mb-2">💡 Tips:</p>
            <ul className="space-y-1">
              {selectedTask.content.tips.map((tip: string, i: number) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                  <span className="text-yellow-500 font-bold">•</span>{tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Scoring Criteria */}
        {selectedTask.content.scoring_criteria && (
          <div className="border-t pt-3">
            <p className="font-semibold text-gray-700 text-sm mb-2">📊 Scoring Criteria:</p>
            <div className="space-y-1">
              {Object.entries(selectedTask.content.scoring_criteria).map(([key, val]) => (
                <div key={key} className="bg-gray-50 rounded p-2">
                  <p className="text-xs font-bold text-gray-700 capitalize">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-600">{val as string}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sample Answer */}
        {selectedTask.content.sample_answer && (
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-green-700">Sample Answer</h3>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                Band {selectedTask.content.sample_answer.band}
              </span>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                Option {selectedTask.content.sample_answer.chosen_option}
              </span>
            </div>
            <div className="bg-green-50 rounded-lg p-4 mb-3">
              <p className="text-gray-700 text-sm italic">
                "{selectedTask.content.sample_answer.response}"
              </p>
            </div>
            {selectedTask.content.sample_answer.analysis && (
              <div className="space-y-1">
                <p className="font-semibold text-gray-700 text-sm mb-1">Response Analysis:</p>
                {Object.entries(selectedTask.content.sample_answer.analysis).map(([key, val]) => (
                  <div key={key} className="flex gap-2 text-xs text-gray-600">
                    <span className="text-green-500 font-bold capitalize whitespace-nowrap">
                      ✓ {key}:
                    </span>
                    <span>{val as string}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    ) : selectedTask.task_type !== "Speaking Task 5" ? (
      /* All other speaking tasks except Task 5 */
      <div className="space-y-3">
        <div>
          <p className="font-semibold text-gray-700 mb-1">Task (learner sees):</p>
          <p className="text-gray-800">
            {speakingLearnerPromptPreview(selectedTask.content, selectedTask.task_type)}
          </p>
        </div>
        <div className="flex gap-4 text-sm text-gray-600">
          <span>⏱ Prep: {selectedTask.content.preparation_time_seconds}s</span>
          <span>🎤 Speaking: {selectedTask.content.speaking_time_seconds}s</span>
        </div>
        <SpeakingSampleAnswerPreview content={selectedTask.content} />
        </div>
      ) : null}

    </div>
  )}

      {/* Listening Task Preview */}
      {selectedTask.task_type.includes("Listening") && (
        <div className="space-y-4">
          <div className="bg-orange-50 rounded-lg p-4">
            {selectedTask.content.topic && (
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1">Topic</p>
            )}
            <h3 className="font-bold text-gray-800 mb-1">
              {selectedTask.content.topic || selectedTask.content.title}
            </h3>
            {selectedTask.content.title &&
              selectedTask.content.topic &&
              selectedTask.content.title !== selectedTask.content.topic && (
                <p className="text-sm text-gray-600 mb-3">Title: {selectedTask.content.title}</p>
              )}
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
