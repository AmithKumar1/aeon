# Aeon

Autonomous agent running on GitHub Actions, powered by Claude Code. Writes daily articles, builds features from GitHub issues, generates digests, and notifies you on Telegram.

## Quick start

1. **Fork this repo** (or click "Use this template" if available)
2. **Enable GitHub Actions** — go to the **Actions** tab in your fork and click "I understand my workflows, go ahead and enable them"
3. **Add secrets** — go to **Settings > Secrets and variables > Actions** and add:

| Secret | Required | Description |
|--------|----------|-------------|
| `CLAUDE_CODE_OAUTH_TOKEN` | Yes | OAuth token for Claude (see below) |
| `TELEGRAM_BOT_TOKEN` | Optional | From @BotFather on Telegram |
| `TELEGRAM_CHAT_ID` | Optional | Your Telegram chat ID from @userinfobot |
| `XAI_API_KEY` | Optional | X.AI API key for searching X/Twitter |

4. **Customize** — edit `CLAUDE.md` (agent identity), `skills/*.md` (skill prompts), and `memory/MEMORY.md` (seed context)
5. **Test** — go to **Actions > Run Skill > Run workflow** and enter a skill name (e.g. `article`)

### Getting your auth token

**Option A: Claude Code OAuth token (recommended)** — uses your existing Claude Pro/Max subscription, no separate API billing.

1. Install [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and run:
   ```bash
   claude setup-token
   ```
2. It opens a browser for OAuth login, then prints a long-lived token (`sk-ant-oat01-...`, valid for 1 year).
3. Add it as the `CLAUDE_CODE_OAUTH_TOKEN` secret in your repo.

**Option B: Standard API key** — usage-based billing through console.anthropic.com.

1. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) and create a key.
2. Add it as `CLAUDE_CODE_OAUTH_TOKEN` in your repo secrets (it works in the same field).

## How it works

GitHub Actions spins up a VM on a schedule (or manual trigger), clones your repo, runs a skill prompt through Claude Code, then commits the results back to your repo. Memory, articles, and digests persist because they're committed to git after each run.

```
Cron / manual trigger
  → GitHub Actions VM boots
    → Clones your repo
      → Runs: node scripts/load-skill.js --prompt <skill> | claude -p
        → Claude reads files, searches the web, writes output
          → Workflow commits changed files back to main
```

## Adding a new skill

1. Create `skills/your-skill.md` with frontmatter and a prompt:

```markdown
---
name: My Skill
description: What this skill does
schedule: "0 12 * * *"
commits:
  - output-dir/
  - memory/
permissions:
  - contents:write
---

Today is ${today}. Your task is to...
```

2. If it needs a cron schedule, add the cron to `.github/workflows/run-skill.yml` under `schedule:` and map it in the "Determine skill name" step.

**Template variables:** `${today}` (2026-03-06), `${now}` (full ISO timestamp), `${repo}` (owner/repo-name).

## Trigger feature builds from issues

Add the label `ai-build` to any GitHub issue. The workflow fires automatically and Claude will read the issue, implement it, and open a PR.

## Running locally

```bash
# Run any skill locally (requires Claude Code CLI)
node scripts/load-skill.js --prompt article | claude -p --dangerously-skip-permissions

# List available skills
node scripts/load-skill.js --list
```

## Two-repo strategy

This repo is a **public template**. For your own instance, we recommend keeping a separate private repo so your memory, articles, and API keys stay private.

### Setup

1. **Fork this repo** to your own account (e.g. `your-name/aeon-private`). Make it **private**.
2. Add your secrets to the **private** fork (not the public template).
3. Customize `CLAUDE.md`, `memory/MEMORY.md`, and skill prompts in your private fork.
4. All generated content (articles, digests, memory) stays in your private fork.

### Pulling updates from the template

When the public template gets new skills or workflow improvements:

```bash
# In your private fork
git remote add upstream https://github.com/aaronjmars/aeon.git
git fetch upstream
git merge upstream/main --no-edit
```

This merges template changes without overwriting your personal content, since your articles/memory are in files that don't exist in the template.

## Project structure

```
CLAUDE.md           ← agent identity (auto-loaded by Claude Code)
scripts/
  load-skill.js     ← skill loader (parses frontmatter, interpolates vars)
skills/
  article.md        ← daily article skill
  digest.md         ← daily digest skill
  feature.md        ← feature builder skill
  reflect.md        ← weekly reflection skill
  build-tool.md     ← skill builder skill
  fetch-tweets.md   ← tweet fetcher skill
  search-papers.md  ← academic paper search tool
memory/
  MEMORY.md         ← long-term persistent memory
  logs/             ← daily run logs (auto-created)
articles/           ← generated articles (auto-created)
digests/            ← generated digests (auto-created)
.github/
  workflows/
    run-skill.yml   ← single workflow dispatches all skills
```
