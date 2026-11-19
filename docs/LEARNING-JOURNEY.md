# Guided learning redesign

The public homepage introduces a progression from foundations to independent practice and complete interview rehearsal. It has an interactive starting-level preview, a learning map, concept/practice explanations, five interview-round links and transparent coverage information. A calm teal/green palette, larger body text and shorter navigation support the learning-first layout.

`#/learn` creates a browser-local path from starting level, Java/Python, role, domain and typical session length. Each path has five stages:

1. Foundations: construction, equality, collections and structured explanations.
2. Guided practice: maps, decimal arithmetic, transformations and a small coding task.
3. Independent coding: implementation tasks, or Java SDET debugging/test-design tasks.
4. Technical depth: grouping, concurrency, context, domain concepts, independent capstone exercises and a role-specific decision. Java capstones use multi-file reconciliation/ledger/regression components and concurrent event processing; Python uses complete snapshot reconciliation.
5. Interview rehearsal: introduction, coding discussion, technical reasoning, stakeholders and HR.

All stages stay accessible. Choosing an advanced entry point changes the recommendation without awarding earlier completion. Tasks return to the correct path stage from concept pages, question readers and the coding lab. Preferences can be adjusted or removed without deleting code drafts, attempts, lesson reviews or reflections.

## Progress semantics

- Concept progress uses the existing explicit Mark as reviewed action. Programming editions retain separate Java/Python review keys.
- Assessed coding requires a full successful check in the current Java problem version, with the expected test count. Sample runs, older versions, other languages and partial checks do not count.
- Independent assessed tasks additionally require explicit records of zero hints, no viewed/loaded answer and no reported external help.
- Manual-language coding and interview rehearsals require a deliberate self-review and a reflection of at least 20 characters. These remain labelled self-reviewed; the text length is a recording requirement, not an assessment of answer quality.
- The page records steps rather than an overall readiness percentage or expertise certificate. Coding evidence uses up to 200 recent saved attempts.

Paths and reflections stay in browser storage. They are included in the existing private browser-data export/deletion flow and are isolated when the preparation workspace identity changes. Execution history is loaded through the authenticated/same-origin pilot client; cached evidence is ignored when the workspace key changes. The path itself does not promise cross-device synchronisation.

Foundation examples retain their documented language editions. Existing trade/order exercises provide core practice, while the chosen domain changes specialist concepts and discussion tasks. Automated contract assessment remains banking Java; the interface labels Python practice as manual and preserves JavaScript/TypeScript in the broader coding lab.

## Validation

`npm run check` verifies progression, evidence rules, language-separated reviews, reflection scope, and links for every role/domain/language path, alongside existing backend/content tests. `npm run build` packages the site.

Browser QA covered the public starting-level preview, onboarding, saved preferences, beginner Python and advanced Java SDET paths, lesson/lab return links, blank-reflection rejection, path removal, answer concealment, and retained language filtering. At a 390px viewport, the page fits without horizontal document overflow; stage navigation scrolls its selected stage into view. Temporary viewport overrides and test path preferences are cleared after QA.
