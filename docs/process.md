# Process: how the work runs

<!-- Source: docs/PLAN.md. Edit there, then re-split. -->

## Part D: Process (how the work runs)

### D1. Order of operations, fixed
1. Read `docs/SPEC_v3.md`. Check G1 (consent) and G2 (inventory) before any voice or
   catalog code.
2. Read the bhavna.ai process docs. Verify the STT interface. Log it in
   `docs/bhavna_integration_notes.md`.
3. Build P1 to P8 in that order. Write the tests first. Stop at each milestone to update
   `DEVLOG.md`.
4. Commit after each milestone, like `feat(M3): 60-second swap window`.
5. Keep this docs tree in step: `process-trace.md`, `journal/`, `discussions/`, `ideas.md`.

### D2. Commits and the repo
- Public repo: https://github.com/satvik-jain-iitd/kuiklo-telegram-order-demo.
- One commit per milestone, Conventional Commits, English, short.
- `docs/consent/*` is gitignored. The consent note never leaves the machine.
- `n8n/build/` is gitignored. The build is reproduced with `node n8n/assemble.js`.
- Branches and PRs are not used yet. If the project grows, follow bhavna's `dev` and
  `feat/` rules.

### D3. Test-driven development
For every story:
1. Write the failing test in `n8n/test/test_brain.js`, named after the spec id (T-NN).
2. Run `node n8n/test/test_brain.js`. See it fail.
3. Write the least code in `n8n/code/brain.js` that passes.
4. Refactor with ponytail eyes. Run again.
Rules. The brain is pure JS with the clock injected, so every state and timing test runs
without n8n. Code node sources run once with stubs after assembly. STT, KB and voice are
checked by self-checks (`kb.py`, `voice.py`) and by real calls from the Oracle box. Manual
checks M-01 to M-04 are rows in `docs/tests/test-cases.md` with a date and a result.

### D4. DEVLOG, demos and the journey log
- `DEVLOG.md`: one entry per milestone. Built, Decision, Failed, Fix, Verified by, Time.
- `docs/demos/D<n>.md`: the demo script and what was learned.
- `docs/journal/YYYY-MM-DD.md`: one entry per working session.
- `docs/decisions/ADR-NNN.md`: every decision that changes architecture or scope.
- `docs/ideas.md`: every idea, dated, one line, with status. Mirrored to the SecondBrain
  ideas log.
- `docs/research/`: findings with tiers; `experiments.md` with hypothesis, design, result,
  decision. Rows are never deleted.

### D4b. Discussion log
`docs/discussions/YYYY-MM-DD.md`: bullets of what the owner pointed out, pushed back on,
and decided. The "why" behind each ADR traces to a line here.

### D5. n8n rulebook (house rules that apply here)
- The repo is the source of truth. `assemble.js` builds the workflow. Never edit in the UI.
- MAIN owns the trigger, Config and the kill switch. SUB workflows only when one workflow
  cannot do the job (ADR-003: not needed yet).
- Secrets live in n8n credentials or `.env` files, never in node parameters.
- Every IF boolean condition carries `singleValue: true`.
- `replyMarkup` on a Telegram send node is the literal `inlineKeyboard`.
- A Code node that needs the raw update reads `$('Telegram Trigger')`, not `$input`.
- Deploy by API. Check the webhook has 0 pending updates after activation.

### D6. Definition of ready (a story may start only when all are true)
1. The story has a spec id (P-n, T-nn or M-nn) or a row in the backlog with Gherkin.
2. Every scenario is testable: a unit test, a self-check, or a manual row.
3. The gate it touches (G1 consent, G2 inventory, G3 scope) is checked and written down.
4. Dependencies (Oracle service up, credential ids, catalog rows) are listed.
5. The ponytail line is written: what is deliberately not built.

### D7. Definition of done (story)
Test written first and green. Scenario mapped to a test or a manual row. DEVLOG entry.
Ponytail review: nothing speculative added.

### D8. Definition of done (demo)
Minimum showcase: T-01 to T-19 pass; M-01 and M-03 done in a real chat; no stock figure in
any message; every summary shows all charges; DEVLOG has one entry per milestone.
Full: P6 to P8 done; T-20 to T-31 pass; M-02 and M-04 done; consent note on file.

### D9. Bug lifecycle
When a bug is found in a live test: write it in DEVLOG under Failed before the fix. Fix it.
Add a test that would have caught it when a unit test can see it. Add one row under
"Regression" in `docs/tests/test-cases.md`. One row in `docs/process-trace.md`.

### D10. Spot test before handing back
After any fix on the STT, KB or voice path, run one real call from the Oracle box (a real
wav through `/transcribe`, a real question through `/ask`, one `/voice` call) and paste the
result in DEVLOG. The owner's live check comes after, not instead.

### D11. Process trace
`docs/process-trace.md` gets one row per step. First action of a session: read it. Last
action before "done": append to it. Owner contact is marked asked, volunteered or reviewed.

### D12. Tooling
- `node` for tests and assembly. `pm2` on Oracle for the service. n8n API for deploys.
- `gh` for the public repo. GitHub Pages for `docs/index.html`.
- `python3 ~/Desktop/SecondBrain/tools/grade.py <note>` to check the reading level of docs.
