import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "./components/JsonLd";
import { buildPageMetadata, getSiteUrl, SITE_NAME, SITE_TAGLINE } from "./lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: SITE_NAME,
  path: "/",
});

const modules = [
  {
    title: "Writing",
    accent: "blue",
    href: "/practice/writing",
    description: "Practice emails and survey responses with timed tasks and AI feedback.",
    stats: "2 tasks | 53 minutes",
    points: ["Task 1 email practice", "Task 2 opinion response", "Band-style feedback"],
  },
  {
    title: "Reading",
    accent: "green",
    href: "/practice/reading",
    description: "Work through CELPIP-style reading parts with realistic passages and dropdown items.",
    stats: "4 parts | 55-60 minutes",
    points: ["Correspondence", "Apply information", "Information and viewpoints"],
  },
  {
    title: "Listening",
    accent: "orange",
    href: "/practice/listening",
    description: "Listen to generated audio tasks and answer under countdown conditions.",
    stats: "6 parts | timed answers",
    points: ["Segmented Task 1 audio", "Question countdowns", "Transcript review"],
  },
  {
    title: "Speaking",
    accent: "purple",
    href: "/practice/speaking",
    description: "Practice all speaking tasks, including picture description and prediction pairs.",
    stats: "8 tasks | prep timers",
    points: ["Image-based tasks", "Prediction practice", "AI evaluation"],
  },
] as const;

const accentClasses = {
  blue: {
    card: "border-blue-100 hover:border-blue-300",
    badge: "bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
  },
  green: {
    card: "border-green-100 hover:border-green-300",
    badge: "bg-green-50 text-green-700",
    dot: "bg-green-500",
  },
  orange: {
    card: "border-orange-100 hover:border-orange-300",
    badge: "bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
  },
  purple: {
    card: "border-purple-100 hover:border-purple-300",
    badge: "bg-purple-50 text-purple-700",
    dot: "bg-purple-500",
  },
};

const features = [
  "Timed practice that follows CELPIP-style pressure",
  "Fresh AI-generated tasks for repeated practice",
  "Reading and listening vocabulary saving",
  "Templates and strategy pages for repeatable answers",
  "Admin task library for controlled practice content",
  "Results review so learners can find weak areas",
];

const flow = [
  {
    step: "1",
    title: "Choose a skill",
    text: "Start with Writing, Reading, Listening, or Speaking depending on the learner's weakest area.",
  },
  {
    step: "2",
    title: "Practice under time",
    text: "Complete realistic tasks with countdowns, audio flow, and section rules close to the real exam.",
  },
  {
    step: "3",
    title: "Review and improve",
    text: "Check answers, save useful vocabulary, and study templates before trying another task.",
  },
];

const templateLinks = [
  { title: "Writing Task 1", href: "/templates/writing-task-1", label: "Email structure" },
  { title: "Writing Task 2", href: "/templates/writing-task-2", label: "Survey response" },
  { title: "Speaking Task 3", href: "/templates/speaking-task-3", label: "Picture description" },
  { title: "Speaking Task 4", href: "/templates/speaking-task-4", label: "Make predictions" },
];

const faqs = [
  {
    q: "What is CELPIP Lib?",
    a: "CELPIP Lib is an online CELPIP practice library for CELPIP-General exam preparation across Writing, Reading, Listening, and Speaking with timed tasks and AI feedback.",
  },
  {
    q: "Which CELPIP skills can I practice here?",
    a: "You can practice all four CELPIP skills: Writing (2 tasks), Reading (4 parts), Listening (6 parts), and Speaking (8 tasks).",
  },
  {
    q: "Does this platform include CELPIP templates?",
    a: "Yes. Free Writing and Speaking template guides explain task structure, scoring focus, and common mistakes for each task type.",
  },
  {
    q: "Is CELPIP Lib useful for Canadian immigration English requirements?",
    a: "Yes. CELPIP Lib helps learners build timed exam skills for CELPIP, which is widely used for Canadian permanent residence, citizenship, and professional licensing.",
  },
  {
    q: "Do I need an account to start practicing?",
    a: "You can explore templates and practice flows, and creating a free account lets you save results, vocabulary, and mock test progress.",
  },
];

export default function Home() {
  const siteUrl = getSiteUrl();

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: siteUrl,
            description: SITE_TAGLINE,
            inLanguage: "en-CA",
          },
          {
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            name: SITE_NAME,
            url: siteUrl,
            description: "AI-powered CELPIP test preparation for Writing, Reading, Listening, and Speaking.",
            areaServed: "CA",
            knowsAbout: [
              "CELPIP",
              "Canadian English language test",
              "English exam preparation",
              "Immigration English test",
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map(item => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          },
        ]}
      />
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_36%),radial-gradient(circle_at_top_right,#dcfce7,transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:flex lg:items-center lg:gap-14 lg:py-24">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              {SITE_NAME} — all four skills
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Practice CELPIP with timed, AI-generated tasks.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Build exam confidence with realistic Writing, Reading, Listening, and Speaking practice in one focused platform.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/practice"
                className="rounded-xl bg-blue-600 px-6 py-3 text-center text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
              >
                Start Practice
              </Link>
              <Link
                href="/templates"
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-center text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
              >
                View Templates
              </Link>
            </div>
          </div>

          <div className="mt-12 grid flex-1 gap-4 sm:grid-cols-2 lg:mt-0">
            {modules.map((module) => {
              const colors = accentClasses[module.accent];
              return (
                <Link
                  key={module.title}
                  href={module.href}
                  className={`rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${colors.card}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-black">{module.title}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${colors.badge}`}>
                      {module.stats}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{module.description}</p>
                  <div className="mt-5 space-y-2">
                    {module.points.map((point) => (
                      <div key={point} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                        {point}
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Why use this platform</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">Practice that feels closer to the real test.</h2>
            <p className="mt-4 text-slate-600 leading-7">
              The homepage should help learners quickly choose what to practice, then move into a task without confusion.
              This platform is strongest when it combines timing, realistic task formats, and review tools.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm">
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-green-600">Practice flow</p>
              <h2 className="mt-3 text-3xl font-black text-slate-950">A simple loop for improvement.</h2>
            </div>
            <Link href="/practice" className="text-sm font-bold text-blue-600 hover:underline">
              Open practice dashboard
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {flow.map((item) => (
              <div key={item.step} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white">
                  {item.step}
                </div>
                <h3 className="mt-5 text-lg font-black text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl">
            <p className="text-sm font-bold uppercase tracking-wide text-blue-200">Study before practice</p>
            <h2 className="mt-3 text-3xl font-black">Use templates to make your answers easier to organize.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Templates give learners a repeatable structure, so timed practice becomes less stressful and more consistent.
            </p>
            <Link
              href="/templates"
              className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-blue-50"
            >
              Browse all templates
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {templateLinks.map((template) => (
              <Link
                key={template.title}
                href={template.href}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{template.label}</p>
                <h3 className="mt-2 text-lg font-black text-slate-950">{template.title}</h3>
                <p className="mt-3 text-sm text-blue-600 font-bold">Open guide</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-100 py-16" id="faq">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">FAQ</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">Common questions about CELPIP practice</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {faqs.map(item => (
              <article key={item.q} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-black text-slate-950">{item.q}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-xl sm:p-10">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-3xl font-black">Ready to practice under exam timing?</h2>
                <p className="mt-3 max-w-2xl text-blue-100">
                  Start with one skill today, review your result, then repeat with a fresh task.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/practice"
                  className="rounded-xl bg-white px-6 py-3 text-center text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                >
                  Start Practice
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl border border-white/40 px-6 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
    </>
  );
}
