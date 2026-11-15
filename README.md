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

Every round has a selectable question, a timer with a round-appropriate duration, an answer editor, an expandable prospective answer where available, and five self-review checks. Coding questions use a language-specific starter and external compiler link.

The site does not execute code or provide automatic grading. Self-review is explicitly labelled as self-assessment. Notes, checklists, saved questions and selected filters persist in the visitor's browser. Programming drafts and review progress are separate by language. Prior Java drafts and progress are preserved. No application accounts or shared database are implemented.

## Run locally

No dependency installation or build is required. Serve `dist/` in the source checkout, or the folder containing `index.html` in the download, with a static HTTP server. Opening `index.html` locally also works; clipboard support depends on browser local-file policy.

Main routes: `#/`, `#/rounds`, `#/round/introduction`, `#/round/coding`, `#/round/technical`, `#/round/manager`, `#/round/hr`, `#/domains`, `#/languages`, `#/roles`, `#/lab` and `#/best-practices`.

## Verification

- JavaScript syntax and local asset checks passed.
- All 48 domain/role combinations have concepts and questions for all five rounds.
- Eight shared coding answer versions ran successfully across Java, Python, JavaScript and TypeScript; the two new TypeScript versions also passed strict ES2022 type checking.
- The previous 60 added language samples and 20 strict TypeScript checks remain valid; their source is unchanged.
- Browser checks covered the public landing page, all five round paths and their resource navigation, role-specific question filtering, independent domain/language/role paths, prospective answers, lab timer start/pause/reset, answer copying, saved notes and self-check persistence, and responsive home/lab layouts at 390 px without document-level overflow.

## Publication status

Source synchronization to the existing Sites repository at git.chatgpt-team.site is authorized. No website deployment or public-access change is requested. Keep the Site unpublished when synchronizing this source.
