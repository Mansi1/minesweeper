# CLI gist

<!-- Commands future agents need that the Makefile verbs do not cover (setup, env, data, deploy):
- VERIFIED[purpose] `cmd`: only after an observed success
- UNKNOWN[purpose] BC gap
Budget 2 KiB (`vae.py doctor --repo .`); entries are injected at session start. -->
- VERIFIED[dev] `bun run dev`: Vite 8.3.4 dev server on http://localhost:5173/
- VERIFIED[browser] `make setup` installs Playwright Chromium (`--with-deps` only when CI=true)
