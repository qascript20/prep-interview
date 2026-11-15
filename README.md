# PrepSpace — Interview Preparation

A public-facing interview preparation website organised around the full interview journey. Its landing page introduces the product and offers three independent entry paths: domain, programming language and target role. It uses top navigation and a shared preparation filter bar instead of a personal workspace dashboard.

## Preparation paths

Domains: Investment Banking, Core Banking, Ecommerce, AI, Cloud and Data Engineering.

Programming languages: Java, Python, JavaScript and TypeScript.

Roles: Software Engineer, QA / SDET, Test Director / QA Lead, Engineering Manager, Data Engineer, AI / ML Engineer and Cloud / DevOps Engineer.

Visitors can start with one path or combine the filters. Domain, language and role catalogue links establish a useful independent starting point; the filters then refine the path.

## Interview rounds

1. Introduction Round — generic questions, introductions and motivation.
2. Live Coding Round — coding problems, input contracts and verification.
3. Technical Round — concepts, domain scenarios and technical decisions.
4. Manager Round — senior stakeholder communication, release decisions, investment and influence.
5. HR Round — career motivation, development and mutual fit.

Each round has concepts and methods, questions and prospective answers, access to the practice lab, and best practices with self-review criteria. Sample experience answers are clearly illustrative structures to adapt using truthful personal examples.

## Content

- 27 concept lessons, 57 unique questions and 5 supporting references.
- 45 questions with worked solutions or prospective answers; 12 remain explicitly independent practice prompts.
- 21 new questions and 5 new round-specific concept lessons added in the public-site redesign.
- Seven role-specific technical scenarios and role-focus profiles.
- All original Java material and the previous language editions remain available.
- The 33 main programming resources (10 lessons, 12 core worked exercises and 11 independent prompts) switch between Java, Python, JavaScript and TypeScript. Three optional archived HTML exercises keep their labelled original Java source.
- Python uses Decimal for financial examples. JS/TS use exact bigint cents under a declared fixed two-decimal currency contract. TypeScript examples target ES2022.

## Practice lab

Every round has a selectable question, a timer with a round-appropriate duration, an answer editor, an expandable prospective answer where available, and five self-review checks. Coding questions include a syntax-highlighted editor, line numbers, indentation, bracket matching, standard input, Run/Stop controls and an output/diagnostics console.

The integrated runner executes code; it does not automatically grade interview answers. Self-review is explicitly labelled as self-assessment. Notes, checklists, saved questions and selected filters persist in the visitor's browser. Programming drafts and review progress are separate by language. Prior Java drafts and progress are preserved. No application accounts or shared database are implemented.

## Run locally

No npm installation or frontend build is required. To use all four integrated runtimes on this Mac, run from the source checkout or downloaded website folder:

```sh
python3 server/local_server.py --port 8796
```

Then open `http://127.0.0.1:8796/#/lab?round=coding`. `Run PrepSpace.command` is an equivalent macOS launcher. Python 3 and a JDK 17+ must be installed. The local service uses macOS sandbox-exec and fails closed if its self-test does not pass.

A static HTTP server can run the JavaScript/TypeScript browser runner, but Java/Python require the bundled local service. Opening index.html as a file is suitable for reading; compiler assets and execution require HTTP.

Main routes: `#/`, `#/rounds`, `#/round/introduction`, `#/round/coding`, `#/round/technical`, `#/round/manager`, `#/round/hr`, `#/domains`, `#/languages`, `#/roles`, `#/lab` and `#/best-practices`.

## Verification

- JavaScript syntax and local asset checks passed.
- All 48 domain/role combinations have concepts and questions for all five rounds.
- Eight shared coding answer versions ran successfully across Java, Python, JavaScript and TypeScript; the two new TypeScript versions also passed strict ES2022 type checking.
- The previous 60 added language samples and 20 strict TypeScript checks remain valid; their source is unchanged.
- Browser checks covered the public landing page, all five round paths and their resource navigation, role-specific question filtering, independent domain/language/role paths, prospective answers, lab timer start/pause/reset, answer copying, saved notes and self-check persistence, and responsive home/lab layouts at 390 px without document-level overflow.

## Publication status

Source synchronization to the existing Sites repository at git.chatgpt-team.site is authorized. No website deployment or public-access change is requested. Keep the Site unpublished when synchronizing this source.

## Integrated editor and compiler

- CodeMirror 5.65.21 provides syntax highlighting for all four languages, line numbers, indentation, bracket matching and keyboard access. Ctrl/Cmd+Enter runs code; Esc moves to Run.
- Demo loading, worked-solution loading, earlier-draft restoration and code download are available. Drafts and standard input persist separately per question and language.
- Java compiles with --release 17 and then runs in a temporary job directory on this computer. Python performs a syntax check before execution. The local service does not send source or input to third-party execution APIs.
- JavaScript runs in a dedicated worker inside an opaque sandboxed iframe. Its CSP blocks networking; the worker has no page DOM or browser-local notes. TypeScript 5.7.3 performs strict ES2022 type checking before execution, using bundled definition files.
- JavaScript/TypeScript are terminal-program browser runtimes, not a general Node.js installation. Use readAll() or readLine() for standard input. The fs.readFileSync(0, "utf8") input idiom is supported, but arbitrary packages and filesystem operations are not. SharedArrayBuffer examples require a compatible isolated runtime and are not enabled in this browser sandbox.
- Java/Python execution is loopback-only, accepts same-origin JSON requests, blocks network access and subprocess creation in the macOS sandbox, restricts personal-file reads and writes, and uses CPU/wall/output limits. The service caps concurrency at two jobs, code at 128 KiB and standard input at 64 KiB. Stop terminates the process group, including cancellation arriving before job registration.
- This local runner is for the local preparation site. Public Java/Python execution needs a separate hardened, container-isolated execution backend; the loopback service must not be exposed as a public multi-tenant runner.

New verification covered all four demo programs returning 30 from input 10 20, and the real duplicate-ID worked solution passing in all four integrated runtimes. Browser checks also covered TypeScript type errors, worker isolation, Stop, timeouts and keyboard editing. Eleven API checks covered Java/Python execution, diagnostics, sandbox/private-file/network restrictions, cross-origin denial, code bounds, cancellation and time limits. Final checks also verified cancellation before job registration and removal of the stopped browser runner.

Bundled third-party licenses are retained under dist/vendor (or vendor in the download): CodeMirror (MIT) and TypeScript (Apache 2.0, with its third-party notice).

Java and Python runs use their standard libraries. External JARs, Python packages, arbitrary Node packages and page DOM APIs are not included in this single-file practice environment.
