export type TemplateTask = {
  id: string;
  skill: "Writing" | "Speaking";
  task: string;
  title: string;
  subtitle: string;
  time: string;
  output: string;
  icon: string;
  accent: "blue" | "purple";
  focus: string[];
  structure: string[];
  scoreTips: string[];
};

export const writingTasks: TemplateTask[] = [
  {
    id: "writing-task-1",
    skill: "Writing",
    task: "Task 1",
    title: "Write an Email",
    subtitle: "Build a clear message that answers every bullet point.",
    time: "27 minutes",
    output: "About 150-200 words",
    icon: "✉️",
    accent: "blue",
    focus: [
      "Understand the situation and purpose of the email.",
      "Answer every bullet point clearly.",
      "Use the right tone: formal, semi-formal, or informal.",
    ],
    structure: [
      "Opening: greeting + reason for writing.",
      "Body 1: answer the first bullet with enough detail.",
      "Body 2: answer the remaining bullets and add support.",
      "Closing: polite ending + next action if needed.",
    ],
    scoreTips: [
      "Do not ignore any bullet point.",
      "Use natural connectors, not memorized long sentences.",
      "Keep paragraphs short and easy to follow.",
    ],
  },
  {
    id: "writing-task-2",
    skill: "Writing",
    task: "Task 2",
    title: "Respond to a Survey",
    subtitle: "Choose a position and defend it with organized reasons.",
    time: "26 minutes",
    output: "About 150-200 words",
    icon: "📋",
    accent: "blue",
    focus: [
      "Choose one option and defend it strongly.",
      "Give two clear reasons with examples.",
      "Stay consistent from introduction to conclusion.",
    ],
    structure: [
      "Introduction: state your choice directly.",
      "Reason 1: explain the most practical benefit.",
      "Reason 2: add a second reason or comparison.",
      "Conclusion: restate why your choice is better.",
    ],
    scoreTips: [
      "Take a clear position early.",
      "Avoid repeating the same reason in different words.",
      "Use examples that sound realistic and specific.",
    ],
  },
];

export const speakingTasks: TemplateTask[] = [
  {
    id: "speaking-task-1",
    skill: "Speaking",
    task: "Task 1",
    title: "Give Advice",
    subtitle: "Give practical advice and explain why it helps.",
    time: "30 sec prep · 90 sec speak",
    output: "Advice + reasons",
    icon: "💡",
    accent: "purple",
    focus: ["Understand the problem.", "Give direct advice.", "Explain why the advice helps."],
    structure: ["State your advice.", "Give reason one.", "Give reason two.", "End with a friendly summary."],
    scoreTips: ["Use phrases like \"If I were you...\".", "Sound helpful, not bossy.", "Support advice with practical details."],
  },
  {
    id: "speaking-task-2",
    skill: "Speaking",
    task: "Task 2",
    title: "Talk About a Personal Experience",
    subtitle: "Tell one clear story in past tense with reflection.",
    time: "30 sec prep · 60 sec speak",
    output: "Past experience story",
    icon: "🧭",
    accent: "purple",
    focus: ["Pick one clear memory.", "Tell events in time order.", "Explain what you learned or felt."],
    structure: ["Set the scene.", "Describe what happened.", "Explain the result.", "Add reflection."],
    scoreTips: ["Use past tense consistently.", "Do not describe too many events.", "Include feelings to make the answer natural."],
  },
  {
    id: "speaking-task-3",
    skill: "Speaking",
    task: "Task 3",
    title: "Describe a Scene",
    subtitle: "Organize picture details from general view to specifics.",
    time: "30 sec prep · 60 sec speak",
    output: "Picture description",
    icon: "🖼️",
    accent: "purple",
    focus: ["Describe locations clearly.", "Mention people, actions, and objects.", "Make reasonable guesses."],
    structure: ["Overall scene.", "Foreground details.", "Background details.", "Possible situation or mood."],
    scoreTips: ["Use spatial phrases: foreground, background, on the left.", "Do not invent too much.", "Keep moving through the picture logically."],
  },
  {
    id: "speaking-task-4",
    skill: "Speaking",
    task: "Task 4",
    title: "Make Predictions",
    subtitle: "Use visible clues to explain what may happen next.",
    time: "30 sec prep · 60 sec speak",
    output: "Prediction based on image",
    icon: "🔮",
    accent: "purple",
    focus: ["Predict what may happen next.", "Use evidence from the picture.", "Explain likely consequences."],
    structure: ["State the main prediction.", "Support with visual evidence.", "Add a second possible outcome.", "Conclude with what is most likely."],
    scoreTips: ["Use \"probably\", \"might\", and \"it looks like\".", "Connect predictions to visible clues.", "Avoid absolute claims without evidence."],
  },
  {
    id: "speaking-task-5",
    skill: "Speaking",
    task: "Task 5",
    title: "Compare and Persuade",
    subtitle: "Compare two options, choose one, and persuade clearly.",
    time: "60 sec prep · 60 sec speak",
    output: "Comparison + recommendation",
    icon: "⚖️",
    accent: "purple",
    focus: ["Compare two options.", "Choose the better option.", "Persuade someone with reasons."],
    structure: ["Briefly compare both options.", "Choose one option.", "Give two strong reasons.", "End with a recommendation."],
    scoreTips: ["Use contrast language: whereas, however, compared with.", "Do not spend all your time describing.", "Make your choice clear."],
  },
  {
    id: "speaking-task-6",
    skill: "Speaking",
    task: "Task 6",
    title: "Deal with a Difficult Situation",
    subtitle: "Choose a solution and explain it politely.",
    time: "60 sec prep · 60 sec speak",
    output: "Solution to a problem",
    icon: "🛠️",
    accent: "purple",
    focus: ["Choose a practical solution.", "Explain your decision.", "Show politeness and problem-solving."],
    structure: ["Acknowledge the problem.", "Choose your solution.", "Explain why it is fair or practical.", "Close politely."],
    scoreTips: ["Balance firmness with politeness.", "Avoid emotional or extreme answers.", "Use conditionals and soft language."],
  },
  {
    id: "speaking-task-7",
    skill: "Speaking",
    task: "Task 7",
    title: "Express an Opinion",
    subtitle: "Take a side and develop two strong reasons.",
    time: "30 sec prep · 90 sec speak",
    output: "Opinion + support",
    icon: "🗣️",
    accent: "purple",
    focus: ["Take a clear position.", "Give two developed reasons.", "Include examples or consequences."],
    structure: ["State your opinion.", "Reason one with support.", "Reason two with support.", "Short conclusion."],
    scoreTips: ["Choose the side you can explain more easily.", "Use examples from daily life.", "Do not switch sides halfway."],
  },
  {
    id: "speaking-task-8",
    skill: "Speaking",
    task: "Task 8",
    title: "Describe an Unusual Situation",
    subtitle: "Leave a clear message about something unusual.",
    time: "30 sec prep · 60 sec speak",
    output: "Voicemail-style description",
    icon: "📞",
    accent: "purple",
    focus: ["Describe what you saw.", "Explain why it is unusual.", "Leave a clear message for someone."],
    structure: ["Greeting and reason for calling.", "Describe the unusual situation.", "Add key details.", "Ask for action or response."],
    scoreTips: ["Sound natural, like a voicemail.", "Include enough detail for the listener.", "Finish with a clear next step."],
  },
];

export const allTemplateTasks = [...writingTasks, ...speakingTasks];

export function getTemplateTask(id: string) {
  return allTemplateTasks.find(task => task.id === id) || null;
}
