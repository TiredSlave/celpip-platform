import Link from "next/link";
import { JsonLd } from "../components/JsonLd";
import { speakingTasks, writingTasks, type TemplateTask } from "./templates-data";

const faqs = [
  {
    q: "Are these templates free?",
    a: "Yes. The template library is completely free to browse and use.",
  },
  {
    q: "What is inside each template page?",
    a: "Each detailed page focuses on one task and explains the task goal, answer structure, scoring focus, and common mistakes.",
  },
  {
    q: "Can I memorize one template for every answer?",
    a: "No. Use templates as flexible structure, not as a fixed answer. Change your ideas, examples, and wording for each prompt.",
  },
  {
    q: "Why are Writing and Speaking separated?",
    a: "They are scored differently. Writing needs paragraph control and task completion, while Speaking needs quick organization, fluency, and natural delivery.",
  },
];

function TaskCard({ task }: { task: TemplateTask }) {
  const isWriting = task.skill === "Writing";
  return (
    <Link
      href={`/templates/${task.id}`}
      className={`group relative overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
        isWriting ? "border-blue-100 hover:border-blue-300" : "border-purple-100 hover:border-purple-300"
      }`}
    >
      <div
        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 transition group-hover:scale-125 ${
          isWriting ? "bg-blue-500" : "bg-purple-500"
        }`}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${
              isWriting ? "bg-blue-100" : "bg-purple-100"
            }`}
          >
            {task.icon}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${
              isWriting ? "bg-blue-600 text-white" : "bg-purple-600 text-white"
            }`}
          >
            {task.task}
          </span>
        </div>
        <h3 className="mt-5 text-xl font-black text-slate-950">{task.title}</h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{task.subtitle}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{task.time}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{task.output}</span>
        </div>
        <p className={`mt-5 text-sm font-black ${isWriting ? "text-blue-700" : "text-purple-700"}`}>
          View template guide →
        </p>
      </div>
    </Link>
  );
}

export default function TemplatesPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map(item => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }}
      />
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 left-10 h-40 w-40 rounded-full bg-cyan-300 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-white/20">
              CELPIP Writing & Speaking Templates
            </p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Free CELPIP templates for faster, clearer answers.
            </h1>
            <p className="mt-5 text-lg leading-8 text-blue-50">
              Start with examiner-style answer frameworks for every Writing and Speaking task. The templates are
              completely free and designed around high-score habits: clear task response, strong organization, natural
              vocabulary, accurate grammar, and confident delivery.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Free completely", "No hidden paywall for the template library."],
              ["Professional examiner experience", "Guidance based on scoring dimensions that matter in real responses."],
              ["Task-by-task direction", "Separate pages will show deeper strategy for each Writing and Speaking task."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl bg-white/12 p-5 ring-1 ring-white/20 backdrop-blur">
                <h2 className="text-lg font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-blue-50">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[2rem] bg-gradient-to-br from-blue-600 to-cyan-500 p-7 text-white shadow-lg">
            <p className="text-sm font-black uppercase tracking-wide text-blue-100">Writing templates</p>
            <h2 className="mt-2 text-3xl font-black">2 task types, paragraph-first guidance.</h2>
            <p className="mt-4 text-sm leading-7 text-blue-50">
              Writing templates help you organize email tone, survey opinions, paragraph flow, and task completion
              before you start typing.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {writingTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-gradient-to-br from-purple-700 to-fuchsia-600 p-7 text-white shadow-lg">
            <p className="text-sm font-black uppercase tracking-wide text-purple-100">Speaking templates</p>
            <h2 className="mt-2 text-3xl font-black">8 task types, quick-response speaking frameworks.</h2>
            <p className="mt-4 text-sm leading-7 text-purple-50">
              Speaking templates help you prepare fast, answer directly, and keep fluency under time pressure.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {speakingTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600">FAQ</p>
          <h2 className="mt-1 text-3xl font-black text-slate-900">Template questions</h2>
          <div className="mt-6 divide-y divide-slate-200">
            {faqs.map(item => (
              <div key={item.q} className="py-5">
                <h3 className="text-lg font-bold text-slate-900">{item.q}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
    </>
  );
}
