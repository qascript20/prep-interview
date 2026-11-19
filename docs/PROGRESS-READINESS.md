# Visual road and preparation checkpoints

The Progress navigation opens `#/progress`. The road runs from Start through Foundations, Guided practice, Independent coding, Technical depth and Interview rehearsal to an Interview-ready target. Each milestone links to its learning stage. Find my position scrolls to the current car. The road becomes vertical on small screens, with the same links, counts and accessible names.

The car represents the earliest incomplete stage. Its position along that stage's road segment is the fraction of required steps recorded. A completed segment turns green. Later work stays visible in its own milestone, but does not skip earlier gaps. Choosing an advanced entry point only changes learning recommendations. It does not award completed steps or move the car.

After all five learning stages, the car waits at the start of the final road segment until readiness is confirmed. The target is reached only when all required evidence is available and the full mock checkpoint is recorded. New visitors see a labelled preview and a create-path action, with no invented progress.

## Evidence requirements

| Requirement | Evidence |
| --- | --- |
| Concept review | Explicit review of the appropriate language edition; language-independent material can be shared. |
| Guided Java coding | A completed full check against the current problem version, with every expected contract test passing. Sample runs do not qualify. |
| Independent Java coding | The same full check, with zero recorded hints and explicit false flags for answer viewing, solution loading and external help. |
| Python coding | Manual practice and an explicit self-review with a reflection of at least 20 characters. Java results do not transfer to Python. |
| Interview rehearsal | An explicit rehearsal review with a reflection of at least 20 characters. |
| Full mock | Confirmation of introduction, coding, technical, manager and HR rounds; strengths and improvement reflections of at least 40 characters each; explicit final confirmation and a saved timestamp. |

Java readiness is labelled Interview-ready for this path. Python is labelled Interview-ready · self-assessed. Reviews, assistance and mock confidence remain self-reported. Functional checks do not certify design, communication or general expertise. No overall readiness percentage or prediction of an employer's decision is calculated.

The readiness target always uses the complete expected curriculum. Missing reviewed material does not reduce the target. Missing Java grading metadata or execution history prevents confirmation. Infrastructure failures are not treated as incorrect candidate solutions. History uses up to 200 recent saved attempts, and the interface provides a refresh action and a link to inspect those attempts.

## Scope and persistence

The full mock is scoped to language, domain, role, curriculum task IDs and current Java problem versions. Changing a contract requires current coding evidence and a new scoped checkpoint. Changing session duration or starting level does not invalidate the same preparation evidence.

The mock can be rehearsed early, but cannot compensate for unfinished stages. Draft changes are saved without confirming completion. A completed record is read-only until Reopen checkpoint is selected; reopening withdraws its completion immediately while preserving its notes.

Path preferences, rehearsal reflections and mock records stay in the browser, within the existing workspace identity. They participate in browser export and deletion and are not presented as cloud-synchronised mock history. Existing coding attempts remain managed by the preparation service.

The remaining-session figure adds the listed durations of unfinished tasks and 45 minutes for an unfinished mock, then divides by the selected session duration, rounding up. It is a workload estimate, not a forecast of when someone will be ready.

## Verification

`tests/readiness.test.mjs` covers actual position versus entry level, incomplete earlier stages, full-check/version/assistance requirements, missing history and content, mock validation, profile isolation, Python self-assessment, workload estimates, all role/domain/language combinations and road geometry. Browser verification covers milestone navigation, required mock fields, desktop layout and the 390px mobile road without horizontal overflow. No fabricated positive learning records are added to the browser workspace.
