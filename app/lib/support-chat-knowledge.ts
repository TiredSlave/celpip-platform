import { SITE_DISCLAIMER, SITE_NAME, SITE_TAGLINE } from "./brand";

/** Ground-truth facts the support bot may use — keep aligned with public/llms.txt and the homepage. */
export const SUPPORT_CHAT_KNOWLEDGE = `
Site: ${SITE_NAME} (${SITE_TAGLINE})
Disclaimer: ${SITE_DISCLAIMER}

What this website offers:
- CELPIP Writing practice: Task 1 (email) and Task 2 (survey response) with timed prompts and AI band-style feedback
- CELPIP Reading practice: 4 parts — correspondence, apply information, reading for information, viewpoints
- CELPIP Listening practice: 6 parts with generated audio, countdown answer windows, and transcript review
- CELPIP Speaking practice: all 8 tasks including picture description, predictions, compare options, and unusual situations
- Free Writing & Speaking template guides with structure, scoring tips, and examples at /templates
- Mock tests by skill (Reading, Writing, Listening, Speaking) at /mock-test
- Vocabulary saving from reading and listening passages (requires a free account)
- Practice hub at /practice with separate areas for each skill
- Sign up and log in with email/password or Google OAuth
- Results review after practice to find weak areas

What this website is NOT:
- Not the official CELPIP test or affiliated with Paragon Testing Enterprises
- Not a substitute for official registration, scoring, or test-day policies
- Not able to guarantee exam scores or immigration outcomes

Common navigation:
- Home: /
- Practice: /practice
- Templates: /templates
- Mock tests: /mock-test
- Sign up: /signup
- Log in: /login
`.trim();
