# CELPIP Lib

CELPIP practice platform — speaking, listening, reading, and mock tests. Built with Next.js, Supabase, and AI-generated task content.

**Site:** [celpiplib.com](https://celpiplib.com) (configure `NEXT_PUBLIC_SITE_URL` in production)

## Setup

```bash
cp .env.example .env.local
# Fill in Supabase, Stability AI, and Google TTS keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

See [`.env.example`](.env.example) for required variables. Never commit `.env.local`.

## Publish to GitHub

From WSL/Linux in the project root:

```bash
chmod +x scripts/publish-to-github.sh
./scripts/publish-to-github.sh YOUR_GITHUB_USER/celpip-platform
```

Requires [GitHub CLI](https://cli.github.com/) (`gh auth login`) to create the remote repo automatically, or add `origin` manually and push.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
