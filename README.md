# Ace

Ace is a web app where you create AI teammates and give them work in a chat. Each teammate has its own cloud computer with a Linux desktop, a terminal and files, and uses it to do the task. It asks before important actions, and you can watch its screen or take control at any time.

Ace exists so you can run an AI teammates platform yourself instead of handing your work to a hosted service. The app and the database run where you put them. Chats, files, screenshots and encrypted provider keys stay in your PostgreSQL. Model calls go from your server straight to the provider you pick, with your own key. The teammates' computers run on Daytona under your own account. The interface stays plain enough that anyone on the team can use it, not only developers.

## How it works

- **A computer per teammate.** Every teammate gets a Daytona sandbox with an XFCE desktop, Chromium, a shell and persistent files. All of its chats share that computer, one task at a time.
- **You see the work.** Each reply lists its steps in plain sentences with screenshots. A live view of the desktop runs in the browser over noVNC.
- **It asks first.** You choose which kinds of action need your answer: commands, file changes, screen clicks and typing, file reads, notes and handoffs. A fixed rule set plus a small safety-check model flag risky actions (money, secrets, sharing data, deletes, security changes) and always ask, even in "Work without asking".
- **Spending has a ceiling.** Each teammate has a step limit, a spending limit per task and a spending limit per day. Defaults are 50 steps, $1.00 per task and $5.00 per day.
- **You can step in.** Take control of the screen to do a sign-in or enter a code, then give it back. The teammate continues from there.
- **Group chats.** Several teammates in one chat. `@Name` picks who replies, and a teammate can pass the task to another. Ace blocks ping-pong handoffs.
- **It keeps going.** Replies run in a background worker, so closing the tab or reloading the page does not stop the work.

Supported AI providers: Anthropic, OpenAI, Google, and any server that speaks the OpenAI API format (OpenRouter, Ollama and others). Keys are encrypted at rest with AES-256-GCM and only the last four characters are ever shown.

## Requirements

- Node.js 24 or newer and pnpm 11 (the exact version is pinned in `package.json`)
- PostgreSQL, or Docker for the Compose setup below
- A [Trigger.dev](https://trigger.dev) project. It runs the worker that executes teammate turns.
- A [Daytona](https://www.daytona.io) API key. Daytona hosts the teammates' computers.
- An API key for at least one supported AI provider, added inside the app after sign-in

## Run it locally

```sh
git clone https://github.com/SanjokMangrati/ace.git
cd ace
pnpm install
cp .env.example .env.local
```

Fill in `.env.local`. The required variables are `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ENCRYPTION_KEY`, `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF` and `DAYTONA_API_KEY`. Generate the two secrets with:

```sh
openssl rand -base64 32
```

Then create the database schema, build the sandbox image on Daytona, and start the app and the worker together:

```sh
pnpm db:push
pnpm sandbox:snapshot
pnpm exec trigger login
pnpm dev
```

Open http://localhost:3000, create an account, add an AI provider key under AI providers, and create your first teammate.

`pnpm dev` runs `next dev` and `trigger dev` side by side. The snapshot build runs once; delete the snapshot in the Daytona dashboard to rebuild it after changing `sandbox/image/Dockerfile`.

## Self-hosting

The web app and the database run with Docker Compose. The worker deploys to Trigger.dev.

```sh
cp .env.example .env
# fill in .env (DATABASE_URL is set by Compose, leave it)
docker compose up -d --build
pnpm exec trigger deploy --env prod
```

Compose starts PostgreSQL 17, runs the `schema` image once to push the schema, then starts the app on port 3000. Set `POSTGRES_PASSWORD`, `POSTGRES_PORT` and `APP_PORT` in `.env` to change the defaults. The database and the sandbox snapshot are the same as in local development, so run `pnpm sandbox:snapshot` once against your Daytona account.

The worker reads the same environment variables as the web app. Set them in your Trigger.dev project's environment variables as well, with `DATABASE_URL` pointing at a database the worker can reach.

## Configuration

Ace validates its environment at startup and refuses to run with a missing or malformed required variable.

| Variable | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | yes | Session signing secret, at least 32 characters |
| `BETTER_AUTH_URL` | yes | Public URL of the app, for example `http://localhost:3000` |
| `ENCRYPTION_KEY` | yes | 32 random bytes, base64. Encrypts stored provider keys |
| `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF` | yes | Trigger.dev credentials for the worker |
| `DAYTONA_API_KEY` | yes | Daytona credentials for the sandboxes |
| `DAYTONA_SNAPSHOT` | no | Snapshot name. Default `ace-desktop` |
| `SANDBOX_CPU`, `SANDBOX_MEMORY_GIB`, `SANDBOX_DISK_GIB` | no | Sandbox size. Defaults 2, 4, 10 |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | no | Enable GitHub sign-in. Set both or neither |
| `DISABLE_SIGN_UP` | no | `true` blocks new accounts. Default `false` |
| `ALLOW_CUSTOM_BASE_URL` | no | `false` blocks custom OpenAI-compatible servers. Default `true` |
| `MAX_TEAMMATES` | no | Most teammates per user. Unlimited by default |
| `MAX_STEPS`, `MAX_TASK_BUDGET_USD`, `MAX_DAILY_BUDGET_USD` | no | Ceilings users cannot raise their limits above. Defaults 500, 1000, 1000 |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` | no | Send worker traces to Langfuse |

Model calls are billed to the user's own provider key. The host pays for Daytona, Trigger.dev, the database and the web server.

## Architecture

Two programs share one codebase and one database:

- **The web app** (Next.js 16, React 19). Pages, server actions and a few API routes for auth, avatars, pictures and screenshots.
- **The worker** (a Trigger.dev `chat.agent` task). Runs each turn: calls the model, runs the tools, streams the reply back to the browser.

The browser talks to Trigger.dev directly for message streaming, using a one-hour token scoped to a single chat. It talks to Daytona directly for the live desktop view over WebSocket.

| Area | Technology |
| --- | --- |
| Models | AI SDK 7 with the Anthropic, OpenAI, Google and OpenAI-compatible providers |
| Database | PostgreSQL with Drizzle ORM. Schema is pushed with `drizzle-kit push`; there are no migration files |
| Auth | Better Auth with email and password, plus optional GitHub |
| Background work | Trigger.dev 4 sessions and wait tokens |
| Sandboxes | Daytona, built from `sandbox/image/Dockerfile` |
| UI | Tailwind CSS 4, shadcn on Base UI, AI Elements, Phosphor icons, noVNC |
| Tests | Vitest with PGlite for database tests, Testing Library and jsdom for components |
| Lint and format | Biome |

```
app/         routes, server actions, API routes
components/  interface
lib/         code shared by browser and server: schemas, message types, model rules
server/      ports (interfaces), adapters (one per vendor), fakes, contract tests,
             agent logic (prompt, tools, risk check, approvals, limits, handoff), db
trigger/     the worker task
sandbox/     the sandbox image and its web helper script
```

The core code never imports a vendor SDK directly. Each outside service sits behind a port in `server/ports`, with one adapter per vendor and a fake for tests. Contract tests in `server/contracts` run against every adapter and fake. Swapping a vendor means writing a new adapter that passes them.

## Development

```sh
pnpm lint         # biome check
pnpm format       # biome check --write
pnpm typecheck    # next typegen && tsc --noEmit
pnpm test         # vitest, in-memory database
pnpm test:live    # contract tests against the real services in .env.local
pnpm db:push      # push schema changes to the database
```

CI runs Biome, the type check and the tests on every push to `main` and on pull requests, then builds both Docker images.

The `demo` branch is `main` plus a shared public demo: one preset account, sign-up turned off, and notices that the saved AI keys are shared. Fixes land on `main` and merge into `demo`.

## Known limits

- A teammate can use the screen only if its model can read images. Teammates on custom OpenAI-compatible servers never get the screen tool and work through commands, files and the web.
- Custom servers have no price list, so their model cost counts as $0.00. Spending limits then cover only sandbox time.
- One computer per teammate. Its chats share it and run one task at a time; a second task waits as "Up next".
