# PrepSpace — Banking Java & SDET Interview Preparation

A public-facing interview preparation site with a working local Java assessment pilot. Start at http://127.0.0.1:8796 after launching the local server.

## Implemented

- Banking Java/backend and QA/SDET paths, with 7-, 14- and 28-day plans and five interview-round sequences.
- 24 versioned Java exercises: 12 implementation, four debugging, four test-design and four multi-file projects. All reference implementations pass their contract checks and all 24 constant-output negative controls are rejected.
- Exact input/output contracts, examples, constraints, progressive hints and click-to-reveal answers with detailed explanations. Answers are fetched only on request for assessed pilot exercises.
- Compilation, runtime, timeout, output-limit, incorrect-output, cancellation and infrastructure results remain distinct. Expected outputs and grades are computed outside candidate execution.
- Black-box test-design exercises validate assertions and detect seeded faulty behaviours. Functional checks do not certify design quality, immutability, communication or race freedom.
- Multi-file Java editing, browser autosave, version conflicts, snapshots, source restoration, project downloads, saved explanations and private attempt history.
- Competency evidence and later variation recommendations; assistance is explicitly browser-recorded/self-reported. No overall readiness score or hiring prediction.
- Local SQLite persistence; hosted Worker support for native Sites identity, single-use invitations, a 30-person membership cap, revisioned cloud drafts/plans, account export/deletion, issue reports and opt-in research events.
- Hosted E2B adapter with short-lived network-disabled sandboxes, bounded candidate processes, cancellation, daily/queue/concurrency limits and budget reservations. Cloud execution remains disabled until configured and live-verified.

## Interactive concepts

All 27 concept pages use Learn, Try it and Quick check modes, with short explanations, explorable method cards, searchable methods, input/output predictions and explanations revealed on demand. The ten core Java lessons include step-through teaching models for construction, null guards, exact arithmetic, collections, map updates, stream stages, grouping, executors, atomic updates and context cleanup. Concepts support Java and Python only; Python uses its own code scenarios and language-specific learning checks. Legacy JavaScript/TypeScript concept links fall back to Java. The concept language is saved separately from the Practice Lab language, where all four languages remain available. Models are illustrative, not code execution or automatic certification. Predictions are saved in this browser; complete original references remain printable.

Verify with `node tests/browser-concepts.mjs`.

## Preserved

The existing six-domain, four-language and seven-role study library remains accessible. The coding lab lists 35 Java coding exercises: 24 assessed pilot exercises and 11 manual-practice exercises (33 Investment Banking plus two shared exercises). Other domain filters show honest empty states for coding. Python, JavaScript and TypeScript retain existing manual runners and language-specific drafts; Java assessment results do not imply assessment parity in another language.

Practice Lab is coding-only. Ordinary practice has no focus countdown. Self-review criteria remain static tick marks. No Copy answer button is added. The original Java study pack and archived material remain available.

## Run and verify

```sh
python3 -B server/local_server.py --port 8796
npm ci --cache /private/tmp/prepspace-npm-cache
npm run check
npm run verify:java
npm run build
node tests/browser.mjs
```

Use macOS, Python 3, JDK 17+ and Node 24+ for the complete local verification workflow. Java/Python run through a loopback-only macOS sandbox that fails closed. JavaScript/TypeScript manual programs run in isolated browser workers. Never expose the local server as an internet-facing execution service.

Private local data is in `.runtime/`, which is ignored by Git. Environment secrets are documented by name only in `.env.example`. The server-backed hosting configuration uses D1 and Sites-managed identity; it is prepared but not deployed or live-verified.

## Status and remaining launch gates

The source repository may be synchronised to the previously authorised git.chatgpt-team.site destination. The Site remains unpublished; no public access change is made.

Cloud credentials, provider/region review and live sandbox acceptance checks are still required. Practitioner review, candidate interviews, pilot recruitment and learning-outcome studies have not been completed or fabricated. AI coaching remains disabled until a reviewed benchmark and separate integration pass their gates.

See [operations](docs/OPERATIONS.md), [research protocol](docs/RESEARCH-PROTOCOL.md) and [implementation notes](docs/IMPLEMENTATION.md). Third-party CodeMirror/TypeScript notices remain bundled. E2B SDK and build dependencies are pinned in package-lock.json.
