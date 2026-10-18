# Project interface (defuss-vae layout): the same verbs for humans, agents and CI; `make` lists them with usage.
# Service: RUN = foreground command; stdout/stderr → var/log/$(NAME).*, pid → tmp/$(NAME).pid (both gitignored).
# test/coverage/lint/e2e exit 2 (UNKNOWN) until defined: the verifier runs them on every gate,
# and e2e must leave fresh files in output/ (the consumer's results or a Playwright report).
# Toolchain: new projects start on bun (JS/TS) or uv (Python); each placeholder names the default recipe.
# RUN e.g. `bun run src/index.ts` (bun loads .env) | `uv run --env-file .env python -m app`; apps log ISO-8601 UTC first, exit cleanly on SIGTERM.
NAME ?= minesweeper
RUN  ?= bun run build && exec bunx vite preview --port $(PORT) --strictPort
PORT ?= 8080
export PORT
N    ?= 50
export RUN
# Config: KEY=value lines of the gitignored .env reach every recipe and the app `start` runs. Make reads them, so
# `#` starts a comment and `$` must be `$$`; values needing either belong in the app's own .env loader.
-include .env
ENV_KEYS := $(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' .env 2>/dev/null)
ifneq ($(ENV_KEYS),)
export $(ENV_KEYS)
endif
# Installer default dirs as a fallback (uv, bun, mise shims, rustup, go install, dotnet tools): shell recipes find tools
# setup just installed, while tools already on PATH keep precedence.
export PATH := $(PATH):$(HOME)/.local/bin:$(HOME)/.bun/bin:$(HOME)/.local/share/mise/shims:$(HOME)/.cargo/bin:$(HOME)/go/bin:$(HOME)/.dotnet/tools
LOG   = var/log/$(NAME)
PID   = tmp/$(NAME).pid
ALIVE = [ -f $(PID) ] && kill -0 "$$(cat $(PID))" 2>/dev/null

.PHONY: help setup start stop restart status log metrics bench test coverage lint e2e verify
.DEFAULT_GOAL := help

help: ## list the verbs with their usage (default goal)
	@awk -F':.*## ' '/^[a-zA-Z0-9_ -]+:.*## /{printf "  %-12s %s\n", $$1, $$2}' $(firstword $(MAKEFILE_LIST))

# Fresh clone or machine: tools pinned in mise.toml, official installers for a missing uv/bun, then exactly the
# locked deps. Only declared toolchains are touched, so an existing npm/poetry project is never migrated silently.
setup: ## install pinned tools (mise.toml) and exactly the locked dependencies
	@if [ -f mise.toml ] || [ -f .tool-versions ]; then command -v mise >/dev/null 2>&1 || curl -fsSL https://mise.run | sh; mise install; fi
	@if [ -f uv.lock ]; then command -v uv >/dev/null 2>&1 || curl -LsSf https://astral.sh/uv/install.sh | sh; uv sync --locked; fi
	@if [ -f bun.lock ] || [ -f bun.lockb ]; then command -v bun >/dev/null 2>&1 || curl -fsSL https://bun.sh/install | bash; bun install --frozen-lockfile; fi
	bunx playwright install $$([ "$$CI" = true ] && echo --with-deps) chromium

# No service (library)? Replace start..log with one line: start stop restart status log: ; @echo "∅ $@: no service"
# Own process group (setsid, else job control) so stop reaps children too; redirected stdio keeps agent shells from hanging.
start: ## run RUN detached: pid in tmp/, stdout|stderr appended to var/log/
	@mkdir -p var/log tmp
	@if $(ALIVE); then echo "running pid=$$(cat $(PID))"; exit 0; fi; \
	[ -n "$$RUN" ] || { echo "UNKNOWN[start] BC RUN unset"; exit 6; }; \
	if command -v setsid >/dev/null 2>&1; then nohup setsid sh -c "$$RUN" >$(LOG).stdout 2>$(LOG).stderr </dev/null & \
	else set -m; nohup sh -c "$$RUN" >$(LOG).stdout 2>$(LOG).stderr </dev/null & set +m; fi; \
	echo $$! >$(PID); sleep 1; \
	if $(ALIVE); then echo "running pid=$$(cat $(PID))"; else echo "dead; see: make log"; exit 1; fi

stop: ## SIGTERM the service group, SIGKILL after 5 s
	@if $(ALIVE); then p=$$(cat $(PID)); kill -s TERM -- -$$p 2>/dev/null || kill -s TERM $$p; \
	i=0; while kill -0 $$p 2>/dev/null && [ $$i -lt 50 ]; do sleep 0.1; i=$$((i+1)); done; \
	kill -s KILL -- -$$p 2>/dev/null || true; fi; rm -f $(PID); echo stopped

restart: stop start ## stop, then start

# LSB codes (make prints them as Error N): 0 running, 1 dead with stale pid, 3 stopped.
status: ## running | dead (stale pid) | stopped, as LSB exit codes
	@if $(ALIVE); then echo "running pid=$$(cat $(PID))"; \
	elif [ -f $(PID) ]; then echo "dead pid=$$(cat $(PID)); see: make log"; exit 1; \
	else echo stopped; exit 3; fi

log: ## tail stdout and stderr logs (N=50 lines)
	@for f in $(LOG).stdout $(LOG).stderr; do [ -f $$f ] && { echo "== $$f"; tail -n $(N) $$f; }; done; \
	ls $(LOG).* >/dev/null 2>&1 || echo "∅ no logs for $(NAME)"

metrics:  ; @echo "UNKNOWN[metrics] BC undefined: print current service|build metrics"; exit 2  ## print current service|build metrics
bench:    ; @echo "UNKNOWN[bench] BC undefined: measure hot paths before perf claims"; exit 2  ## measure hot paths before perf claims
test: ## unit tests of the game rules (src/*.test.ts)
	bun test src
coverage: ## print line coverage of the unit tests
	bun test src --coverage
lint: ## type-check (strict) and lint, warnings fail
	bunx tsc -p .
	bunx oxlint --deny-warnings src e2e
e2e: ## build, serve dist/ via start (vite preview), play it in Playwright Chromium; results in output/
	@$(MAKE) --no-print-directory stop start
	@i=0; until curl -sf http://localhost:$(PORT)/ >/dev/null; do i=$$((i+1)); [ $$i -lt 50 ] || { $(MAKE) stop; $(MAKE) log; exit 1; }; sleep 0.2; done
	@bunx playwright test; rc=$$?; $(MAKE) --no-print-directory stop; exit $$rc

# What CI runs; the gate runs the same verbs one by one and fails while verify skips any. Fail-fast order: cheapest first.
verify: lint test coverage e2e ## what CI runs: every gate verb, cheapest first
