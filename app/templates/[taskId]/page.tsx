import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../lib/site-seo";
import { allTemplateTasks, getTemplateTask } from "../templates-data";

const criteria = [
  ["Task Fulfillment", "Answer every bullet point and match the email purpose."],
  ["Coherence", "Organize ideas in a logical order with clear paragraphing."],
  ["Vocabulary", "Use precise, natural words for the situation and relationship."],
  ["Readability", "Make the message easy to scan with a clear opening, body, and closing."],
  ["Grammar Control", "Use accurate sentence structure, tense, modals, and connectors."],
  ["Tone", "Choose the right level of politeness for the reader."],
];

const pairRows = [
  {
    who: "Manager, Company, Official",
    salutation: "Dear Sir or Madam, / To the Customer Service Manager,",
    signoff: "Yours faithfully,",
  },
  {
    who: "A boss or official whose name you know",
    salutation: "Dear Mr. Wilson, / Dear Ms. Chen,",
    signoff: "Yours sincerely, / Sincerely,",
  },
  {
    who: "A neighbor, colleague, or acquaintance",
    salutation: "Dear Mr. Patel, / Hi Maria,",
    signoff: "Best regards, / Kind regards,",
  },
  {
    who: "A close friend or family member",
    salutation: "Hi Alex, / Dear Aunt Linda,",
    signoff: "Best, / Warmly, / Take care,",
  },
];

const quickLinks = [
  ["Goal", "#goal"],
  ["Criteria", "#criteria"],
  ["Step 1", "#step-1"],
  ["Step 2", "#step-2"],
  ["Step 3", "#step-3"],
  ["Step 4", "#step-4"],
  ["Step 5", "#step-5"],
  ["Step 6", "#step-6"],
  ["Sample", "#sample"],
  ["Other Tasks", "#other-guides"],
];

const task2QuickLinks = [
  ["Goal", "#goal"],
  ["Step 1", "#step-1"],
  ["Step 2", "#step-2"],
  ["Step 3", "#step-3"],
  ["Step 4", "#step-4"],
  ["Step 5", "#step-5"],
  ["Step 6", "#step-6"],
  ["Sample", "#sample"],
  ["Other Tasks", "#other-guides"],
];

const paraphraseRows = [
  {
    strategy: "Passive Voice",
    original: "The city will close the downtown parking lot.",
    paraphrased: "The downtown parking lot would be closed by the city.",
  },
  {
    strategy: "Synonyms",
    original: "The company wants to reduce employee parking costs.",
    paraphrased: "The organization hopes to lower transportation expenses for staff.",
  },
  {
    strategy: "Parts of Speech",
    original: "The new schedule will benefit commuters.",
    paraphrased: "The new schedule will provide clear benefits for commuters.",
  },
  {
    strategy: "Word Order",
    original: "Residents should choose between a new park and a larger parking area.",
    paraphrased: "Between a larger parking area and a new park, residents should support the option that serves the community better.",
  },
];

const modalHierarchyRows = [
  {
    intensity: "High (Strong)",
    modals: "must, need to, have to",
    usage: "Use for urgent or essential advice.",
    example: "If you want to avoid delays, you must contact the office today.",
  },
  {
    intensity: "Medium (Standard)",
    modals: "ought to, should, had better",
    usage: "Use for practical advice that is clearly helpful.",
    example: "You ought to compare at least two options before deciding.",
  },
  {
    intensity: "Low (Soft)",
    modals: "could, might want to, may want to",
    usage: "Use for gentle suggestions or optional ideas.",
    example: "You could ask a colleague to review your application.",
  },
  {
    intensity: "Hypothetical",
    modals: "would, would probably, would definitely",
    usage: "Use when putting yourself in the other person's position.",
    example: "If I were you, I would prepare a short list of questions.",
  },
];

const tenseTimelineRows = [
  {
    stage: "Context (Before)",
    tense: "Past Perfect",
    usage: "Shows what had happened before the main event.",
    example: "Before I started my first job, I had depended on my parents for spending money.",
  },
  {
    stage: "Habit (Past)",
    tense: "Used to",
    usage: "Describes past states or repeated habits that are no longer true.",
    example: "I used to think earning money was much easier than it really is.",
  },
  {
    stage: "Nostalgia (Past)",
    tense: "Would",
    usage: "Describes repeated past actions, usually with a memory-like feeling.",
    example: "Every weekend, I would check online shops and imagine what I wanted to buy.",
  },
  {
    stage: "Action (During)",
    tense: "Simple Past",
    usage: "Tells the main events of the story in sequence.",
    example: "I worked eight hours, received my paycheck, and realized how much effort it had taken.",
  },
  {
    stage: "Reflection (After)",
    tense: "Present Perfect",
    usage: "Connects the past experience to your present life or opinion.",
    example: "Since then, I have become more careful with money.",
  },
];

const sceneGrammarRows = [
  {
    type: "Action",
    grammar: "Present Continuous",
    usage: "Use this for what people or animals are doing right now.",
    example: "A man is chopping logs near a large red barn.",
  },
  {
    type: "Impression",
    grammar: "3rd Person Singular State Verb",
    usage: "Use this for what something seems, looks, or appears to be.",
    example: "The work looks physically demanding.",
  },
];

const futureCertaintyRows = [
  {
    level: "High (Planned)",
    grammar: "Going to",
    usage: "Use when the evidence is very clear or the action already appears planned.",
    example: "The man is going to finish chopping the logs because he has already raised the axe.",
  },
  {
    level: "Medium (Logical)",
    grammar: "Will",
    usage: "Use for a logical prediction based on what you can see.",
    example: "The women will probably continue riding along the dirt path.",
  },
  {
    level: "Low (Uncertain)",
    grammar: "May / Might",
    usage: "Use when the result is possible but not certain.",
    example: "The girl might carry the apples into the barn if the basket becomes too heavy.",
  },
];

const comparativeErrorRows = [
  {
    rule: "Rule 1: -er Words (Short adjectives)",
    correct: "This option is cheaper. / It is faster.",
    error: "This option is more cheaper. / It is more faster.",
  },
  {
    rule: "Rule 2: Emphasizing (Big difference)",
    correct: "My option is much cheaper. / It is way faster.",
    error: "My option is more cheaper. / It is very faster.",
  },
];

const contextValueRows = [
  {
    option: "Option A (Car-shaped bed)",
    strategy: "This is more fun and exciting.",
    why: "Fits a toddler's personality and makes bedtime more enjoyable.",
  },
  {
    option: "Option B (Vintage wooden bed)",
    strategy: "This might be too boring or too serious.",
    why: "Does not fit a young child's age, interests, or daily routine.",
  },
];

const softSolutionRows = [
  {
    strategy: "The Hypothetical (Use Would)",
    direct: "You should stay at a hotel. / Go to an Airbnb.",
    polite: "I think the best approach would be for you to stay at a hotel. / It might be a better idea if we found an Airbnb.",
  },
  {
    strategy: "The Inclusive (Use We)",
    direct: "You need to solve this.",
    polite: "We can figure this out together. / Let's look for a solution.",
  },
  {
    strategy: "The Benefit (Explain Why)",
    direct: "My roommate said no.",
    polite: "This way, we can avoid tension with my roommate.",
  },
];

const visualTourRows = [
  {
    stage: "1. The Overview",
    action: "Describe the whole scene + size/scale.",
    example: "Right now, I'm looking at a massive brown bear sitting in the middle of a busy downtown street.",
  },
  {
    stage: "2. The Outer Layer",
    action: "Describe what surrounds the main object.",
    example: "On both sides, there are tall skyscrapers, stopped traffic, and a crowd of people on the sidewalk.",
  },
  {
    stage: "3. The Centerpiece",
    action: "Describe the main attraction.",
    example: "In the center, the bear is sitting calmly on the road directly in front of a red city bus.",
  },
  {
    stage: "4. The Details",
    action: "Mention one or two small features.",
    example: "There is even a Tim Hortons coffee cup on the pavement beside the bear, and a police officer is standing nearby.",
  },
];

const opinionParaphraseRows = [
  {
    method: "1. Use Synonyms",
    explanation: "Swap words with similar meanings.",
    example: "Grade → evaluate / teachers → educators / allow → permit",
  },
  {
    method: "2. Active → Passive",
    explanation: "Change the focus to the object.",
    example: "Students should grade teachers. → Teachers should be graded by their students.",
  },
  {
    method: "3. Change Order",
    explanation: "Move the main idea to the front.",
    example: "Allowing students to grade is good. → Allowing student feedback is a positive step.",
  },
];

function Em({ children }: { children: React.ReactNode }) {
  return <strong className="font-black text-blue-800">{children}</strong>;
}

function SectionCard({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-black uppercase tracking-wide text-blue-600">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2>
      <div className="mt-5 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  );
}

function WritingTask1Page() {
  const otherTasks = allTemplateTasks.filter(task => task.id !== "writing-task-1");

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-blue-700 via-indigo-700 to-cyan-600 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/templates" className="text-sm font-bold text-white/80 hover:text-white">
            ← Back to templates
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black ring-1 ring-white/20">
                CELPIP Writing · Task 1
              </span>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Email Template Guide
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-blue-50">
                Learn how to analyze the scenario, choose the correct tone, and build a complete CELPIP email with a
                clear opening, situation, problem, solution, and professional closing.
              </p>
            </div>
            <div className="rounded-3xl bg-white/12 p-5 text-sm font-bold ring-1 ring-white/20">
              <p>Time: 27 minutes</p>
              <p className="mt-2 text-white/80">Target: 150-200 words</p>
              <p className="mt-2 text-white/80">Format: one email</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="px-3 text-xs font-black uppercase tracking-wide text-slate-500">Quick Links</p>
            <nav className="mt-3 grid gap-1">
              {quickLinks.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-6">
          <SectionCard id="goal" eyebrow="Goal" title="General Basic Instruction">
            <p>
              CELPIP Writing Task 1 asks you to write an email for a practical situation. Your goal is to show that you
              can <Em>understand the relationship</Em>, <Em>answer all bullet points</Em>, and <Em>control tone</Em> in
              a message that feels natural and complete.
            </p>
          </SectionCard>

          <SectionCard id="criteria" eyebrow="Assessment Criteria" title="What Examiners Look For">
            <div className="grid gap-3 sm:grid-cols-2">
              {criteria.map(([name, detail]) => (
                <div key={name} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <h3 className="font-black text-slate-950">{name}</h3>
                  <p className="mt-1 text-slate-700">{detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-4">
              Key words to remember: <Em>purpose</Em>, <Em>tone</Em>, <Em>details</Em>, <Em>organization</Em>, and{" "}
              <Em>accuracy</Em>.
            </p>
          </SectionCard>

          <SectionCard id="step-1" eyebrow="Step 1" title="Analyze the Scenario">
            <p>
              Before writing, identify <Em>who you are writing to</Em>, <Em>why you are writing</Em>, and{" "}
              <Em>how formal</Em> the email should be. This is the Rule of Pairs: your salutation and sign-off must
              match the relationship.
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-blue-50 text-blue-900">
                  <tr>
                    <th className="p-3 font-black">Who is that?</th>
                    <th className="p-3 font-black">Salutation Template</th>
                    <th className="p-3 font-black">Matching Sign-off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {pairRows.map(row => (
                    <tr key={row.who}>
                      <td className="p-3 font-bold text-slate-900">{row.who}</td>
                      <td className="p-3 text-slate-700">{row.salutation}</td>
                      <td className="p-3 text-slate-700">{row.signoff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard id="step-2" eyebrow="Step 2" title="The Opening: Who + Why">
            <p>
              The opening should immediately show the reader why you are writing. Keep it direct and avoid long
              background details here.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-blue-50 p-4">
                <h3 className="font-black text-slate-950">Formula to Introduce Context</h3>
                <p className="mt-2">
                  I am writing regarding <Em>[object/event/service]</Em> that <Em>[time/place]</Em>.
                </p>
                <p className="mt-2 text-slate-600">
                  Example: I am writing regarding the laptop I purchased from your store last Friday.
                </p>
              </div>
              <div className="rounded-2xl bg-cyan-50 p-4">
                <h3 className="font-black text-slate-950">Formula to Express Purpose</h3>
                <p className="mt-2">
                  I am writing to <Em>[complain / request / explain / apologize]</Em> about <Em>[main issue]</Em>.
                </p>
                <p className="mt-2 text-slate-600">
                  Example: I am writing to request a repair because the device stopped working after two days.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="step-3" eyebrow="Step 3" title="The Situation">
            <p>
              Goal: introduce the background story. Set the scene so the reader understands the context before you
              complain, request something, or explain the next action.
            </p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Transition:</Em> To briefly review the situation,...
              </p>
              <p>
                <Em>Details:</Em> [Describe what happened / the object / the date].
              </p>
              <p>
                <Em>Example:</Em> To briefly review the situation, I ordered a dining table from your website on May 3,
                and it was delivered to my apartment on May 10.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-4" eyebrow="Step 4" title="The Problem / Details">
            <p>
              Goal: explain the specific issues, hazards, or details. This is the meat of the email, so be precise and
              show why the issue matters.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-amber-50 p-4">
                <h3 className="font-black text-slate-950">Grammar Booster: Subordinating Conjunctions</h3>
                <p className="mt-2">
                  <Em>Contrast words:</Em> although, even though, while, whereas, however
                </p>
                <p className="mt-2">
                  <Em>Cause/effect words:</Em> because, since, as, therefore, as a result, consequently
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4">
                <h3 className="font-black text-slate-950">Template</h3>
                <p className="mt-2">
                  <Em>Zoom-in:</Em> In terms of the problem / hazard,...
                </p>
                <p>
                  <Em>Detail 1:</Em> Use a complex sentence with because / although.
                </p>
                <p>
                  <Em>Detail 2:</Em> Expand with another connector such as furthermore / as a result.
                </p>
              </div>
            </div>
            <p className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <Em>Example:</Em> In terms of the problem, although the table looked fine at first, one of the legs was
              cracked, and the surface was scratched. As a result, it is unsafe to use, especially because I have two
              young children at home.
            </p>
          </SectionCard>

          <SectionCard id="step-5" eyebrow="Step 5" title="The Solution / Action">
            <p>
              Be polite but firm. Avoid weak or rude wording like "I want." Use modals to soften the request while
              keeping it strong.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-red-50 p-4">
                <h3 className="font-black text-slate-950">Strong</h3>
                <p className="mt-2">must, need to, should, urge, strongly recommend, be required to</p>
              </div>
              <div className="rounded-2xl bg-green-50 p-4">
                <h3 className="font-black text-slate-950">Polite</h3>
                <p className="mt-2">would suggest, could, may, ought to, would appreciate, would be grateful if</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Transition:</Em> Regarding [the solution/request],...
              </p>
              <p>
                <Em>Proposal:</Em> I strongly urge you to [action]. / I would suggest [action]. / I would appreciate it
                if you could [action].
              </p>
              <p>
                <Em>Alternative:</Em> Alternatively, [Plan B].
              </p>
              <p>
                <Em>Example:</Em> Regarding the solution, I would appreciate it if you could arrange a replacement by
                the end of this week. Alternatively, I would be willing to accept a full refund.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-6" eyebrow="Step 6" title="The Closing & Signature">
            <p>
              Goal: end professionally using standard phrases. A missing name or signature is a major formatting error,
              so always finish the email completely.
            </p>
            <div className="mt-4 rounded-2xl bg-blue-50 p-4">
              <h3 className="font-black text-slate-950">Grammar Booster: Future Expectations</h3>
              <p className="mt-2">
                Use standard phrases that assume the person will do the job: <Em>I look forward to hearing from you</Em>,
                <Em> I trust this matter will be resolved promptly</Em>, or <Em>Thank you in advance for your help</Em>.
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Closing:</Em> Thank you in advance for your attention to this matter. / I look forward to your
                prompt response.
              </p>
              <p>
                <Em>Sign-off:</Em> [Match Step 1 selection]
              </p>
              <p>
                <Em>Name:</Em> [Your Full Name]
              </p>
              <p>
                <Em>Example:</Em> Thank you in advance for your assistance. I look forward to hearing from you soon.
                Yours sincerely, Daniel Lee
              </p>
            </div>
          </SectionCard>

          <SectionCard id="sample" eyebrow="Sample Passage" title="Band-Strong Sample Email">
            <div className="rounded-2xl bg-slate-50 p-5 text-slate-800">
              <p>Dear Customer Service Manager,</p>
              <p className="mt-4">
                I am writing regarding the dining table I purchased from your website on May 3, and I would like to
                request a prompt solution to a serious delivery problem.
              </p>
              <p className="mt-4">
                <strong>To briefly review the situation</strong>, the table was delivered to my apartment on May 10.
                Although the delivery arrived on time, the product was not in acceptable condition.{" "}
                <strong>In terms of the problem</strong>, one leg was cracked, the surface had several deep scratches,
                and the box showed signs of damage. <strong>As a result</strong>, the table is unsafe to use, especially
                because I have two young children at home.
              </p>
              <p className="mt-4">
                <strong>Regarding the solution</strong>, I would appreciate it if you could arrange a replacement by the
                end of this week. Alternatively, I would be willing to accept a full refund if a replacement is not
                available. I have attached photos of the damage for your reference.
              </p>
              <p className="mt-4">
                <strong>Thank you in advance</strong> for your attention to this matter. I look forward to your prompt
                response.
              </p>
              <p className="mt-4">Yours faithfully,</p>
              <p>Daniel Lee</p>
            </div>
          </SectionCard>

          <SectionCard id="other-guides" eyebrow="More Templates" title="Quick Links to Other Task Guides">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherTasks.map(task => (
                <Link
                  key={task.id}
                  href={`/templates/${task.id}`}
                  className={`rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                    task.skill === "Writing" ? "border-blue-100 hover:border-blue-300" : "border-purple-100 hover:border-purple-300"
                  }`}
                >
                  <p className="text-2xl">{task.icon}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    {task.skill} · {task.task}
                  </p>
                  <h3 className="mt-1 font-black text-slate-950">{task.title}</h3>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

function WritingTask2Page() {
  const otherTasks = allTemplateTasks.filter(task => task.id !== "writing-task-2");

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-blue-700 via-indigo-700 to-cyan-600 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/templates" className="text-sm font-bold text-white/80 hover:text-white">
            ← Back to templates
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black ring-1 ring-white/20">
                CELPIP Writing · Task 2
              </span>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Survey Response Template Guide
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-blue-50">
                Learn how to choose the easier option, paraphrase the prompt, build two logical arguments, and use a
                high-scoring counter-argument before closing with a clear recommendation.
              </p>
            </div>
            <div className="rounded-3xl bg-white/12 p-5 text-sm font-bold ring-1 ring-white/20">
              <p>Time: 26 minutes</p>
              <p className="mt-2 text-white/80">Target: 150-200 words</p>
              <p className="mt-2 text-white/80">Format: survey response</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="px-3 text-xs font-black uppercase tracking-wide text-slate-500">Quick Links</p>
            <nav className="mt-3 grid gap-1">
              {task2QuickLinks.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-6">
          <SectionCard id="goal" eyebrow="Goal" title="How to Respond to a Survey">
            <p>
              CELPIP Writing Task 2 asks you to write a formal survey response. Your goal is to take a clear position,
              support it with <Em>two logical reasons</Em>, acknowledge the other choice, and finish with a strong final
              recommendation. The best option is not always your real opinion; it is the option you can explain more
              clearly under time pressure.
            </p>
          </SectionCard>

          <SectionCard id="step-1" eyebrow="Step 1" title="The Setup: Analyze the Options">
            <p>
              Goal: choose the option that is easier to support with logical reasons, even if it is not your personal
              opinion. Before writing, use the Rule of 3.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-blue-50 p-4">
                <h3 className="font-black text-slate-950">Reason 1</h3>
                <p className="mt-2">Choose a broad theme such as <Em>convenience</Em>, time, safety, or accessibility.</p>
              </div>
              <div className="rounded-2xl bg-cyan-50 p-4">
                <h3 className="font-black text-slate-950">Reason 2</h3>
                <p className="mt-2">Choose a different theme such as <Em>cost-saving</Em>, health, fairness, or long-term value.</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <h3 className="font-black text-slate-950">Other Option</h3>
                <p className="mt-2">Find one positive point to use in your <Em>counter-argument</Em>.</p>
              </div>
            </div>
            <p className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              Example: If the survey asks whether a company should add a gym or offer transit passes, you might choose
              transit passes because they save money and reduce commuting stress, while admitting that a gym could
              improve employee health.
            </p>
          </SectionCard>

          <SectionCard id="step-2" eyebrow="Step 2" title="The Introduction: Stance & Paraphrase">
            <p>
              Goal: state your opinion immediately and paraphrase the context using formal grammar. Do not simply
              replace one word; combine several paraphrasing strategies.
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-blue-50 text-blue-900">
                  <tr>
                    <th className="p-3 font-black">Strategy</th>
                    <th className="p-3 font-black">Original Sentence</th>
                    <th className="p-3 font-black">Paraphrased Version</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {paraphraseRows.map(row => (
                    <tr key={row.strategy}>
                      <td className="p-3 font-bold text-slate-900">{row.strategy}</td>
                      <td className="p-3 text-slate-700">{row.original}</td>
                      <td className="p-3 text-slate-700">{row.paraphrased}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Opening:</Em> To the [City Council / Manager / Department],
              </p>
              <p>
                <Em>Hook:</Em> After careful consideration, I strongly support the proposal that [Option A be
                implemented] rather than [Option B].
              </p>
              <p>
                <Em>Roadmap:</Em> While both proposals add value, I believe [Option A] offers broader benefits regarding
                [Theme 1] and [Theme 2].
              </p>
              <p>
                <Em>Example:</Em> To the Human Resources Department, after careful consideration, I strongly support the
                proposal that subsidized transit passes be introduced rather than an on-site fitness room. While both
                options could benefit employees, transit support would provide wider advantages in terms of affordability
                and daily convenience.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-3" eyebrow="Step 3" title="Body Paragraph 1: Primary Argument">
            <p>
              Goal: present your strongest reason first. If your first reason is about time, do not repeat time later.
              Develop one clear benefit with a practical explanation.
            </p>
            <div className="mt-4 rounded-2xl bg-blue-50 p-4">
              <h3 className="font-black text-slate-950">Grammar Booster: Clear Topic Sentences</h3>
              <p className="mt-2">
                <Em>Weak:</Em> This is good because people like it.
              </p>
              <p>
                <Em>Strong:</Em> The main advantage of this option is that it would make employees&apos; daily commute
                more affordable and predictable.
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Transition:</Em> First and foremost,...
              </p>
              <p>
                <Em>Detail:</Em> [Option A] would help [group] by [specific benefit].
              </p>
              <p>
                <Em>Benefit:</Em> As a result, [positive outcome].
              </p>
              <p>
                <Em>Example:</Em> First and foremost, subsidized transit passes would help employees reduce their monthly
                commuting expenses. As a result, staff members who rely on public transportation would feel less financial
                pressure and would be more likely to arrive at work on time.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-4" eyebrow="Step 4" title="Body Paragraph 2: Secondary Argument">
            <p>
              Goal: present a second, distinct benefit. If Body 1 was about money, make Body 2 about convenience,
              productivity, health, fairness, or the environment.
            </p>
            <div className="mt-4 rounded-2xl bg-cyan-50 p-4">
              <h3 className="font-black text-slate-950">Grammar Booster: Gerunds as Subjects</h3>
              <p className="mt-2">Start sentences with an "-ing" verb to sound sophisticated and concise.</p>
              <p>
                <Em>Weak:</Em> If people take the bus, it will help the environment.
              </p>
              <p>
                <Em>Strong:</Em> Encouraging employees to take public transit would also reduce traffic congestion and
                support the company&apos;s environmental goals.
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Transition:</Em> In addition,...
              </p>
              <p>
                <Em>Detail (Gerund):</Em> Providing / Encouraging / Reducing / Improving [action] would...
              </p>
              <p>
                <Em>Benefit:</Em> This would lead to [second positive result].
              </p>
              <p>
                <Em>Example:</Em> In addition, encouraging employees to use public transportation would reduce the demand
                for limited parking spaces. This would create a smoother start to the workday and reduce frustration for
                both staff and visitors.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-5" eyebrow="Step 5" title="Body Paragraph 3: The Counter-Argument">
            <p>
              Goal: acknowledge the other option to show you are reasonable, then explain why your choice is still better.
              This is the checkmate paragraph.
            </p>
            <div className="mt-4 rounded-2xl bg-amber-50 p-4">
              <h3 className="font-black text-slate-950">Grammar Booster: Contrast Markers</h3>
              <p className="mt-2">
                Use the <Em>Admittedly... However...</Em> structure. This is a hallmark of a high-scoring essay.
              </p>
              <p>
                <Em>Formula:</Em> Admittedly, [Option B] would [positive point]. However, [Option A] is still preferable
                because [stronger reason].
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Concession:</Em> Admittedly, [Option B] has some value because...
              </p>
              <p>
                <Em>Rebuttal:</Em> However, [Option A] would benefit more people / solve a more urgent problem / provide
                longer-term value.
              </p>
              <p>
                <Em>Example:</Em> Admittedly, an on-site fitness room could encourage healthier habits among employees.
                However, it would mainly benefit people who already have time to exercise at work, whereas transit support
                would help a much wider group every single day.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-6" eyebrow="Step 6" title="The Conclusion: Summary">
            <p>
              Goal: summarize your main points and give a final recommendation. Do not introduce new ideas in the
              conclusion.
            </p>
            <div className="mt-4 rounded-2xl bg-blue-50 p-4">
              <p>
                <Em>Summary:</Em> To sum up, based on the fact that [Option A] provides [Benefit 1] and [Benefit 2],...
              </p>
              <p>
                <Em>Final Push:</Em> I therefore strongly urge the [Council/Management] to proceed with [Option A].
              </p>
              <p>
                <Em>Example:</Em> To sum up, based on the fact that subsidized transit passes would lower commuting costs
                and reduce parking pressure, I strongly urge the company to proceed with this option.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="sample" eyebrow="Example Passage" title="Survey Prompt, Instructions, and Sample Response">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <h3 className="font-black">Prompt</h3>
              <p className="mt-3 text-slate-200">
                Your company has extra funding to improve employee benefits. Management is asking employees to choose one
                option: subsidized public transit passes or an on-site fitness room.
              </p>
              <h3 className="mt-5 font-black">Instructions</h3>
              <ul className="mt-3 space-y-2 text-slate-200">
                <li>• Choose one option.</li>
                <li>• Explain why your choice is better.</li>
                <li>• Support your opinion with reasons and examples.</li>
                <li>• Write about 150-200 words.</li>
              </ul>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-slate-800">
              <p>To the Human Resources Department,</p>
              <p className="mt-4">
                <strong>After careful consideration</strong>, I strongly support the proposal that subsidized public
                transit passes be introduced rather than an on-site fitness room. While both proposals add value, I
                believe transit support offers broader benefits regarding <strong>affordability</strong> and{" "}
                <strong>daily convenience</strong>.
              </p>
              <p className="mt-4">
                <strong>First and foremost</strong>, subsidized transit passes would help employees reduce their monthly
                commuting expenses. Many staff members already spend a significant amount on buses or trains, so lowering
                this cost would make the benefit practical and immediately useful.
              </p>
              <p className="mt-4">
                <strong>In addition</strong>, encouraging employees to use public transportation would reduce the demand
                for limited parking spaces. This would create a smoother start to the workday and reduce frustration for
                both staff and visitors.
              </p>
              <p className="mt-4">
                <strong>Admittedly</strong>, an on-site fitness room could encourage healthier habits.{" "}
                <strong>However</strong>, it would mainly benefit employees who have time to exercise at work, whereas
                transit passes would support a wider group every day.
              </p>
              <p className="mt-4">
                <strong>To sum up</strong>, because transit passes would lower commuting costs and reduce parking
                pressure, I strongly urge management to proceed with this option.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="other-guides" eyebrow="More Templates" title="Quick Links to Other Task Guides">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherTasks.map(task => (
                <Link
                  key={task.id}
                  href={`/templates/${task.id}`}
                  className={`rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                    task.skill === "Writing" ? "border-blue-100 hover:border-blue-300" : "border-purple-100 hover:border-purple-300"
                  }`}
                >
                  <p className="text-2xl">{task.icon}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    {task.skill} · {task.task}
                  </p>
                  <h3 className="mt-1 font-black text-slate-950">{task.title}</h3>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

function SpeakingTask1Page() {
  const otherTasks = allTemplateTasks.filter(task => task.id !== "speaking-task-1");

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-purple-800 via-indigo-800 to-fuchsia-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/templates" className="text-sm font-bold text-white/80 hover:text-white">
            ← Back to templates
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black ring-1 ring-white/20">
                CELPIP Speaking · Task 1
              </span>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Giving Advice Template Guide
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-purple-50">
                Learn how to greet naturally, prove your experience, and give three clear pieces of advice using modals,
                conditionals, and fully developed support.
              </p>
            </div>
            <div className="rounded-3xl bg-white/12 p-5 text-sm font-bold ring-1 ring-white/20">
              <p>Preparation: 30 seconds</p>
              <p className="mt-2 text-white/80">Speaking: 90 seconds</p>
              <p className="mt-2 text-white/80">Target: 3 advice points</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="px-3 text-xs font-black uppercase tracking-wide text-slate-500">Quick Links</p>
            <nav className="mt-3 grid gap-1">
              {[
                ["Goal", "#goal"],
                ["Criteria", "#criteria"],
                ["Step 1", "#step-1"],
                ["Step 2", "#step-2"],
                ["Advice 1", "#advice-1"],
                ["Advice 2", "#advice-2"],
                ["Advice 3", "#advice-3"],
                ["Closing", "#closing"],
                ["Sample", "#sample"],
                ["Other Tasks", "#other-guides"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-6">
          <SectionCard id="goal" eyebrow="Goal" title="Help Someone Solve a Problem">
            <p>
              CELPIP Speaking Task 1 asks you to give advice to a friend, colleague, or someone in a familiar situation.
              Your answer should sound helpful and organized while demonstrating <Em>high-level vocabulary</Em>,{" "}
              <Em>grammar range</Em>, and <Em>fully developed ideas</Em>.
            </p>
          </SectionCard>

          <SectionCard id="criteria" eyebrow="Assessment Criteria" title="What the Examiner Looks For">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-purple-50 p-4">
                <h3 className="font-black text-slate-950">Structure (Coherence)</h3>
                <p className="mt-2">
                  Use clear transitions such as <Em>First</Em>, <Em>Another thing</Em>, and <Em>Finally</Em> so your
                  logic is easy to follow.
                </p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4">
                <h3 className="font-black text-slate-950">Grammar (Range)</h3>
                <p className="mt-2">
                  Show modals and conditionals, especially <Em>must</Em>, <Em>ought to</Em>, and{" "}
                  <Em>If I were you</Em>.
                </p>
              </div>
              <div className="rounded-2xl bg-fuchsia-50 p-4">
                <h3 className="font-black text-slate-950">Detail (Task Fulfillment)</h3>
                <p className="mt-2">
                  Develop each idea with <Em>Reason + Consequence</Em>, not just a short suggestion.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="step-1" eyebrow="Step 1" title="Greet, Establish Context, and Validate Your Expertise">
            <p>
              Goal: greet the person, acknowledge the situation, and briefly explain why you are the right person to give
              advice. This makes your response sound natural instead of robotic.
            </p>
            <div className="mt-4 rounded-2xl bg-purple-50 p-4">
              <h3 className="font-black text-slate-950">Grammar Booster: Present Perfect Tense</h3>
              <p className="mt-2">
                To prove you are qualified to give advice, use the Present Perfect. It shows your experience started in
                the past and is still relevant now.
              </p>
              <p className="mt-2">
                <Em>Formula:</Em> Subject + have/has + past participle
              </p>
              <p>
                <Em>Keywords:</Em> have learned, have experienced, have done, have dealt with, have noticed
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Greeting:</Em> Hi [Name].
              </p>
              <p>
                <Em>Context:</Em> Acknowledge the situation: congratulations, thanks for asking, or I heard about...
              </p>
              <p>
                <Em>Validation:</Em> Explain your experience.
              </p>
              <p>
                <Em>Example:</Em> Hi Daniel, thanks for asking me about this. I know choosing a new apartment can be
                stressful, and I have moved several times in the past few years, so I have learned what details really
                matter.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-2" eyebrow="Step 2" title="The Main Advice: The 3-Point Strategy">
            <p>
              Goal: give three distinct pieces of advice using different grammar structures. Do not repeat{" "}
              <Em>should</Em> three times. Show a range of intensity.
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-purple-50 text-purple-900">
                  <tr>
                    <th className="p-3 font-black">Intensity</th>
                    <th className="p-3 font-black">Modals</th>
                    <th className="p-3 font-black">Usage</th>
                    <th className="p-3 font-black">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {modalHierarchyRows.map(row => (
                    <tr key={row.intensity}>
                      <td className="p-3 font-bold text-slate-950">{row.intensity}</td>
                      <td className="p-3 text-slate-700">{row.modals}</td>
                      <td className="p-3 text-slate-700">{row.usage}</td>
                      <td className="p-3 text-slate-700">{row.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard id="advice-1" eyebrow="Advice #1" title="The Strongest Point">
            <p>Use this for your most urgent advice.</p>
            <div className="mt-4 rounded-2xl bg-red-50 p-4">
              <h3 className="font-black text-slate-950">Grammar: 1st Conditional + Strong Modal</h3>
              <p className="mt-2">
                <Em>Rule:</Em> If + present tense (action), subject + must + base verb (result).
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>The Advice:</Em> If you want to [goal], you must [action].
              </p>
              <p>
                <Em>Support 1 (Reason):</Em> This is important because [reason].
              </p>
              <p>
                <Em>Support 2 (Consequence):</Em> Otherwise / As a result, [consequence].
              </p>
              <p>
                <Em>Example:</Em> If you want to choose the right apartment, you must visit the place in person. This is
                important because photos can hide problems like noise, poor lighting, or a bad layout.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="advice-2" eyebrow="Advice #2" title="The Practical Point">
            <p>Use this for standard, helpful advice that is realistic and easy to follow.</p>
            <div className="mt-4 rounded-2xl bg-indigo-50 p-4">
              <h3 className="font-black text-slate-950">Grammar: Medium Modals</h3>
              <p className="mt-2">
                <Em>Rule:</Em> Subject + ought to + base verb. Use <Em>ought to</Em> instead of repeating "should" to
                show stronger grammar range.
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>The Advice:</Em> You ought to [practical action].
              </p>
              <p>
                <Em>Support 1 (Detail):</Em> [Explain exactly how to do it].
              </p>
              <p>
                <Em>Support 2 (Benefit):</Em> This will help you [benefit].
              </p>
              <p>
                <Em>Example:</Em> You ought to compare the total monthly cost, not just the rent. For example, check
                utilities, parking, internet, and transportation, because these small expenses can change your budget
                quickly.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="advice-3" eyebrow="Advice #3" title="The Hypothetical Point">
            <p>Use this to offer a suggestion by putting yourself in their shoes.</p>
            <div className="mt-4 rounded-2xl bg-purple-50 p-4">
              <h3 className="font-black text-slate-950">Grammar: 2nd Conditional + Modal</h3>
              <p className="mt-2">
                <Em>Rule:</Em> If I were you, I would + base verb.
              </p>
              <p>
                <Em>Note:</Em> Always use <Em>were</Em>, never <Em>was</Em>.
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>The Advice:</Em> If I were you, I would [action].
              </p>
              <p>
                <Em>Support 1 (Detail):</Em> [Give a specific action].
              </p>
              <p>
                <Em>Support 2 (Benefit):</Em> That way, [positive result].
              </p>
              <p>
                <Em>Example:</Em> If I were you, I would talk to the landlord before signing anything. That way, you can
                ask about maintenance, rent increases, and any rules that might affect your daily life.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="closing" eyebrow="Step 3" title="The Closing">
            <p>Goal: finish with a quick, friendly sign-off. Keep it short. Do not summarize all the advice again.</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Rule:</Em> Use one encouragement sentence and one friendly closing.
              </p>
              <p>
                <Em>Example:</Em> I hope this helps, and I&apos;m sure you&apos;ll make a good decision. Let me know how
                it goes!
              </p>
            </div>
          </SectionCard>

          <SectionCard id="sample" eyebrow="Example with Instruction" title="Prompt and Band-Strong Sample Response">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <h3 className="font-black">Instruction</h3>
              <p className="mt-3 text-slate-200">
                Your friend is planning to move to a new apartment, but they are unsure how to choose the right place.
                Give your friend advice about what they should consider before making a decision.
              </p>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-slate-800">
              <p>
                Hi Daniel, thanks for asking me about this. I know choosing a new apartment can feel overwhelming, and{" "}
                <strong>I have moved several times</strong> in the past few years, so <strong>I have learned</strong>{" "}
                what details really matter.
              </p>
              <p className="mt-4">
                <strong>First</strong>, if you want to avoid problems later, you <strong>must visit the apartment in
                person</strong> before signing the lease. Photos can hide issues like noise, poor lighting, or a bad
                layout, and seeing the place yourself will give you a much more accurate impression.
              </p>
              <p className="mt-4">
                <strong>Another thing</strong> is that you <strong>ought to compare the total monthly cost</strong>, not
                just the rent. You need to include utilities, parking, internet, and transportation because those extra
                costs can make an affordable apartment much more expensive.
              </p>
              <p className="mt-4">
                <strong>Finally</strong>, if I were you, <strong>I would speak with the landlord</strong> before making a
                final decision. That way, you can ask about maintenance, rent increases, and building rules, which will
                help you avoid surprises after moving in.
              </p>
              <p className="mt-4">
                I hope this helps, and I&apos;m sure you&apos;ll make a smart choice. Let me know how it goes!
              </p>
            </div>
          </SectionCard>

          <SectionCard id="other-guides" eyebrow="More Templates" title="Quick Links to Other Task Guides">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherTasks.map(task => (
                <Link
                  key={task.id}
                  href={`/templates/${task.id}`}
                  className={`rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                    task.skill === "Writing" ? "border-blue-100 hover:border-blue-300" : "border-purple-100 hover:border-purple-300"
                  }`}
                >
                  <p className="text-2xl">{task.icon}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    {task.skill} · {task.task}
                  </p>
                  <h3 className="mt-1 font-black text-slate-950">{task.title}</h3>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

function SpeakingTask2Page() {
  const otherTasks = allTemplateTasks.filter(task => task.id !== "speaking-task-2");

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-purple-800 via-indigo-800 to-fuchsia-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/templates" className="text-sm font-bold text-white/80 hover:text-white">
            ← Back to templates
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black ring-1 ring-white/20">
                CELPIP Speaking · Task 2
              </span>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Personal Experience Template Guide
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-purple-50">
                Learn how to tell a coherent past story with a clear narrative arc, varied past tenses, and a meaningful
                reflection that connects the experience to who you are today.
              </p>
            </div>
            <div className="rounded-3xl bg-white/12 p-5 text-sm font-bold ring-1 ring-white/20">
              <p>Preparation: 30 seconds</p>
              <p className="mt-2 text-white/80">Speaking: 60 seconds</p>
              <p className="mt-2 text-white/80">Target: one clear story</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="px-3 text-xs font-black uppercase tracking-wide text-slate-500">Quick Links</p>
            <nav className="mt-3 grid gap-1">
              {[
                ["Goal", "#goal"],
                ["Criteria", "#criteria"],
                ["Step 1", "#step-1"],
                ["Step 2", "#step-2"],
                ["Used to / Would", "#used-to-would"],
                ["Stage 1", "#stage-1"],
                ["Stage 2", "#stage-2"],
                ["Stage 3", "#stage-3"],
                ["Sample", "#sample"],
                ["Other Tasks", "#other-guides"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-6">
          <SectionCard id="goal" eyebrow="Goal" title="Tell a Coherent, Engaging Story">
            <p>
              CELPIP Speaking Task 2 asks you to describe a personal experience. Your goal is to tell one past event in
              a way that is easy to follow, emotionally clear, and grammatically rich. A strong answer uses{" "}
              <Em>story structure</Em>, <Em>varied tenses</Em>, and a final <Em>reflection</Em>.
            </p>
          </SectionCard>

          <SectionCard id="criteria" eyebrow="Assessment Criteria" title="What the Examiner Looks For">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-purple-50 p-4">
                <h3 className="font-black text-slate-950">Structure (Coherence)</h3>
                <p className="mt-2">
                  They want a clear narrative arc: <Em>Introduction</Em>, <Em>Background</Em>, <Em>Action</Em>, and{" "}
                  <Em>Conclusion</Em>.
                </p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4">
                <h3 className="font-black text-slate-950">Grammar (Range)</h3>
                <p className="mt-2">
                  Use Simple Past for the main story, plus <Em>Past Perfect</Em>, <Em>used to / would</Em>, and{" "}
                  <Em>Present Perfect</Em>.
                </p>
              </div>
              <div className="rounded-2xl bg-fuchsia-50 p-4">
                <h3 className="font-black text-slate-950">Detail (Task Fulfillment)</h3>
                <p className="mt-2">
                  Answer the Wh- questions: <Em>who</Em>, <Em>what</Em>, <Em>where</Em>, <Em>when</Em>, and{" "}
                  <Em>why</Em>, then add a meaningful reflection.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="step-1" eyebrow="Step 1" title="The Opening">
            <p>
              Goal: introduce the topic clearly and connect your past experience to the present moment. Do not simply
              say, "I want to talk about..." Use Present Perfect to present the story as a life experience.
            </p>
            <div className="mt-4 rounded-2xl bg-purple-50 p-4">
              <h3 className="font-black text-slate-950">Grammar Booster: Present Perfect Tense</h3>
              <p className="mt-2">
                The Present Perfect bridges the gap between the past event and your current memory.
              </p>
              <p className="mt-2">
                <Em>Formula:</Em> Subject + have/has + past participle
              </p>
              <p>
                <Em>Keywords:</Em> have experienced, have visited, have faced, have learned, have remembered
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>The Hook:</Em> Introduce the general topic.
              </p>
              <p>
                <Em>The Specifics:</Em> Narrow it down to the event you will discuss.
              </p>
              <p>
                <Em>The Feeling:</Em> Briefly mention why it matters: memorable, challenging, embarrassing, meaningful.
              </p>
              <p>
                <Em>Example:</Em> I have experienced several important moments in my life, but one of the most memorable
                was the day I received my first paycheck from a part-time job. It was not a huge amount of money, but it
                changed the way I thought about responsibility.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-2" eyebrow="Step 2" title="The Narrative Arc: The 3-Stage Story">
            <p>
              Goal: tell the story in chronological order using three grammar zones: background before the event, main
              action during the event, and reflection after the event.
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-purple-50 text-purple-900">
                  <tr>
                    <th className="p-3 font-black">Stage</th>
                    <th className="p-3 font-black">Tense</th>
                    <th className="p-3 font-black">Usage</th>
                    <th className="p-3 font-black">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {tenseTimelineRows.map(row => (
                    <tr key={row.stage}>
                      <td className="p-3 font-bold text-slate-950">{row.stage}</td>
                      <td className="p-3 text-slate-700">{row.tense}</td>
                      <td className="p-3 text-slate-700">{row.usage}</td>
                      <td className="p-3 text-slate-700">{row.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard id="used-to-would" eyebrow="Grammar Alert" title="Used To vs. Would">
            <p>
              Examiners like hearing <Em>would</Em> used correctly for past memories, but it only works for repeated
              past actions, not past states.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-indigo-50 p-4">
                <h3 className="font-black text-slate-950">Used to</h3>
                <p className="mt-2">
                  Use <Em>used to</Em> for past states or habits that are no longer true.
                </p>
                <p className="mt-2">
                  Correct: I used to be nervous about talking to customers.
                </p>
              </div>
              <div className="rounded-2xl bg-purple-50 p-4">
                <h3 className="font-black text-slate-950">Would</h3>
                <p className="mt-2">
                  Use <Em>would</Em> only for repeated past actions, not states.
                </p>
                <p className="mt-2">
                  Correct: Every Saturday, I would help customers at the front desk.
                </p>
                <p className="mt-2 text-red-700">
                  Incorrect: I would be nervous about talking to customers.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="stage-1" eyebrow="Stage 1" title="The Background: Context">
            <p>Use this stage to set the scene before the main action starts.</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Grammar:</Em> Past Perfect + used to / would
              </p>
              <p>
                <Em>Rule:</Em> Before + simple past, subject + had + past participle.
              </p>
              <p>
                <Em>The Context:</Em> Before I received that first paycheck, I had always asked my parents for cash
                whenever I wanted to buy something.
              </p>
              <p>
                <Em>The Habit (State):</Em> I used to think money was easy to earn.
              </p>
              <p>
                <Em>The Habit (Action/Nostalgia):</Em> On weekends, I would walk through shopping malls and make long
                lists of things I wanted.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="stage-2" eyebrow="Stage 2" title="The Main Action: The Sequence">
            <p>Use this stage to tell the specific events of the day.</p>
            <div className="mt-4 rounded-2xl bg-purple-50 p-4">
              <h3 className="font-black text-slate-950">Grammar: Simple Past + Transition Words</h3>
              <p className="mt-2">
                <Em>Rule:</Em> Use time markers such as <Em>when</Em>, <Em>immediately</Em>, <Em>suddenly</Em>, and{" "}
                <Em>after that</Em> to connect the sequence.
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>The Turning Point:</Em> When I opened the envelope, I saw my name and the amount I had earned.
              </p>
              <p>
                <Em>The Reaction:</Em> I felt proud, but I was also surprised by how tired I was after only two weeks of
                work.
              </p>
              <p>
                <Em>The Sequence:</Em> Immediately, I called my parents, thanked them, and decided not to spend the money
                carelessly.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="stage-3" eyebrow="Stage 3" title="The Conclusion: The Reflection">
            <p>Use this stage to explain the significance of the story.</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Grammar:</Em> Since + Present Perfect
              </p>
              <p>
                <Em>Rule:</Em> Since + past event, subject + have/has + past participle.
              </p>
              <p>
                <Em>The Lesson:</Em> Since I started working, I have learned the true value of hard work and financial
                independence.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="sample" eyebrow="Example with Instruction" title="Prompt and Band-Strong Sample Response">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <h3 className="font-black">Instruction</h3>
              <p className="mt-3 text-slate-200">
                Talk about a time when you earned or received money for the first time. Explain what happened, how you
                felt, and why the experience was important to you.
              </p>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-slate-800">
              <p>
                I <strong>have experienced</strong> many important moments in my life, but one of the most memorable was
                the day I received my first paycheck from a part-time job. It happened when I was in high school, and it
                taught me a lot about responsibility.
              </p>
              <p className="mt-4">
                <strong>Before I received that paycheck</strong>, I <strong>had always asked</strong> my parents for
                money whenever I wanted to buy something. I <strong>used to think</strong> earning money was simple, and
                on weekends I <strong>would look</strong> at clothes or electronics online without thinking about the
                effort behind the price.
              </p>
              <p className="mt-4">
                <strong>When I opened the envelope</strong>, I saw my name and the amount I had earned after two long
                weeks of work. At first, I felt proud because it was my own money. However, I also realized how tired I
                was, so I decided not to spend it immediately. Instead, I saved most of it and used a small part to buy
                dinner for my parents.
              </p>
              <p className="mt-4">
                <strong>Since that experience</strong>, I <strong>have become</strong> much more careful with money. More
                importantly, I have learned that independence is not just about having money; it is about understanding
                the effort and discipline behind it.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="other-guides" eyebrow="More Templates" title="Quick Links to Other Task Guides">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherTasks.map(task => (
                <Link
                  key={task.id}
                  href={`/templates/${task.id}`}
                  className={`rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                    task.skill === "Writing" ? "border-blue-100 hover:border-blue-300" : "border-purple-100 hover:border-purple-300"
                  }`}
                >
                  <p className="text-2xl">{task.icon}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    {task.skill} · {task.task}
                  </p>
                  <h3 className="mt-1 font-black text-slate-950">{task.title}</h3>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

function SpeakingTask3Page() {
  const otherTasks = allTemplateTasks.filter(task => task.id !== "speaking-task-3");

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-purple-800 via-indigo-800 to-fuchsia-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/templates" className="text-sm font-bold text-white/80 hover:text-white">
            ← Back to templates
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black ring-1 ring-white/20">
                CELPIP Speaking · Task 3
              </span>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Describing a Scene Template Guide
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-purple-50">
                Master CELPIP Speaking Task 3 with a simple spatial template, powerful scene vocabulary, and pro tips
                to describe any picture vividly for someone who cannot see it.
              </p>
            </div>
            <div className="rounded-3xl bg-white/12 p-5 text-sm font-bold ring-1 ring-white/20">
              <p>Preparation: 30 seconds</p>
              <p className="mt-2 text-white/80">Speaking: 60 seconds</p>
              <p className="mt-2 text-white/80">Target: who, where, what</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="px-3 text-xs font-black uppercase tracking-wide text-slate-500">Quick Links</p>
            <nav className="mt-3 grid gap-1">
              {[
                ["Goal", "#goal"],
                ["Criteria", "#criteria"],
                ["Opening", "#step-1"],
                ["Organization", "#step-2"],
                ["Zone 1", "#zone-1"],
                ["Zone 2", "#zone-2"],
                ["Zone 3", "#zone-3"],
                ["Zone 4", "#zone-4"],
                ["Closing", "#closing"],
                ["Sample", "#sample"],
                ["Other Tasks", "#other-guides"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-6">
          <SectionCard id="goal" eyebrow="Goal" title="Describe the Picture for Someone Who Cannot See It">
            <p>
              CELPIP Speaking Task 3 asks you to describe a picture in detail. You must systematically cover the{" "}
              <Em>who</Em>, <Em>where</Em>, and <Em>what</Em> while demonstrating precise spatial vocabulary and accurate
              grammar. Your listener should be able to imagine the picture from your words.
            </p>
          </SectionCard>

          <SectionCard id="criteria" eyebrow="Assessment Criteria" title="What the Examiner Looks For">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-purple-50 p-4">
                <h3 className="font-black text-slate-950">Structure (Spatial Flow)</h3>
                <p className="mt-2">
                  Move logically like a camera: <Em>foreground to background</Em> or <Em>left to right</Em>. Do not jump
                  randomly around the image.
                </p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4">
                <h3 className="font-black text-slate-950">Grammar (Accuracy)</h3>
                <p className="mt-2">
                  Use <Em>Present Continuous</Em> for actions and state verbs with the correct <Em>-s</Em>, such as "he
                  seems" or "the work looks."
                </p>
              </div>
              <div className="rounded-2xl bg-fuchsia-50 p-4">
                <h3 className="font-black text-slate-950">Vocabulary (Precision)</h3>
                <p className="mt-2">
                  Use specific nouns and verbs, such as <Em>barn</Em>, <Em>harvesting</Em>, and <Em>chopping</Em>,
                  instead of general words like house, doing, and cutting.
                </p>
              </div>
            </div>
            <p className="mt-4 rounded-2xl bg-slate-50 p-4">
              Note: scene vocabulary depends entirely on the picture, so regular practice with different images is the
              best way to build flexible vocabulary for this task.
            </p>
          </SectionCard>

          <SectionCard id="step-1" eyebrow="Step 1" title="The Opening: The Starter Phrase">
            <p>
              Goal: begin clearly by identifying the setting and the general atmosphere. Do not start by listing random
              items immediately.
            </p>
            <div className="mt-4 rounded-2xl bg-purple-50 p-4">
              <h3 className="font-black text-slate-950">Grammar Booster: Articles (A vs. The)</h3>
              <p className="mt-2">
                Since the examiner cannot see the image, introduce new items with <Em>a</Em> or <Em>an</Em>. Once you
                have mentioned them, continue with <Em>the</Em>.
              </p>
              <p className="mt-2">
                <Em>Rule:</Em> Start with A. Continue with The.
              </p>
              <p>
                <Em>Example:</Em> I see <Em>a</Em> man. <Em>The</Em> man is working hard.
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>The Setting:</Em> Where is this? A park, an office, a farm, a street, a store, or a school.
              </p>
              <p>
                <Em>The Atmosphere:</Em> What is the vibe? Busy, calm, chaotic, wintery, cheerful, crowded, or peaceful.
              </p>
              <p>
                <Em>Example:</Em> This picture appears to show a busy farm scene on a clear day. The overall atmosphere
                seems active and productive because several people are working in different areas.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-2" eyebrow="Step 2" title="Organization: Spatial Indicators">
            <p>
              Goal: move through the picture logically using signpost words so the listener does not get lost. Alternate
              between describing <Em>actions</Em> and describing <Em>impressions</Em>.
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-purple-50 text-purple-900">
                  <tr>
                    <th className="p-3 font-black">Type</th>
                    <th className="p-3 font-black">Grammar</th>
                    <th className="p-3 font-black">Usage</th>
                    <th className="p-3 font-black">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {sceneGrammarRows.map(row => (
                    <tr key={row.type}>
                      <td className="p-3 font-bold text-slate-950">{row.type}</td>
                      <td className="p-3 text-slate-700">{row.grammar}</td>
                      <td className="p-3 text-slate-700">{row.usage}</td>
                      <td className="p-3 text-slate-700">{row.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-2xl bg-amber-50 p-4">
              <h3 className="font-black text-slate-950">Grammar Alert: The "S" for 3rd Person</h3>
              <p className="mt-2">
                If the subject is <Em>he</Em>, <Em>she</Em>, or <Em>it</Em>, add an <Em>-s</Em> to state verbs: he
                seems, she looks, it appears, the work looks.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="zone-1" eyebrow="Zone 1" title="The Center / Foreground">
            <p>Start with the most obvious element in the picture.</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Spatial Marker:</Em> In the center of the picture... / In the foreground...
              </p>
              <p>
                <Em>Action (Present Continuous):</Em> Two women are riding brown horses along a dirt path.
              </p>
              <p>
                <Em>Impression (State Verb):</Em> They seem quite relaxed as they enjoy their ride.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="zone-2" eyebrow="Zone 2" title="The Left Side">
            <p>Move your camera to the left after you describe the center.</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Spatial Marker:</Em> On the left side...
              </p>
              <p>
                <Em>Action (Present Continuous):</Em> Two men are kneeling in a field and planting crops.
              </p>
              <p>
                <Em>Impression (State Verb):</Em> The work looks physically demanding.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="zone-3" eyebrow="Zone 3" title="The Right Side">
            <p>Move your camera to the right and describe two specific actions if possible.</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Spatial Marker:</Em> On the right side...
              </p>
              <p>
                <Em>Action 1 (Singular):</Em> A man is chopping logs with an axe near a large red barn.
              </p>
              <p>
                <Em>Action 2 (Singular):</Em> Behind him, a woman is picking apples from a tall tree.
              </p>
              <p>
                <Em>Impression (State Verb):</Em> The harvest appears to be very plentiful this year.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="zone-4" eyebrow="Zone 4" title="The Background">
            <p>Finish with the distant details and landscape.</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Spatial Marker:</Em> In the background...
              </p>
              <p>
                <Em>Description:</Em> I can see a large white farmhouse and some rolling green hills.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="closing" eyebrow="Step 3" title="The Closing">
            <p>Goal: finish with a simple summary sentence that gives an overall impression.</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Example:</Em> Overall, it looks like a peaceful but busy day on the farm, and everyone seems focused
                on finishing their work.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="sample" eyebrow="CELPIP Speaking Part 3" title="Instruction, Picture, and Sample Response">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <h3 className="font-black">Instruction</h3>
              <p className="mt-3 text-slate-200">
                Describe the picture to someone who cannot see it. Talk about the people, the place, the actions, and any
                important details you notice.
              </p>
              <h3 className="mt-5 font-black">Picture</h3>
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <img
                  src="/template-images/speaking-task-3.png"
                  alt="Farm scene with riders, workers, a red barn, apple picking, and green hills"
                  className="h-auto w-full object-cover"
                />
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-slate-800">
              <p>
                This picture appears to show <strong>a busy farm scene</strong> on a clear day. The overall atmosphere{" "}
                <strong>seems</strong> peaceful but productive because several people are working or enjoying outdoor
                activities.
              </p>
              <p className="mt-4">
                <strong>In the foreground</strong>, two women <strong>are riding</strong> brown horses along a dirt path.
                <strong> The women seem</strong> relaxed, and the horses look calm as they move through the open area.
              </p>
              <p className="mt-4">
                <strong>On the left side</strong>, two men <strong>are kneeling</strong> in a field and planting crops.
                The work <strong>looks</strong> physically demanding because they are bending close to the ground.
              </p>
              <p className="mt-4">
                <strong>On the right side</strong>, a man <strong>is chopping</strong> logs with an axe near a large red
                barn. Behind him, a woman <strong>is picking</strong> apples from a tall tree, and the harvest{" "}
                <strong>appears</strong> to be plentiful.
              </p>
              <p className="mt-4">
                <strong>In the background</strong>, I can see a large white farmhouse and rolling green hills. Overall,
                it looks like a hardworking rural community on a calm and sunny day.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="other-guides" eyebrow="More Templates" title="Quick Links to Other Task Guides">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherTasks.map(task => (
                <Link
                  key={task.id}
                  href={`/templates/${task.id}`}
                  className={`rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                    task.skill === "Writing" ? "border-blue-100 hover:border-blue-300" : "border-purple-100 hover:border-purple-300"
                  }`}
                >
                  <p className="text-2xl">{task.icon}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    {task.skill} · {task.task}
                  </p>
                  <h3 className="mt-1 font-black text-slate-950">{task.title}</h3>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

function SpeakingTask4Page() {
  const otherTasks = allTemplateTasks.filter(task => task.id !== "speaking-task-4");

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-purple-800 via-indigo-800 to-fuchsia-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/templates" className="text-sm font-bold text-white/80 hover:text-white">
            ← Back to templates
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black ring-1 ring-white/20">
                CELPIP Speaking · Task 4
              </span>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Making Predictions Template Guide
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-purple-50">
                Learn how to predict what will happen next in a picture using visual evidence, clear time markers, and
                different future forms to show certainty.
              </p>
            </div>
            <div className="rounded-3xl bg-white/12 p-5 text-sm font-bold ring-1 ring-white/20">
              <p>Preparation: 30 seconds</p>
              <p className="mt-2 text-white/80">Speaking: 60 seconds</p>
              <p className="mt-2 text-white/80">Target: future sequence</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="px-3 text-xs font-black uppercase tracking-wide text-slate-500">Quick Links</p>
            <nav className="mt-3 grid gap-1">
              {[
                ["Goal", "#goal"],
                ["Criteria", "#criteria"],
                ["Opening", "#step-1"],
                ["Predictions", "#step-2"],
                ["Closing", "#closing"],
                ["Sample", "#sample"],
                ["Other Tasks", "#other-guides"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-6">
          <SectionCard id="goal" eyebrow="Goal" title="Predict What Will Happen Next">
            <p>
              CELPIP Speaking Task 4 asks you to predict what will happen in the picture over the next few minutes. You
              must use <Em>evidence from the image</Em> to support your imagination and use a variety of{" "}
              <Em>future tenses</Em> to show different levels of certainty.
            </p>
          </SectionCard>

          <SectionCard id="criteria" eyebrow="Assessment Criteria" title="What the Examiner Looks For">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-purple-50 p-4">
                <h3 className="font-black text-slate-950">Structure (Time Markers)</h3>
                <p className="mt-2">
                  Use a clear sequence: <Em>In the next few minutes</Em>, <Em>After that</Em>, and <Em>Finally</Em>.
                </p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4">
                <h3 className="font-black text-slate-950">Grammar (Future Forms)</h3>
                <p className="mt-2">
                  Do not use "will" for everything. Show plans with <Em>going to</Em>, logical predictions with{" "}
                  <Em>will</Em>, and possibilities with <Em>might</Em>.
                </p>
              </div>
              <div className="rounded-2xl bg-fuchsia-50 p-4">
                <h3 className="font-black text-slate-950">Vocabulary (Articles)</h3>
                <p className="mt-2">
                  Since the people are already introduced from the picture, switch from <Em>a</Em> to <Em>the</Em>: the
                  man, the women, the girl, the barn.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="step-1" eyebrow="Step 1" title="The Opening: The Starter Phrase">
            <p>
              Goal: start immediately with a clear time frame. Do not waste time with a long introduction or full picture
              description.
            </p>
            <div className="mt-4 rounded-2xl bg-purple-50 p-4">
              <h3 className="font-black text-slate-950">Grammar Booster: The Time Frame</h3>
              <p className="mt-2">
                <Em>Phrase:</Em> In the next few minutes... / In the next 10 minutes...
              </p>
              <p>
                <Em>Example:</Em> In the next few minutes, several things are going to happen on this busy farm because
                everyone in the picture is already in the middle of an activity.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-2" eyebrow="Step 2" title="Making Predictions: The 3-Level Certainty Strategy">
            <p>
              Goal: use three different future forms to show grammar range. Choose the grammar based on how much visual
              evidence you have.
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-purple-50 text-purple-900">
                  <tr>
                    <th className="p-3 font-black">Certainty Level</th>
                    <th className="p-3 font-black">Grammar Form</th>
                    <th className="p-3 font-black">Usage & Logic</th>
                    <th className="p-3 font-black">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {futureCertaintyRows.map(row => (
                    <tr key={row.level}>
                      <td className="p-3 font-bold text-slate-950">{row.level}</td>
                      <td className="p-3 text-slate-700">{row.grammar}</td>
                      <td className="p-3 text-slate-700">{row.usage}</td>
                      <td className="p-3 text-slate-700">{row.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-red-50 p-4">
                <h3 className="font-black text-slate-950">High Certainty</h3>
                <p className="mt-2">
                  <Em>Going to:</Em> The man is going to split the log because his axe is already in position.
                </p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4">
                <h3 className="font-black text-slate-950">Medium Certainty</h3>
                <p className="mt-2">
                  <Em>Will:</Em> The riders will probably continue down the path toward the farmhouse.
                </p>
              </div>
              <div className="rounded-2xl bg-purple-50 p-4">
                <h3 className="font-black text-slate-950">Low Certainty</h3>
                <p className="mt-2">
                  <Em>Might:</Em> The girl might take the apples into the barn after the basket is full.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="closing" eyebrow="Step 3" title="The Closing">
            <p>Goal: finish with a quick final prediction that wraps up the story.</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Keyword:</Em> Finally...
              </p>
              <p>
                <Em>Example:</Em> Finally, the whole group will probably finish their work before sunset, and the farm
                will become much quieter.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="sample" eyebrow="CELPIP Speaking Part 4" title="Instruction, Shared Picture, and Sample Response">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <h3 className="font-black">Instruction</h3>
              <p className="mt-3 text-slate-200">
                Look at the picture and predict what will happen next. Explain what the people are likely to do and
                support your predictions with details from the image.
              </p>
              <h3 className="mt-5 font-black">Picture</h3>
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <img
                  src="/template-images/speaking-task-3.png"
                  alt="Farm scene with riders, workers, a red barn, apple picking, and green hills"
                  className="h-auto w-full object-cover"
                />
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-slate-800">
              <p>
                <strong>In the next few minutes</strong>, several things are going to happen on this farm because all the
                people in the picture are already involved in different activities.
              </p>
              <p className="mt-4">
                First, <strong>the man near the barn is going to split the log</strong> because he has already lifted the
                axe and is standing beside a pile of wood. After that, he <strong>will probably stack the firewood</strong>{" "}
                next to the barn so it can dry properly.
              </p>
              <p className="mt-4">
                Meanwhile, <strong>the two women on the horses will continue riding</strong> along the dirt path. They
                look relaxed, so they may be enjoying a short ride around the farm rather than doing heavy work.
              </p>
              <p className="mt-4">
                On the right side, <strong>the girl might carry the apples</strong> toward the barn if her basket becomes
                full. The workers on the left <strong>will likely keep planting crops</strong> because the field still
                has a lot of open space.
              </p>
              <p className="mt-4">
                <strong>Finally</strong>, everyone will probably finish their tasks before sunset, and the farm will
                become much quieter in the evening.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="other-guides" eyebrow="More Templates" title="Quick Links to Other Task Guides">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherTasks.map(task => (
                <Link
                  key={task.id}
                  href={`/templates/${task.id}`}
                  className={`rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                    task.skill === "Writing" ? "border-blue-100 hover:border-blue-300" : "border-purple-100 hover:border-purple-300"
                  }`}
                >
                  <p className="text-2xl">{task.icon}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    {task.skill} · {task.task}
                  </p>
                  <h3 className="mt-1 font-black text-slate-950">{task.title}</h3>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

function SpeakingTask5Page() {
  const otherTasks = allTemplateTasks.filter(task => task.id !== "speaking-task-5");

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-purple-800 via-indigo-800 to-fuchsia-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/templates" className="text-sm font-bold text-white/80 hover:text-white">
            ← Back to templates
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black ring-1 ring-white/20">
                CELPIP Speaking · Task 5
              </span>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Comparing and Persuading Template Guide
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-purple-50">
                Learn how to politely reject another option, compare two choices with accurate comparatives, read prices
                naturally, and persuade someone to agree with your decision.
              </p>
            </div>
            <div className="rounded-3xl bg-white/12 p-5 text-sm font-bold ring-1 ring-white/20">
              <p>Selection: 60 seconds</p>
              <p className="mt-2 text-white/80">Speaking: 60 seconds</p>
              <p className="mt-2 text-white/80">Target: compare + persuade</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="px-3 text-xs font-black uppercase tracking-wide text-slate-500">Quick Links</p>
            <nav className="mt-3 grid gap-1">
              {[
                ["Goal", "#goal"],
                ["Criteria", "#criteria"],
                ["Opening", "#step-1"],
                ["Comparison", "#step-2"],
                ["Price", "#price"],
                ["Value", "#value"],
                ["Detail", "#detail"],
                ["Conclusion", "#closing"],
                ["Sample", "#sample"],
                ["Other Tasks", "#other-guides"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-6">
          <SectionCard id="goal" eyebrow="Goal" title="Persuade Someone to Agree with Your Choice">
            <p>
              CELPIP Speaking Task 5 asks you to persuade a friend, family member, or colleague to change their mind and
              agree with your choice. You must compare two options using <Em>comparative adjectives</Em>,{" "}
              <Em>specific data</Em>, and a polite but confident tone.
            </p>
          </SectionCard>

          <SectionCard id="criteria" eyebrow="Assessment Criteria" title="What the Examiner Looks For">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-purple-50 p-4">
                <h3 className="font-black text-slate-950">Structure (Soft Rejection)</h3>
                <p className="mt-2">
                  You cannot simply say "your choice is bad." Acknowledge their idea first, then disagree politely.
                </p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4">
                <h3 className="font-black text-slate-950">Grammar (Comparatives)</h3>
                <p className="mt-2">
                  Use <Em>cheaper</Em>, <Em>faster</Em>, <Em>much cheaper</Em>, and <Em>more expensive</Em> correctly.
                  Never say <Em>more cheaper</Em>.
                </p>
              </div>
              <div className="rounded-2xl bg-fuchsia-50 p-4">
                <h3 className="font-black text-slate-950">Detail (Reading Numbers)</h3>
                <p className="mt-2">
                  Read prices naturally. $100 is <Em>a hundred dollars</Em>. $699.99 is{" "}
                  <Em>six ninety-nine ninety-nine</Em> or <Em>almost seven hundred dollars</Em>.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="step-1" eyebrow="Step 1" title="The Opening: Greeting & Soft Rejection">
            <p>
              Goal: be polite but firm. Show that you have read their suggestion, but make it clear that you are sticking
              to your own choice.
            </p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Greeting:</Em> Hi [Name].
              </p>
              <p>
                <Em>Acknowledgment:</Em> I saw your suggestion to choose [their option].
              </p>
              <p>
                <Em>The Pivot:</Em> I understand why you chose it; however,...
              </p>
              <p>
                <Em>The Thesis:</Em> I believe [my option] is the better choice.
              </p>
              <p>
                <Em>Example:</Em> Hi Sarah, I saw your suggestion to choose the vintage wooden bed. I understand why you
                liked it because it looks durable; however, I believe the car-shaped bed is a better choice for Liam.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-2" eyebrow="Step 2" title="The Comparison: The 3-Point Strategy">
            <p>
              Goal: compare the items point by point. Always follow this order: <Em>Price</Em>,{" "}
              <Em>Contextual Value</Em>, then <Em>Specific Detail</Em>.
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-purple-50 text-purple-900">
                  <tr>
                    <th className="p-3 font-black">Rule</th>
                    <th className="p-3 font-black">Correct Usage</th>
                    <th className="p-3 font-black">Common Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {comparativeErrorRows.map(row => (
                    <tr key={row.rule}>
                      <td className="p-3 font-bold text-slate-950">{row.rule}</td>
                      <td className="p-3 text-slate-700">{row.correct}</td>
                      <td className="p-3 text-red-700">{row.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard id="price" eyebrow="Point 1" title="The Price: Always First">
            <p>
              Your first argument should usually be about money. Use specific numbers and read them naturally.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-green-50 p-4">
                <h3 className="font-black text-slate-950">If Your Option Is Cheaper</h3>
                <p className="mt-2">
                  <Em>Template:</Em> First, my option is much cheaper. It costs [price], while your option costs [price],
                  so we can save [amount].
                </p>
                <p className="mt-2">
                  <Em>Example:</Em> First, the car-shaped bed is much cheaper because it costs a hundred and eighty
                  dollars, while the wooden bed costs three hundred dollars.
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <h3 className="font-black text-slate-950">If Your Option Is More Expensive</h3>
                <p className="mt-2">
                  <Em>Template:</Em> First, my option is slightly more expensive. However, it offers better value because
                  [feature / durability / included service].
                </p>
                <p className="mt-2">
                  <Em>Example:</Em> First, this laptop is more expensive. However, it includes a longer warranty and a
                  faster processor, so it is better value in the long run.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="value" eyebrow="Point 2" title="Contextual Value: Features That Matter">
            <p>
              The Context Rule is crucial for high scores: do not use random adjectives. Choose words that fit the person
              and the situation.
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-purple-50 text-purple-900">
                  <tr>
                    <th className="p-3 font-black">Option</th>
                    <th className="p-3 font-black">Adjective Strategy</th>
                    <th className="p-3 font-black">Why?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {contextValueRows.map(row => (
                    <tr key={row.option}>
                      <td className="p-3 font-bold text-slate-950">{row.option}</td>
                      <td className="p-3 text-slate-700">{row.strategy}</td>
                      <td className="p-3 text-slate-700">{row.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-purple-50 p-4">
                <h3 className="font-black text-slate-950">Convenience</h3>
                <p className="mt-2">This option is more convenient because it is easier to move, clean, or use daily.</p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4">
                <h3 className="font-black text-slate-950">Fun</h3>
                <p className="mt-2">This option is more exciting and playful, which fits a child or party situation.</p>
              </div>
              <div className="rounded-2xl bg-fuchsia-50 p-4">
                <h3 className="font-black text-slate-950">Comfort</h3>
                <p className="mt-2">This option is more comfortable because it has better support, space, or design.</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="detail" eyebrow="Point 3" title="The Detail: Specific Comparison">
            <p>Compare a specific detail to seal the deal.</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Template:</Em> Finally, even though your choice has [Detail A], I think [Detail B] is better
                because...
              </p>
              <p>
                <Em>Example:</Em> Finally, even though your choice is made of solid wood, my option has side rails and a
                lower frame, which makes it safer and easier for a small child to use.
              </p>
              <p>
                <Em>Extra:</Em> My option is lighter, which makes it easier to carry and rearrange in the room.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="closing" eyebrow="Step 3" title="The Conclusion">
            <p>Goal: use a confident closing sentence that repeats your stance and asks for agreement.</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Structure:</Em> Reiterate your choice + ask for confirmation.
              </p>
              <p>
                <Em>Example:</Em> So, for the price, the design, and the safety features, I really think we should go
                with the car-shaped bed. What do you think?
              </p>
            </div>
          </SectionCard>

          <SectionCard id="sample" eyebrow="Example with Instruction" title="Prompt, Options, and Sample Response">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <h3 className="font-black">Instruction</h3>
              <p className="mt-3 text-slate-200">
                You and your sister are buying a bed for your four-year-old nephew. Your sister suggested a vintage
                wooden bed for $300, but you prefer a car-shaped bed for $180. Persuade your sister to choose your
                option.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-4">
                  <h4 className="font-black">Your Choice</h4>
                  <p className="mt-2 text-slate-200">Car-shaped bed · $180 · playful design · low frame · side rails</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <h4 className="font-black">Their Choice</h4>
                  <p className="mt-2 text-slate-200">Vintage wooden bed · $300 · solid wood · classic design</p>
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-slate-800">
              <p>
                Hi Sarah, I saw your suggestion to choose the vintage wooden bed. I understand why you liked it because it
                looks strong and classic; <strong>however</strong>, I believe the car-shaped bed is the better choice for
                Liam.
              </p>
              <p className="mt-4">
                <strong>First</strong>, it is <strong>much cheaper</strong>. The car bed costs{" "}
                <strong>a hundred and eighty dollars</strong>, while the wooden bed costs{" "}
                <strong>three hundred dollars</strong>, so we can save a hundred and twenty dollars for bedding or toys.
              </p>
              <p className="mt-4">
                <strong>Second</strong>, the car bed is <strong>more fun and exciting</strong> for a four-year-old child.
                A vintage wooden bed may be beautiful, but it seems too serious for his age. The car design would make
                bedtime feel more enjoyable.
              </p>
              <p className="mt-4">
                <strong>Finally</strong>, even though your choice is made of solid wood, the car bed has a lower frame
                and side rails, which makes it safer and easier for Liam to use by himself.
              </p>
              <p className="mt-4">
                So, considering the price, the design, and the safety features, I really think we should choose the
                car-shaped bed. What do you think?
              </p>
            </div>
          </SectionCard>

          <SectionCard id="other-guides" eyebrow="More Templates" title="Quick Links to Other Task Guides">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherTasks.map(task => (
                <Link
                  key={task.id}
                  href={`/templates/${task.id}`}
                  className={`rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                    task.skill === "Writing" ? "border-blue-100 hover:border-blue-300" : "border-purple-100 hover:border-purple-300"
                  }`}
                >
                  <p className="text-2xl">{task.icon}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    {task.skill} · {task.task}
                  </p>
                  <h3 className="mt-1 font-black text-slate-950">{task.title}</h3>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

function SpeakingTask6Page() {
  const otherTasks = allTemplateTasks.filter(task => task.id !== "speaking-task-6");

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-purple-800 via-indigo-800 to-fuchsia-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/templates" className="text-sm font-bold text-white/80 hover:text-white">
            ← Back to templates
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black ring-1 ring-white/20">
                CELPIP Speaking · Task 6
              </span>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Difficult Situation Template Guide
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-purple-50">
                Learn how to deliver bad news, resolve conflict, and protect the relationship using a polite sandwich
                structure and soft modal language.
              </p>
            </div>
            <div className="rounded-3xl bg-white/12 p-5 text-sm font-bold ring-1 ring-white/20">
              <p>Preparation: 60 seconds</p>
              <p className="mt-2 text-white/80">Speaking: 60 seconds</p>
              <p className="mt-2 text-white/80">Target: polite solution</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="px-3 text-xs font-black uppercase tracking-wide text-slate-500">Quick Links</p>
            <nav className="mt-3 grid gap-1">
              {[
                ["Goal", "#goal"],
                ["Criteria", "#criteria"],
                ["Greeting", "#step-1"],
                ["Conflict", "#step-2"],
                ["Solution", "#step-3"],
                ["Closing", "#step-4"],
                ["Sample", "#sample"],
                ["Other Tasks", "#other-guides"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-6">
          <SectionCard id="goal" eyebrow="Goal" title="Resolve a Conflict Without Sounding Rude">
            <p>
              CELPIP Speaking Task 6 asks you to resolve a conflict or deliver bad news to a friend, family member, or
              colleague. You must choose <Em>one option</Em>, often the more difficult one, and explain your decision
              while maintaining a <Em>polite and respectful tone</Em>.
            </p>
          </SectionCard>

          <SectionCard id="criteria" eyebrow="Assessment Criteria" title="What the Examiner Looks For">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-purple-50 p-4">
                <h3 className="font-black text-slate-950">Tone (Politeness Strategy)</h3>
                <p className="mt-2">
                  In English, the rule is <Em>more words = more polite</Em>. Avoid blunt statements.
                </p>
                <p className="mt-2 text-red-700">Too direct: You can't stay.</p>
                <p className="mt-1 text-slate-700">
                  Polite: I think it would be better if we made other arrangements.
                </p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4">
                <h3 className="font-black text-slate-950">Structure (Sandwich Method)</h3>
                <p className="mt-2">
                  Follow this order: <Em>validate feelings</Em> → <Em>deliver bad news</Em> → <Em>offer solution</Em>.
                </p>
              </div>
              <div className="rounded-2xl bg-fuchsia-50 p-4">
                <h3 className="font-black text-slate-950">Grammar (Modals of Softness)</h3>
                <p className="mt-2">
                  Use <Em>would</Em>, <Em>could</Em>, and <Em>might</Em>. Avoid harsh modals like "you must" or "you have
                  to."
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="step-1" eyebrow="Step 1" title="The Greeting & The Hush: Set the Scene">
            <p>
              Goal: signal immediately that this is a serious or delicate conversation. Do not start with a casual "Hey,
              what's up?"
            </p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Greeting:</Em> Hi [Name]. Hope you're doing well.
              </p>
              <p>
                <Em>The Signal:</Em> Listen, I have something a bit delicate to discuss with you...
              </p>
              <p>
                <Em>The Request:</Em> ...so if I could have a moment of your time, I'd really appreciate it.
              </p>
              <p>
                <Em>Example:</Em> Hi Daniel, I hope you're doing well. Listen, I have something a bit delicate to discuss
                with you, so if I could have a moment of your time, I'd really appreciate it.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-2" eyebrow="Step 2" title="The Conflict: Polite Disagreement">
            <p>
              Goal: state the problem without sounding aggressive. Acknowledge their side before giving your opinion.
            </p>
            <div className="mt-4 rounded-2xl bg-amber-50 p-4">
              <h3 className="font-black text-slate-950">Grammar Alert: Validate → However</h3>
              <p className="mt-2">
                You must show empathy first to lower their defenses.
              </p>
              <p className="mt-2">
                <Em>Pattern:</Em> I know you want [X], and I completely understand [why]. However, I feel that [Y].
              </p>
              <p>
                <Em>Example:</Em> I know you were hoping to stay at my apartment for a few weeks, and I completely
                understand that hotels can be expensive. However, I feel that it would be difficult for me to host you
                right now because my roommate is uncomfortable with long-term guests.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-3" eyebrow="Step 3" title="The Soft Solution">
            <p>
              Goal: propose a solution using the "longer is politer" rule. Use this table to avoid sounding bossy.
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-purple-50 text-purple-900">
                  <tr>
                    <th className="p-3 font-black">Strategy</th>
                    <th className="p-3 font-black">Too Direct (Rude)</th>
                    <th className="p-3 font-black">Polite & Soft (Score 9+)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {softSolutionRows.map(row => (
                    <tr key={row.strategy}>
                      <td className="p-3 font-bold text-slate-950">{row.strategy}</td>
                      <td className="p-3 text-red-700">{row.direct}</td>
                      <td className="p-3 text-slate-700">{row.polite}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Template:</Em> I think the best approach would be to [soft solution]. We could also [alternative].
                This way, [benefit / reduced tension].
              </p>
              <p>
                <Em>Example:</Em> I think the best approach would be for us to look for a nearby Airbnb for the first few
                nights. We could also search together for a short-term room rental. This way, you would have privacy, and
                we could avoid creating tension with my roommate.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-4" eyebrow="Step 4" title="The Closing: Seeking Agreement">
            <p>
              Goal: persuade them to accept your solution. Do <Em>not</Em> ask, "What do you think?" because it invites
              disagreement. Close the door gently but firmly.
            </p>
            <div className="mt-4 rounded-2xl bg-purple-50 p-4">
              <h3 className="font-black text-slate-950">Persuasive Closing</h3>
              <p className="mt-2">
                <Em>Template:</Em> I hope you can understand where I'm coming from, and I'm sure we can make this work in
                a way that is comfortable for everyone.
              </p>
              <p>
                <Em>Example:</Em> I really hope you can understand my position, and I'm sure we can find an arrangement
                that helps you while keeping things comfortable at home.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="sample" eyebrow="Example with Instruction" title="Prompt and Band-Strong Sample Response">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <h3 className="font-black">Instruction</h3>
              <p className="mt-3 text-slate-200">
                Your close friend is moving to your city and wants to stay in your apartment for three weeks. You share
                the apartment with a roommate who is not comfortable with long-term guests. Call your friend and explain
                that they cannot stay with you. Offer another solution.
              </p>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-slate-800">
              <p>
                Hi Daniel, I hope you're doing well. Listen, I have something a bit delicate to discuss with you, so if I
                could have a moment of your time, I'd really appreciate it.
              </p>
              <p className="mt-4">
                I know you were hoping to stay at my apartment when you move here, and I completely understand that
                finding a place in a new city can be stressful and expensive. <strong>However</strong>, I feel that it
                would be difficult for me to host you for three weeks because my roommate is not comfortable having a
                long-term guest in our shared space.
              </p>
              <p className="mt-4">
                I think the best approach <strong>would be</strong> for us to look for a nearby Airbnb or short-term room
                rental instead. We <strong>could</strong> search together this evening, and I <strong>might</strong> be
                able to help you inspect a few places before you arrive. This way, you would have more privacy, and we
                could avoid tension in my apartment.
              </p>
              <p className="mt-4">
                I really hope you can understand where I'm coming from, and I'm sure we can find an arrangement that helps
                you while keeping things comfortable for everyone.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="other-guides" eyebrow="More Templates" title="Quick Links to Other Task Guides">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherTasks.map(task => (
                <Link
                  key={task.id}
                  href={`/templates/${task.id}`}
                  className={`rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                    task.skill === "Writing" ? "border-blue-100 hover:border-blue-300" : "border-purple-100 hover:border-purple-300"
                  }`}
                >
                  <p className="text-2xl">{task.icon}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    {task.skill} · {task.task}
                  </p>
                  <h3 className="mt-1 font-black text-slate-950">{task.title}</h3>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

function SpeakingTask7Page() {
  const otherTasks = allTemplateTasks.filter(task => task.id !== "speaking-task-7");

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-purple-800 via-indigo-800 to-fuchsia-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/templates" className="text-sm font-bold text-white/80 hover:text-white">
            ← Back to templates
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black ring-1 ring-white/20">
                CELPIP Speaking · Task 7
              </span>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Expressing Opinions Template Guide
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-purple-50">
                Learn how to answer social or political questions with a direct stance, paraphrased topic language, and
                three fully supported logical reasons.
              </p>
            </div>
            <div className="rounded-3xl bg-white/12 p-5 text-sm font-bold ring-1 ring-white/20">
              <p>Preparation: 30 seconds</p>
              <p className="mt-2 text-white/80">Speaking: 90 seconds</p>
              <p className="mt-2 text-white/80">Target: opinion + 3 reasons</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="px-3 text-xs font-black uppercase tracking-wide text-slate-500">Quick Links</p>
            <nav className="mt-3 grid gap-1">
              {[
                ["Goal", "#goal"],
                ["Criteria", "#criteria"],
                ["Opening", "#step-1"],
                ["Reason 1", "#reason-1"],
                ["Reason 2", "#reason-2"],
                ["Reason 3", "#reason-3"],
                ["Conclusion", "#closing"],
                ["Sample", "#sample"],
                ["Other Tasks", "#other-guides"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-6">
          <SectionCard id="goal" eyebrow="Goal" title="Choose One Side Immediately">
            <p>
              CELPIP Speaking Task 7 asks you to answer a question about a social or political issue. You must choose{" "}
              <Em>one side</Em>, either yes or no, immediately and support it with clear, logical reasons. A strong
              response sounds <Em>firm</Em>, <Em>direct</Em>, and <Em>well organized</Em>.
            </p>
          </SectionCard>

          <SectionCard id="criteria" eyebrow="Assessment Criteria" title="What the Examiner Looks For">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-purple-50 p-4">
                <h3 className="font-black text-slate-950">Tone (Firm & Direct)</h3>
                <p className="mt-2">
                  Unlike Task 6, where you must be soft and polite, Task 7 requires assertive language.
                </p>
                <p className="mt-2 text-slate-700">Task 6: I think it might be a good idea...</p>
                <p className="mt-1 font-bold text-purple-800">Task 7: I firmly believe that...</p>
                <p className="mt-2 text-red-700">Do not use fluff words here.</p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4">
                <h3 className="font-black text-slate-950">Structure (Logical Flow)</h3>
                <p className="mt-2">
                  Follow a clear path: <Em>Opinion</Em> → <Em>Reason 1 + Support</Em> → <Em>Reason 2 + Support</Em> →{" "}
                  <Em>Reason 3 + Support</Em> → <Em>Conclusion</Em>.
                </p>
              </div>
              <div className="rounded-2xl bg-fuchsia-50 p-4">
                <h3 className="font-black text-slate-950">Grammar (Complex Sentences)</h3>
                <p className="mt-2">
                  Use subordinating conjunctions like <Em>since</Em> for cause and effect and <Em>even though</Em> for
                  concession.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <h3 className="font-black text-slate-950">Vocabulary (Paraphrasing)</h3>
                <p className="mt-2">
                  Do not repeat the prompt exactly. Use synonyms, passive voice, or re-ordering to show range.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="step-1" eyebrow="Step 1" title="The Direct Opening: Paraphrase">
            <p>
              Goal: start immediately with a strong "yes" or "no" and paraphrase the topic. Copying the question wastes
              your chance to show vocabulary range.
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-purple-50 text-purple-900">
                  <tr>
                    <th className="p-3 font-black">Method</th>
                    <th className="p-3 font-black">Explanation</th>
                    <th className="p-3 font-black">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {opinionParaphraseRows.map(row => (
                    <tr key={row.method}>
                      <td className="p-3 font-bold text-slate-950">{row.method}</td>
                      <td className="p-3 text-slate-700">{row.explanation}</td>
                      <td className="p-3 text-slate-700">{row.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>The Stance:</Em> Yes, I firmly believe that...
              </p>
              <p>
                <Em>The Paraphrase:</Em> Apply passive voice or synonyms.
              </p>
              <p>
                <Em>Question:</Em> Should students be allowed to grade their teachers?
              </p>
              <p>
                <Em>Paraphrase:</Em> ...permitting students to evaluate their educators is a productive idea.
              </p>
              <p>
                <Em>Example:</Em> Yes, I firmly believe that permitting students to evaluate their educators is a
                productive idea because it improves accountability and strengthens communication in schools.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="reason-1" eyebrow="Reason 1" title="The Since Logic: Cause & Effect">
            <p>Use this for your strongest point. Every reason must include a support sentence.</p>
            <div className="mt-4 rounded-2xl bg-purple-50 p-4">
              <p>
                <Em>The Argument:</Em> First and foremost, since [cause], [effect].
              </p>
              <p>
                <Em>The Support:</Em> Therefore, [conclusion / why this matters].
              </p>
              <p>
                <Em>Example:</Em> First and foremost, since students interact with teachers every day, they can provide
                useful feedback about classroom clarity and teaching style. Therefore, their opinions can help schools
                identify which methods actually support learning.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="reason-2" eyebrow="Reason 2" title="The Moreover Transition: Adding Depth">
            <p>Use this to add a second layer to your argument. Make sure the reason is different from Reason 1.</p>
            <div className="mt-4 rounded-2xl bg-indigo-50 p-4">
              <p>
                <Em>The Argument:</Em> Moreover, [Point 2].
              </p>
              <p>
                <Em>The Support:</Em> This is important because [explanation].
              </p>
              <p>
                <Em>Example:</Em> Moreover, allowing student feedback would encourage teachers to communicate more
                clearly. This is important because even knowledgeable teachers may need to adjust their explanations if
                students regularly feel confused.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="reason-3" eyebrow="Reason 3" title="The Even Though Logic: Addressing Concerns">
            <p>
              Use this to address a possible negative but turn it into a positive. This makes your answer sound balanced,
              not extreme.
            </p>
            <div className="mt-4 rounded-2xl bg-amber-50 p-4">
              <p>
                <Em>The Argument:</Em> Finally, even though some might argue that [counter-point], I still think that
                [your point].
              </p>
              <p>
                <Em>The Support:</Em> In reality, [refutation / fact].
              </p>
              <p>
                <Em>Example:</Em> Finally, even though some might argue that students are too immature to evaluate
                teachers, I still think their feedback should be considered. In reality, schools can use anonymous forms
                and clear questions to make the process fair and respectful.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="closing" eyebrow="Step 3" title="The Conclusion">
            <p>Goal: wrap it up confidently without adding a new idea.</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Phrase:</Em> Consequently, for these reasons...
              </p>
              <p>
                <Em>Example:</Em> Consequently, for these reasons, I strongly believe that students should be allowed to
                evaluate their teachers in a structured and respectful way.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="sample" eyebrow="Example with Instruction" title="Prompt and Band-Strong Sample Response">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <h3 className="font-black">Instruction</h3>
              <p className="mt-3 text-slate-200">
                Some people believe students should be allowed to grade their teachers. Others believe only school
                administrators should evaluate teachers. What is your opinion?
              </p>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-slate-800">
              <p>
                Yes, <strong>I firmly believe</strong> that permitting students to evaluate their educators is a
                productive idea because it improves accountability and strengthens communication in schools.
              </p>
              <p className="mt-4">
                <strong>First and foremost, since</strong> students interact with teachers every day, they can provide
                useful feedback about classroom clarity and teaching style. Therefore, their opinions can help schools
                understand which methods actually support learning.
              </p>
              <p className="mt-4">
                <strong>Moreover</strong>, allowing student feedback would encourage teachers to communicate more
                clearly. This is important because even knowledgeable teachers may need to adjust their explanations if
                students regularly feel confused or left behind.
              </p>
              <p className="mt-4">
                <strong>Finally, even though</strong> some might argue that students are too immature to evaluate
                teachers, I still think their feedback should be considered. In reality, schools can use anonymous forms
                and clear questions to make the process fair and respectful.
              </p>
              <p className="mt-4">
                <strong>Consequently, for these reasons</strong>, I strongly believe that students should be allowed to
                evaluate their teachers in a structured and responsible way.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="other-guides" eyebrow="More Templates" title="Quick Links to Other Task Guides">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherTasks.map(task => (
                <Link
                  key={task.id}
                  href={`/templates/${task.id}`}
                  className={`rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                    task.skill === "Writing" ? "border-blue-100 hover:border-blue-300" : "border-purple-100 hover:border-purple-300"
                  }`}
                >
                  <p className="text-2xl">{task.icon}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    {task.skill} · {task.task}
                  </p>
                  <h3 className="mt-1 font-black text-slate-950">{task.title}</h3>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

function SpeakingTask8Page() {
  const otherTasks = allTemplateTasks.filter(task => task.id !== "speaking-task-8");

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-purple-800 via-indigo-800 to-fuchsia-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/templates" className="text-sm font-bold text-white/80 hover:text-white">
            ← Back to templates
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black ring-1 ring-white/20">
                CELPIP Speaking · Task 8
              </span>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Unusual Situation Template Guide
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-purple-50">
                Learn how to describe a bizarre scene to someone who cannot see it, using Present Perfect for emotional
                connection, strong vocabulary, and a clear general-to-specific visual tour.
              </p>
            </div>
            <div className="rounded-3xl bg-white/12 p-5 text-sm font-bold ring-1 ring-white/20">
              <p>Preparation: 30 seconds</p>
              <p className="mt-2 text-white/80">Speaking: 60 seconds</p>
              <p className="mt-2 text-white/80">Target: voicemail-style description</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="px-3 text-xs font-black uppercase tracking-wide text-slate-500">Quick Links</p>
            <nav className="mt-3 grid gap-1">
              {[
                ["Goal", "#goal"],
                ["Criteria", "#criteria"],
                ["Setup", "#step-1"],
                ["Visual Tour", "#step-2"],
                ["Closing", "#step-3"],
                ["Sample", "#sample"],
                ["Other Tasks", "#other-guides"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-6">
          <SectionCard id="goal" eyebrow="Goal" title="Paint a Vivid Picture for Someone Who Cannot See It">
            <p>
              CELPIP Speaking Task 8 asks you to describe a specific, often unusual scene to a friend or family member.
              Your listener should be able to imagine the scene clearly, so you need <Em>high-level vocabulary</Em>,{" "}
              <Em>emotional connection</Em>, and a logical visual structure.
            </p>
          </SectionCard>

          <SectionCard id="criteria" eyebrow="Assessment Criteria" title="What the Examiner Looks For">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-purple-50 p-4">
                <h3 className="font-black text-slate-950">Grammar (Emotional Connection)</h3>
                <p className="mt-2">
                  Use Present Perfect to show interest: <Em>I have never seen anything like this before!</Em>
                </p>
                <p className="mt-2 text-red-700">Cold: I did not see this before.</p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4">
                <h3 className="font-black text-slate-950">Vocabulary (Quality Adjectives)</h3>
                <p className="mt-2">
                  Replace basic words with stronger ones: <Em>sizable</Em>, <Em>magnificent</Em>, <Em>surreal</Em>,{" "}
                  <Em>extraordinary</Em>.
                </p>
              </div>
              <div className="rounded-2xl bg-fuchsia-50 p-4">
                <h3 className="font-black text-slate-950">Structure (20-Second Bridge)</h3>
                <p className="mt-2">
                  Do not describe the picture immediately. Spend the first 15-20 seconds building context and tone.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="step-1" eyebrow="Step 1" title="The Setup: Tone, Story & Grammar">
            <p>
              Goal: decide your feeling, build a short story bridge, and use Present Perfect so you sound natural and
              engaged.
            </p>
            <div className="mt-4 rounded-2xl bg-purple-50 p-4">
              <h3 className="font-black text-slate-950">A. The Excitement Check</h3>
              <p className="mt-2">
                <Em>The Prompt:</Em> Describe this unusual situation to your friend.
              </p>
              <p>
                <Em>Your Reaction:</Em> Fun / exciting / bizarre → enthusiastic tone.
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <h3 className="font-black text-slate-950">B. The Story Formula (Using Present Perfect)</h3>
              <p className="mt-2">
                <Em>Weak:</Em> I am downtown. There is a bear.
              </p>
              <p>
                <Em>Strong:</Em> Hi Kathy, I know you have been to Toronto before, but I have never seen anything this
                bizarre in the middle of the city.
              </p>
              <p>
                <Em>Drafting Your Opening:</Em> Hi Kathy, I know you love unusual travel stories, and I have just walked
                into one of the strangest scenes I have ever seen.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="step-2" eyebrow="Step 2" title="The Visual Tour: General → Specific">
            <p>
              Goal: describe the scene logically so the listener can visualize it. Move from the whole picture to the
              centerpiece, then small details.
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-purple-50 text-purple-900">
                  <tr>
                    <th className="p-3 font-black">Stage</th>
                    <th className="p-3 font-black">Action</th>
                    <th className="p-3 font-black">Phrase Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {visualTourRows.map(row => (
                    <tr key={row.stage}>
                      <td className="p-3 font-bold text-slate-950">{row.stage}</td>
                      <td className="p-3 text-slate-700">{row.action}</td>
                      <td className="p-3 text-slate-700">{row.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard id="step-3" eyebrow="Step 3" title="The Closing: The Specific Question">
            <p>
              Goal: end naturally by asking the specific question from the prompt. Do not just say goodbye.
            </p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p>
                <Em>Template:</Em> So, [repeat the question from the prompt]?
              </p>
              <p>
                <Em>Example:</Em> So, what do you think I should do — stay here and watch, or get out of the area?
              </p>
            </div>
          </SectionCard>

          <SectionCard id="sample" eyebrow="Example with Instruction" title="Prompt, Picture, and Sample Response">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <h3 className="font-black">Instruction</h3>
              <p className="mt-3 text-slate-200">
                You are walking downtown and see something very unusual. Call your friend and describe what you are
                seeing. Then ask: What do you think I should do?
              </p>
              <h3 className="mt-5 font-black">Picture</h3>
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <img
                  src="/template-images/speaking-task-8.png"
                  alt="A large brown bear sitting on King Street in front of a stopped city bus in downtown Toronto"
                  className="h-auto w-full object-cover"
                />
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-slate-800">
              <p>
                Hi Kathy, I know you love unusual travel stories, and <strong>I have just walked into one of the
                strangest scenes I have ever seen</strong>. I am downtown on King Street, and I honestly{" "}
                <strong>have not seen anything like this before</strong>.
              </p>
              <p className="mt-4">
                <strong>Right now</strong>, I am looking at a <strong>massive brown bear</strong> sitting calmly in the
                middle of a busy city street. On both sides, there are towering skyscrapers, stopped traffic, and a crowd
                of people on the sidewalk who are taking photos instead of running away.
              </p>
              <p className="mt-4">
                <strong>In the center</strong>, the bear is sitting directly in front of a red city bus that says{" "}
                <strong>504 King</strong>. A police officer is standing in the street watching it carefully, and there
                is even a <strong>Tim Hortons coffee cup</strong> on the pavement right beside the bear, which makes the
                whole scene feel completely surreal.
              </p>
              <p className="mt-4">
                Everyone around me seems fascinated rather than panicked, but I am still a little unsure what to do. So,{" "}
                <strong>what do you think I should do</strong> — stay here and watch, or get out of the area?
              </p>
            </div>
          </SectionCard>

          <SectionCard id="other-guides" eyebrow="More Templates" title="Quick Links to Other Task Guides">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherTasks.map(task => (
                <Link
                  key={task.id}
                  href={`/templates/${task.id}`}
                  className={`rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                    task.skill === "Writing" ? "border-blue-100 hover:border-blue-300" : "border-purple-100 hover:border-purple-300"
                  }`}
                >
                  <p className="text-2xl">{task.icon}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    {task.skill} · {task.task}
                  </p>
                  <h3 className="mt-1 font-black text-slate-950">{task.title}</h3>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

export function generateStaticParams() {
  return allTemplateTasks.map(task => ({ taskId: task.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ taskId: string }>;
}): Promise<Metadata> {
  const { taskId } = await params;
  const task = getTemplateTask(taskId);
  if (!task) {
    return buildPageMetadata({ title: "Template Not Found", noIndex: true });
  }

  return buildPageMetadata({
    title: `CELPIP ${task.skill} ${task.task}: ${task.title}`,
    description: `${task.subtitle} Free CELPIP ${task.skill.toLowerCase()} template with structure, scoring tips, and examples. ${task.time}.`,
    path: `/templates/${task.id}`,
    keywords: [
      `CELPIP ${task.skill.toLowerCase()} ${task.task.toLowerCase()}`,
      `CELPIP ${task.title.toLowerCase()}`,
      "CELPIP template",
    ],
    ogType: "article",
  });
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const task = getTemplateTask(taskId);
  if (!task) notFound();
  if (task.id === "writing-task-1") return <WritingTask1Page />;
  if (task.id === "writing-task-2") return <WritingTask2Page />;
  if (task.id === "speaking-task-1") return <SpeakingTask1Page />;
  if (task.id === "speaking-task-2") return <SpeakingTask2Page />;
  if (task.id === "speaking-task-3") return <SpeakingTask3Page />;
  if (task.id === "speaking-task-4") return <SpeakingTask4Page />;
  if (task.id === "speaking-task-5") return <SpeakingTask5Page />;
  if (task.id === "speaking-task-6") return <SpeakingTask6Page />;
  if (task.id === "speaking-task-7") return <SpeakingTask7Page />;
  if (task.id === "speaking-task-8") return <SpeakingTask8Page />;

  const isWriting = task.skill === "Writing";

  return (
    <main className="min-h-screen bg-slate-50">
      <section
        className={`text-white ${
          isWriting
            ? "bg-gradient-to-br from-blue-700 to-cyan-600"
            : "bg-gradient-to-br from-purple-800 to-fuchsia-700"
        }`}
      >
        <div className="mx-auto max-w-5xl px-6 py-12">
          <Link href="/templates" className="text-sm font-bold text-white/80 hover:text-white">
            ← Back to templates
          </Link>
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black ring-1 ring-white/20">
                {task.skill} · {task.task}
              </span>
              <h1 className="mt-5 text-4xl font-black tracking-tight">
                {task.icon} {task.title}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/90">{task.subtitle}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-5 text-sm font-bold ring-1 ring-white/20">
              <p>{task.time}</p>
              <p className="mt-2 text-white/80">{task.output}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-black text-slate-900">Main Focus</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              {task.focus.map(item => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div
            className={`rounded-3xl p-6 shadow-sm ring-1 ${
              isWriting ? "bg-blue-50 ring-blue-100" : "bg-purple-50 ring-purple-100"
            }`}
          >
            <h2 className="text-xl font-black text-slate-900">Simple Template</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              {task.structure.map(item => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-black text-slate-900">Score Guide</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              {task.scoreTips.map(item => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-3xl bg-slate-900 p-6 text-white">
          <h2 className="text-2xl font-black">Practice after reading the template</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Use this guide as a checklist, then complete a real timed task and compare your answer with the structure.
          </p>
          <Link
            href={isWriting ? "/practice/writing" : "/practice/speaking"}
            className={`mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-black text-white ${
              isWriting ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            Go to {task.skill} practice →
          </Link>
        </div>
      </section>
    </main>
  );
}
