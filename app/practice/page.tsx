"use client";
import Link from "next/link";

const SECTIONS = [
  {
    key: "writing",
    label: "Writing",
    icon: "✍️",
    color: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", btn: "bg-blue-600 hover:bg-blue-700", dot: "bg-blue-400" },
    description: "Practice writing emails and survey responses under timed conditions.",
    time: "53 minutes total",
    tasks: [
      { label: "Task 1 — Write an Email", description: "Write a formal or informal email addressing all bullet points.", time: "27 min", href: "/writing?task=1" },
      { label: "Task 2 — Respond to Survey", description: "Respond to survey questions with detailed written answers.", time: "26 min", href: "/writing?task=2" },
    ],
  },
  {
    key: "reading",
    label: "Reading",
    icon: "📖",
    color: { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700", btn: "bg-green-600 hover:bg-green-700", dot: "bg-green-400" },
    description: "Read passages and answer multiple choice questions across 4 parts.",
    time: "43 minutes total",
    tasks: [
      { label: "Part 1 — Correspondence", description: "Read emails or letters and answer comprehension questions.", time: "11 min", href: "/reading?part=0" },
      { label: "Part 2 — Apply Information", description: "Read a document and apply the information to complete tasks.", time: "9 min", href: "/reading?part=1" },
      { label: "Part 3 — Reading for Information", description: "Read a passage and find specific information.", time: "10 min", href: "/reading?part=2" },
      { label: "Part 4 — Reading for Viewpoints", description: "Read multiple viewpoints and answer opinion-based questions.", time: "13 min", href: "/reading?part=3" },
    ],
  },
  {
    key: "speaking",
    label: "Speaking",
    icon: "🎤",
    color: { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700", btn: "bg-purple-600 hover:bg-purple-700", dot: "bg-purple-400" },
    description: "Practice all 8 speaking tasks with preparation and speaking timers.",
    time: "~15 minutes total",
    tasks: [
      { label: "Task 1 — Give Advice", description: "Give advice to a friend about a situation.", time: "30s prep / 90s speak", href: "/speaking?task=1" },
      { label: "Task 2 — Personal Experience", description: "Talk about a personal experience related to a topic.", time: "30s prep / 60s speak", href: "/speaking?task=2" },
      { label: "Task 3 — Describe a Picture", description: "Describe what you see in a picture in detail.", time: "30s prep / 60s speak", href: "/speaking?task=3" },
      { label: "Task 4 — Make Predictions", description: "Look at a picture and make predictions about the future.", time: "30s prep / 60s speak", href: "/speaking?task=4" },
      { label: "Task 5 — Compare Pictures", description: "Compare two pictures and express a preference.", time: "60s prep / 60s speak", href: "/speaking?task=5" },
      { label: "Task 6 — Deal with a Situation", description: "Choose a person to address and handle a difficult situation.", time: "60s prep / 60s speak", href: "/speaking?task=6" },
      { label: "Task 7 — Express Opinion", description: "Express and support your opinion on a topic.", time: "30s prep / 60s speak", href: "/speaking?task=7" },
      { label: "Task 8 — Unusual Situation", description: "Describe what is happening in an unusual situation.", time: "30s prep / 60s speak", href: "/speaking?task=8" },
    ],
  },
  {
    key: "listening",
    label: "Listening",
    icon: "🎧",
    color: { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", btn: "bg-orange-600 hover:bg-orange-700", dot: "bg-orange-400" },
    description: "Listen to audio passages and answer comprehension questions.",
    time: "~47 minutes total",
    tasks: [
      { label: "Part 1 — Problem Solving", description: "Listen to a dialogue split into 3 parts and answer 8 questions.", time: "8 questions", href: "/listening?part=0" },
      { label: "Part 2 — Daily Life Conversation", description: "Listen to a short casual conversation and answer 5 questions.", time: "5 questions", href: "/listening?part=1" },
      { label: "Part 3 — Listening for Information", description: "Listen to someone giving information and answer 6 questions.", time: "6 questions", href: "/listening?part=2" },
      { label: "Part 4 — News Item", description: "Listen to a news report and complete statements.", time: "5 questions", href: "/listening?part=3" },
      { label: "Part 5 — Discussion", description: "Listen to a group discussion and answer 8 questions.", time: "8 questions", href: "/listening?part=4" },
      { label: "Part 6 — Viewpoints", description: "Listen to a speaker presenting viewpoints and answer 6 questions.", time: "6 questions", href: "/listening?part=5" },
    ],
  },
];

export default function PracticePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Practice</h1>
          <p className="text-gray-500">Choose a section and task to start practicing. Each task uses real CELPIP format with AI feedback.</p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map(section => (
            <div key={section.key}>

              {/* Section Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{section.icon}</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{section.label}</h2>
                  <p className="text-sm text-gray-500">{section.description} • {section.time}</p>
                </div>
              </div>

              {/* Task Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {section.tasks.map((task, i) => (
                  <Link
                    key={task.href}
                    href={task.href}
                    className={`group block bg-white border ${section.color.border} rounded-xl p-5 hover:shadow-md transition-all hover:-translate-y-0.5`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${section.color.badge}`}>
                        {section.label} {section.key === "writing" ? `Task ${i + 1}` : section.key === "speaking" ? `Task ${i + 1}` : `Part ${i + 1}`}
                      </span>
                      <span className="text-xs text-gray-400">{task.time}</span>
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm mb-2 group-hover:text-blue-600 transition">
                      {task.label}
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">
                      {task.description}
                    </p>
                    <div className={`flex items-center gap-2 text-xs font-semibold text-white ${section.color.btn} px-3 py-1.5 rounded-lg w-fit transition`}>
                      Start Practice →
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
