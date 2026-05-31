/** Source 3: fixed expressions / discourse markers per speaking task (≥5 × 8 tasks = 40). */
export type SpeakingVocabSeed = {
  id: string;
  taskNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  phrase: string;
  category: string;
  exampleSentence: string;
};

export const SPEAKING_VOCABULARY_SEED: SpeakingVocabSeed[] = [
  // Task 1 — Give advice
  { id: "s1-1", taskNumber: 1, phrase: "If I were you, I'd …", category: "Advice frame", exampleSentence: "If I were you, I'd book the appointment online so you don't have to wait on the phone." },
  { id: "s1-2", taskNumber: 1, phrase: "One option would be to …", category: "Soft suggestion", exampleSentence: "One option would be to speak to your supervisor before you send the formal complaint." },
  { id: "s1-3", taskNumber: 1, phrase: "You might want to consider …", category: "Hedged advice", exampleSentence: "You might want to consider extending the deadline by a day so the team can proofread." },
  { id: "s1-4", taskNumber: 1, phrase: "It could be worth …", category: "Low-pressure tip", exampleSentence: "It could be worth comparing two quotes before you commit to the contractor." },
  { id: "s1-5", taskNumber: 1, phrase: "From my experience, …", category: "Personal grounding", exampleSentence: "From my experience, short notes after each meeting save a lot of confusion later." },
  // Task 2 — Personal experience
  { id: "s2-1", taskNumber: 2, phrase: "Looking back, …", category: "Reflection", exampleSentence: "Looking back, I realize I was far more nervous than I needed to be on the first day." },
  { id: "s2-2", taskNumber: 2, phrase: "At the time, …", category: "Past frame", exampleSentence: "At the time, I didn't understand why the policy changed, but it made sense later." },
  { id: "s2-3", taskNumber: 2, phrase: "What stuck with me was …", category: "Highlight", exampleSentence: "What stuck with me was how supportive my colleagues were when I made a mistake." },
  { id: "s2-4", taskNumber: 2, phrase: "That was a turning point because …", category: "Narrative link", exampleSentence: "That was a turning point because I finally started asking for help instead of struggling alone." },
  { id: "s2-5", taskNumber: 2, phrase: "I'd never done anything like that before, so …", category: "Novelty", exampleSentence: "I'd never done anything like that before, so I prepared a simple script to stay on track." },
  // Task 3 — Describe a picture
  { id: "s3-1", taskNumber: 3, phrase: "In the foreground, …", category: "Spatial", exampleSentence: "In the foreground, there's a group of people waiting at a bus stop with umbrellas." },
  { id: "s3-2", taskNumber: 3, phrase: "In the background, …", category: "Spatial", exampleSentence: "In the background, you can see a row of office buildings and a construction crane." },
  { id: "s3-3", taskNumber: 3, phrase: "The first thing I notice is …", category: "Focus", exampleSentence: "The first thing I notice is the bright red sign above the entrance." },
  { id: "s3-4", taskNumber: 3, phrase: "It looks as though …", category: "Inference", exampleSentence: "It looks as though they've just finished setting up for an outdoor event." },
  { id: "s3-5", taskNumber: 3, phrase: "The overall mood seems …", category: "Atmosphere", exampleSentence: "The overall mood seems relaxed—people are smiling and chatting in small groups." },
  // Task 4 — Predictions
  { id: "s4-1", taskNumber: 4, phrase: "I imagine that …", category: "Prediction", exampleSentence: "I imagine that traffic will get worse once the new mall opens next month." },
  { id: "s4-2", taskNumber: 4, phrase: "It's likely that …", category: "Probability", exampleSentence: "It's likely that demand for online delivery will keep rising over the winter." },
  { id: "s4-3", taskNumber: 4, phrase: "In the near future, …", category: "Time frame", exampleSentence: "In the near future, we might see more companies offering hybrid schedules." },
  { id: "s4-4", taskNumber: 4, phrase: "If things continue this way, …", category: "Trend", exampleSentence: "If things continue this way, the line will probably stretch around the block." },
  { id: "s4-5", taskNumber: 4, phrase: "My guess would be that …", category: "Soft claim", exampleSentence: "My guess would be that they'll announce the winner before the end of the show." },
  // Task 5 — Compare pictures
  { id: "s5-1", taskNumber: 5, phrase: "On the one hand, … On the other hand, …", category: "Contrast", exampleSentence: "On the one hand, the first option is cheaper; on the other hand, the second is faster." },
  { id: "s5-2", taskNumber: 5, phrase: "Whereas … , …", category: "Formal contrast", exampleSentence: "Whereas the first picture shows a quiet street, the second shows a busy market." },
  { id: "s5-3", taskNumber: 5, phrase: "I personally prefer … because …", category: "Preference + reason", exampleSentence: "I personally prefer the second design because it looks easier to navigate." },
  { id: "s5-4", taskNumber: 5, phrase: "Both options have merit, but …", category: "Balanced view", exampleSentence: "Both options have merit, but I'd go with the one that saves more time day to day." },
  { id: "s5-5", taskNumber: 5, phrase: "Compared to …", category: "Comparison", exampleSentence: "Compared to the first image, the second one feels more modern and spacious." },
  // Task 6 — Deal with a situation
  { id: "s6-1", taskNumber: 6, phrase: "I understand that you're concerned about …", category: "Empathy", exampleSentence: "I understand that you're concerned about the delay; let me explain what happened." },
  { id: "s6-2", taskNumber: 6, phrase: "Here's what I can offer to help.", category: "Offer", exampleSentence: "Here's what I can offer to help: I can reschedule you for first thing tomorrow." },
  { id: "s6-3", taskNumber: 6, phrase: "If it's acceptable to you, …", category: "Polite proposal", exampleSentence: "If it's acceptable to you, we could split the difference on the delivery fee." },
  { id: "s6-4", taskNumber: 6, phrase: "To make this right, …", category: "Resolution", exampleSentence: "To make this right, I'll send a replacement today at no extra charge." },
  { id: "s6-5", taskNumber: 6, phrase: "Going forward, …", category: "Next steps", exampleSentence: "Going forward, I'll confirm the address by text so this doesn't happen again." },
  // Task 7 — Express opinion
  { id: "s7-1", taskNumber: 7, phrase: "From my perspective, …", category: "Opinion", exampleSentence: "From my perspective, investing in training pays off faster than people expect." },
  { id: "s7-2", taskNumber: 7, phrase: "I'm convinced that …", category: "Strong stance", exampleSentence: "I'm convinced that flexible hours improve both morale and productivity." },
  { id: "s7-3", taskNumber: 7, phrase: "On balance, I think …", category: "Weighing sides", exampleSentence: "On balance, I think the benefits outweigh the risks if we roll it out gradually." },
  { id: "s7-4", taskNumber: 7, phrase: "I tend to disagree with the idea that …", category: "Counter-argument", exampleSentence: "I tend to disagree with the idea that higher prices always mean better quality." },
  { id: "s7-5", taskNumber: 7, phrase: "The main reason I feel this way is …", category: "Support", exampleSentence: "The main reason I feel this way is that we've seen similar policies fail elsewhere." },
  // Task 8 — Unusual situation
  { id: "s8-1", taskNumber: 8, phrase: "Something unusual about this scene is …", category: "Observation", exampleSentence: "Something unusual about this scene is that there's a cow standing in the middle of the road." },
  { id: "s8-2", taskNumber: 8, phrase: "What strikes me as odd is …", category: "Oddity", exampleSentence: "What strikes me as odd is that everyone is dressed formally but they're outdoors." },
  { id: "s8-3", taskNumber: 8, phrase: "It almost looks like …", category: "Speculation", exampleSentence: "It almost looks like they've set up a film shoot without closing the sidewalk." },
  { id: "s8-4", taskNumber: 8, phrase: "My initial impression is that …", category: "First look", exampleSentence: "My initial impression is that something unexpected interrupted a normal workday." },
  { id: "s8-5", taskNumber: 8, phrase: "If I had to guess, …", category: "Hypothesis", exampleSentence: "If I had to guess, they're moving equipment after a sudden change of plans." },
];

export const SPEAKING_TASK_LABELS: Record<number, string> = {
  1: "Task 1 — Give advice",
  2: "Task 2 — Personal experience",
  3: "Task 3 — Describe a picture",
  4: "Task 4 — Make predictions",
  5: "Task 5 — Compare pictures",
  6: "Task 6 — Deal with a situation",
  7: "Task 7 — Express opinion",
  8: "Task 8 — Unusual situation",
};
