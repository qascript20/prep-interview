# PrepSpace — Banking Java & SDET Interview Preparation

A public-facing interview preparation site with a working local Java assessment pilot. Start at http://127.0.0.1:8796 after launching the local server.

## Guided learning journey

The public overview introduces a five-stage route from foundations through guided practice, independent coding, technical depth and complete interview rehearsal. Start at `#/learn` and choose a starting level, Java/Python, one of seven roles, a domain and a typical session length. Earlier stages remain available; a later starting level never awards earlier progress.

Recommendations use the selected starting point and actual records: self-reviewed concept editions, deliberate rehearsal reflections, and full current-version Java contract checks. Independent coding additionally requires no recorded assistance. Manual-language practice is labelled self-reviewed. Every lesson and linked coding task offers a return to the learning path. Existing drafts, explicit answer reveal, progressive hints and the five interview rounds are preserved.

Path preferences and reflections are stored in this browser and isolated with the existing workspace identity. They are included in browser-data export and deletion. Removing a path preserves drafts and learning records. Java coding evidence is loaded from the existing preparation service and is never converted into an overall readiness or expertise score.

## Visual progress road

Open `#/progress` for a winding road from Start to the Interview-ready target. A candidate follows recorded progress through five clickable milestones. The road reveals in a short sequence, and the candidate walks between recorded positions. Replay animation repeats the route only up to the recorded position. Device reduced-motion preferences show the final state without animation. Desktop uses a horizontal road; mobile uses a vertical road. The current milestone is the earliest incomplete stage, regardless of the chosen starting level or the page being viewed. The public overview shows a compact progress summary for returning learners.

Readiness requires all five learning stages plus an explicit full-mock self-assessment covering all five interview rounds. Java coding requires current full contract checks; independent tasks also require no recorded assistance. Python readiness is explicitly labelled self-assessed. Missing material or unavailable Java execution history keeps readiness pending. These are transparent preparation checkpoints, not a hiring prediction. See [progress and readiness](docs/PROGRESS-READINESS.md).

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

## Learn: Java data-structures tutorial

Learn replaces the standalone Concepts catalogue. It contains 23 sequential Java 17 lessons in six groups: Foundations, Linear structures, Sets, Maps, Concurrent structures and Custom structures. The course includes arrays, strings, lists, stacks/deques, queues, priority heaps, set variants, map variants, identity and equality, copies/views, concurrent collections, blocking queues, binary search trees, graphs/BFS, tries, union–find and prefix/Fenwick/segment-tree trade-offs. Specialized and legacy JDK types are compared where relevant.

Every lesson contains goals, explanations and operation costs, a runnable example with input/setup, an explicit output reveal, an interactive recall check with feedback, mistakes, interview rehearsal and source links. JDK APIs and custom implementations are labelled separately. All 23 programs were compiled with `javac --release 17 -encoding UTF-8` and their documented outputs verified. Tutorial pages show teaching examples; runnable coding remains in the Practice Lab.

Tutorial reviews are explicit self-assessments and never awarded by a quiz answer. Review state and versioned check choices are scoped to the active browser workspace and participate in existing browser export/deletion. Previous interview answer drafts remain keyed by the original lesson IDs. The original seven Java technical question URLs now open their tutorial chapters. `#/concepts` remains a compatibility alias for Learn, and earlier tutorial URLs still work. Legacy study data remains for saved links and the existing guided path; it is not presented as a separate lesson library in Learn.

Java is the available tutorial language. Non-Java tutorial URLs show a clear availability state; Python, JavaScript and TypeScript coding remain in the Practice Lab. No concept-library tab is added. Desktop has a scrollable course sidebar; mobile has a compact, expandable contents menu.

## Preserved

The original Technical Round questions are retained as tutorial interview practice covering List/Set/Map, Queue versus LinkedList, List versus HashMap, HashMap versus TreeMap, Map interfaces, custom-key equality and HashMap performance. Answers stay behind an explicit reveal and include operation-specific comparisons, scenarios, runnable Java 17 programs, expected output, common mistakes, follow-ups and official API references reviewed on 21 November 2026. All seven programs were compiled with `javac --release 17` and their outputs verified. These oral questions are available only in Java and do not enter the Live Coding Lab.

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
