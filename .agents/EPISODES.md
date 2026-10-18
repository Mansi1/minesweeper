# Episodes

<!-- Newest last. The gate appends FAIL|DONE|FINDING; past 100 entries it trims only its own oldest DONE|FAIL|learned
FINDING (git keeps them). Leads (LESSON, FINDING learn=none) stay until wrap settles them; doctor fails above 30.
Agents append `<UTC ISO> s=<session> LESSON <VAE-DIALECT>` only for a falsified HYPOTHESIS, a dead end, or a root cause.
Session start injects the 3 newest open entries: LESSON, FINDING learn=none, FAIL without a later DONE.
Wrap: EVERY lead → test | .agents/VERIFY.py rule | one MEMORY line with BC, then delete; OR delete BC evidence. -->

2026-10-17T10:36:14Z s=8a124a6f FAIL docs.pages,prose
2026-10-17T10:37:06Z s=8a124a6f DONE fp=bf0317e54b29 cov=? paths=README.md,plans/2026-10-17_10-34_typescript-conversion.md
2026-10-17T10:48:56Z s=8a124a6f DONE fp=08af0b1f2674 cov=? paths=README.md,plans/2026-10-17_10-34_typescript-conversion.md
2026-10-17T14:24:52Z s=8a124a6f DONE fp=5b68fd77a46a cov=100.0% paths=.github/workflows/verify.yml,AGENTS.md,ARCH.md,Makefile(+19)
2026-10-17T14:24:52Z s=8a124a6f FINDING scripts/serve.ts:fetch learn=test: scripts/serve.test.ts asserts 400 against the real server process
2026-10-17T14:48:36Z s=8a124a6f DONE fp=553c39bcabcd cov=100.0% paths=.github/workflows/verify.yml,AGENTS.md,ARCH.md,Makefile(+18)
2026-10-17T14:53:12Z s=8a124a6f DONE fp=628fc8683bcf cov=100.0% paths=.github/workflows/verify.yml,AGENTS.md,ARCH.md,Makefile(+18)
2026-10-17T15:00:56Z s=8a124a6f DONE fp=d1ee6a402ad8 cov=100.0% paths=.github/workflows/pages.yml,.github/workflows/verify.yml,AGENTS.md,ARCH.md(+19)
2026-10-17T15:00:56Z s=8a124a6f FINDING tsconfig.json:lib learn=test: make lint (tsc) catches it; added dom.iterable
2026-10-17T15:15:33Z s=8a124a6f DONE fp=21d18b314b2f cov=100.0% paths=.github/workflows/pages.yml,.github/workflows/verify.yml,AGENTS.md,ARCH.md(+20)
2026-10-17T15:15:33Z s=8a124a6f FINDING e2e/game.e2e.ts:countSounds learn=test: counter now wraps both source classes; game-over sound test asserts >8 starts
2026-10-17T15:15:33Z s=8a124a6f FINDING e2e/game.e2e.ts:chord test learn=test: scenario retries on up to 4 fresh boards; 160/160 stress runs passed
2026-10-18T20:13:44Z s=8a124a6f DONE fp=89d2eeed5789 cov=100.0% paths=.github/workflows/pages.yml,.github/workflows/verify.yml,AGENTS.md,ARCH.md(+21)
2026-10-18T20:13:44Z s=8a124a6f FINDING README.md:15 B01 learn=test: win e2e now counts exactly 5 audio source starts (1 reveal + 4 win notes)
2026-10-18T20:40:33Z s=8a124a6f DONE fp=88acd17b590d cov=100.0% paths=.github/workflows/pages.yml,.github/workflows/verify.yml,AGENTS.md,ARCH.md(+21)
2026-10-18T20:40:33Z s=8a124a6f FINDING e2e/game.e2e.ts:mute test learn=test: test now starts a game first; the start-screen test asserts the panel is hidden under the menu and visible after
2026-10-18T20:40:33Z s=8a124a6f FINDING e2e/game.e2e.ts:play again learn=test: easy one-heart test and core LEVELS ordering test cover per-level hearts
2026-10-18T20:43:45Z s=8a124a6f DONE fp=9b42da524e7b cov=100.0% paths=.github/workflows/pages.yml,.github/workflows/verify.yml,AGENTS.md,ARCH.md(+21)
2026-10-18T20:43:45Z s=8a124a6f FINDING src/style.css:.status-wrapper learn=test: start-screen e2e asserts scrollHeight <= innerHeight on Easy
2026-10-18T21:06:59Z s=8a124a6f DONE fp=ecb121202f3c cov=100.0% paths=.github/workflows/pages.yml,.github/workflows/verify.yml,AGENTS.md,ARCH.md(+22)
2026-10-18T21:06:59Z s=8a124a6f FINDING src/FieldMatrix.ts:checkWin learn=test: win e2e asserts 81 cells in the wave with running animations, glow class, 120 confetti pieces, end screen only after the wave
2026-10-18T21:06:59Z s=8a124a6f FINDING src/main.ts:newGame learn=test: restart e2e waits 1.5 s and asserts the clock stays 0
2026-10-18T21:06:59Z s=8a124a6f FINDING e2e/game.e2e.ts:cheering learn=test: helper now filters running animations
2026-10-18T21:11:12Z s=8a124a6f DONE fp=037ae728541d cov=100.0% paths=.github/workflows/pages.yml,.github/workflows/verify.yml,AGENTS.md,ARCH.md(+23)
2026-10-18T21:12:50Z s=8a124a6f DONE fp=c6631d40062c cov=100.0% paths=.github/workflows/pages.yml,.github/workflows/verify.yml,AGENTS.md,ARCH.md(+23)
2026-10-18T21:12:50Z s=8a124a6f FINDING e2e/game.e2e.ts:animating learn=test: both helpers now count playState running only; lose and reduced-motion tests pass
2026-10-18T21:13:31Z s=8a124a6f DONE fp=769194aad2ce cov=100.0% paths=.github/workflows/pages.yml,.github/workflows/verify.yml,AGENTS.md,ARCH.md(+24)
