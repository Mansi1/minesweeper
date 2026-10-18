# Agent memory

<!-- One tagged line per durable fact NOT derivable from code, git or docs:
- VERIFIED[scope] fact BC evidence
- HYPOTHESIS[scope] claim BC observation; falsifier=`cmd`
- UNKNOWN[scope] gap BC missing evidence
[scope] = the narrowest path|module|command|condition the evidence covers, not a topic: the entry decides nothing
outside it, and recurrence inside one subsystem never widens it.
Every line carries its BC and stays ≤240 chars. Replace stale lines instead of appending.
Mechanizable lessons belong in tests or .agents/VERIFY.py.
Budget 4 KiB (`vae.py doctor --repo .`); entries are injected at session start. -->
VERIFIED[GitHub Pages Mansi1/minesweeper] build_type=legacy serving master / BC `gh api repos/Mansi1/minesweeper/pages` 2026-10-18; pages.yml needs build_type=workflow, switch right before the first push (human approval)
VERIFIED[vae gate fingerprint] `git reset` of staged renames turns them into delete+add, which changes the fingerprint BC wrap 2026-10-18; refresh attestations and assess the deleted paths in docs.json
