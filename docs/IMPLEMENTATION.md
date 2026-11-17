# Implementation boundaries and verification

## Product model

Public contracts are generated from a versioned original catalogue. Existing question IDs are reused for 12 Java implementation exercises; 12 debugging/testing/project tasks are added. Previous manual Java drafts remain in legacy storage and can be recovered or exported. The other language editions and legacy routes remain available with honest assessment coverage labels.

The assessed lab compiles Java once per job and evaluates each process output against expectations in the trusted host. Multi-file projects keep domain models and application logic separate. Test-design tasks generate input/expected pairs; the trusted host validates each assertion and evaluates seeded faulty behaviours. This is black-box case design, not a JUnit integration or a proof of correctness.

A result links to its problem version, source files, mode, assistance record and explanation. Incorrect output, invalid test assertions, compiler errors, runtime errors, timeouts, cancellation and infrastructure failures remain distinct. Explanations and design properties are self-reviewed.

Plans use role/format preferences and 7/14/28-day windows. Sessions and round sequences connect to the existing concept library. Transfer recommendations choose an unattempted task in the same competency when one exists and suggest a seven-day revisit; they do not enforce an examination schedule.

## Backend

Local: loopback HTTP + SQLite, existing macOS execution sandbox, two background workers, owner-scoped opaque browser cookie, revisioned persistence. This is a local convenience environment, not a multi-tenant hosted identity boundary.

Hosted: Worker ESM + D1 + Sites-managed identity + membership, bounded queue and E2B microVM adapter. The source hosting configuration is server-backed; the Site remains unpublished until hosted activation. Identity headers must come from trusted Sites dispatch. User IDs are always obtained server-side and every owned query includes them. Invitations are single-use, expire and respect the 30-member cap.

Daily admission, queue limits and monthly capacity reservations are enforced before execution. An unlinked cost ledger survives account deletion so deleting private records cannot reset shared capacity. Provider failures are excluded from correctness conclusions while possible compute cost remains conservatively accounted for. Budgets are estimates rather than invoice reconciliation.

AI model calls, voice/video mocks, paid coaching, employer assessment/proctoring, additional assessed languages and new domain catalogues are outside this release. The AI route fails closed, including if someone accidentally enables its flag. Full live execution and institutional data-residency claims require separate acceptance checks.

## Verification performed

- All 24 actual Java reference implementations compiled with `--release 17` and passed their contract checks through the macOS sandbox. All 24 constant-output negative controls were rejected.
- Automated backend tests exercise independent grading, exact monetary arithmetic, invalid test assertions, input bounds, identities, ownership, invitations, optimistic conflicts, daily/budget limits, infrastructure failures, deletion and the AI gate.
- Browser checks use a fresh headless Chrome profile and real local Java evaluation. They cover public counts, progressive hints, answer concealment, draft recovery, domain/language filtering, multi-file evaluation, preparation plans, private history and responsive 390px layouts.
- The hosted Worker builds. Its service boundaries are tested with SQLite-compatible D1 and fake provider transport; E2B credentials are not available, so live provider and hosted sign-in behaviour are unverified.

Generated screenshots and local test data are ignored. Source synchronisation does not publish the Site.
