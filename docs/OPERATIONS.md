# PrepSpace pilot operations

## What runs now

The local site runs the complete 24-exercise Java catalogue with deterministic evaluation, multi-file editing, recoverable drafts, local SQLite history, issue reports, data export/deletion, opt-in research activity, and preparation plans. The hosted Worker is implemented and builds successfully, but is **not deployed or live-verified**. No vendor account was purchased and no candidates or reviewers were contacted.

The existing Site stays unpublished. Its source manifest now declares the server-backed Worker and DB binding required by the implementation. These declarations are source configuration; uploading them does not provision a production database or activate a cloud runner.

## Local preview

```sh
python3 -B server/local_server.py --port 8796
```

Use http://127.0.0.1:8796. macOS and JDK 17+ are required for the local Java/Python sandbox. `sandbox-exec` must pass its sentinel self-test; the application fails closed. Do not bind this service to a public interface or proxy it to internet visitors. `.runtime/pilot.sqlite3` and browser storage contain private work and must remain untracked.

The local cookie is an opaque browser workspace identifier, not a cloud login. It does not establish multi-user security on the Mac. Production uses Sites identity and server-side membership checks.

## Build and checks

Use Node 24+ (the backend tests use its SQLite module):

```sh
npm ci --cache /private/tmp/prepspace-npm-cache
npm run check
npm run verify:java
npm run build
node tests/browser.mjs
```

The browser test uses a temporary profile of installed macOS Chrome. It never connects to the user's existing profile. The Java verification must be run where macOS permits `sandbox-exec`; do not bypass the app sandbox to make tests pass.

`content/catalogue.py` is the authored source. `scripts/build_catalogue.py` emits server-only `content/catalogue.json` and public contracts in `dist/pilot-catalogue.js`. Answer bodies and private contract cases are excluded from the public pilot catalogue. Legacy study files remain available as before. A changed content digest removes the verified badge until Java verification passes again.

Initial D1 schema: `drizzle/0000_pilot.sql`. It has not been applied to production. Once applied, treat it as immutable and append migrations. `server/schema.sql` provides the equivalent local SQLite bootstrap. Use migration tooling for later upgrades; do not edit an applied schema in place.

## Hosted staging setup

1. Keep the existing Site audience and unpublished state. Provision the `DB` D1 binding and apply the schema in a staging environment. `npm run build` creates `dist/server/index.js`, `dist/client/`, and `dist/.openai/hosting.json`. Static assets must be bound as `ASSETS`. A conventional Cloudflare staging configuration is supplied in `hosted/wrangler.jsonc`; replace its database identifier before use. The source hosting manifest already declares server-backed mode with `d1: "DB"`. Preserve `project_id` and package using the Sites workflow.
2. Build an E2B template from `hosted/Dockerfile` and `hosted/runner.py`, using the provider's template tooling. Pin the resulting template ID. The template must contain JDK 17, Python 3, UID/GID 10001 without sudo, a root-only `/opt/prepspace`, and writable `/work` for the candidate user. Review the base image, provider terms and processing location.
3. Set runtime secrets using Sites environment-variable tools: `E2B_API_KEY`, `E2B_TEMPLATE_ID`, `PILOT_ADMIN_TOKEN` (at least 32 random characters). Keep values out of source, terminal arguments and browser code. Set `PILOT_PROCESSING_REGION` truthfully. No UK/EU residency guarantee is made by the code.
4. Leave `PILOT_EXECUTION_ENABLED=false` until live acceptance checks pass. Public reading and answers can work without execution. All execution admissions require native sign-in plus membership. Set `PILOT_IDENTITY_BOUNDARY=sites` only behind the verified Sites gateway. Without it, identity headers are ignored. Sites supplies `oai-authenticated-user-id`; do not deploy this handler behind a proxy that accepts spoofed identity headers.
5. Run the live E2B reference/negative-control suite in staging. Check network denial, root-private file denial, UID isolation, fork/output/time limits, cancellation during sandbox creation and execution, concurrent requests from two accounts, and Worker lifetime/queue recovery under provider failure. Provider transport is unit-tested with a fake adapter; that is not a substitute for live security verification.
6. Set a vendor-side spending cap as well as app limits. The app reserves capacity before admission and retains an anonymous cost ledger after account deletion. Estimated charges are conservative capacity accounting, not vendor invoices. Verify rates and currency exposure against the £60 execution allocation. Total monthly operating target is £50–150; promotional credits do not count as recurring capacity.
7. Enable execution only after those checks. Begin with a few internal accounts before the 30-person pilot. Revoke the flag to pause new execution immediately; preserve reading, drafts and export. A running sandbox expires within its bounded lifetime.

## Accounts, invitations and limits

Use top-level Sites sign-in links, not a separate OAuth stack. A signed-in visitor must redeem a single-use 64-character invitation. At most 30 members can join. Deleting membership does not make a consumed code reusable.

`POST /api/pilot/admin/invites` requires `Authorization: Bearer <PILOT_ADMIN_TOKEN>` and returns one invitation code. `scripts/pilot-admin.mjs invite <site-url>` reads the token from its environment; it does not send the invitation to anyone. Deliver codes manually through an authorised channel.

Each member gets 20 jobs per UTC day, including sample runs; admission is idempotent on run ID. Global active execution is capped at two, with a bounded queue. Budget exhaustion pauses admission. Configuration may reduce these limits. Keep provider concurrency/spend caps enabled as an independent safeguard.

Cloud drafts and plans use optimistic revisions. A conflict preserves both copies and asks the candidate which to continue. Do not silently overwrite a conflicting source revision.

## Privacy and study operations

Core records support private learning functionality. Optional research activity is off by default, excludes source/explanations and can be withdrawn. Deletion removes the account's private records and events; an unlinked cost ledger remains for capacity accounting. Browser copies are cleared by the UI only after the server confirms deletion. Download/export before deleting if a copy is needed.

Use the research protocol and review register before making claims about effectiveness. The local test database includes QA work; it is not evidence of candidate adoption. Do not publish participant identities, code, employment details or outcomes without specific consent.

Content issue reports are stored for manual review. No email, Slack or automated support message is sent. Make no response-time promise that cannot be met.

## AI release gate

AI feedback is intentionally disabled in both backends, including when `PILOT_AI_ENABLED` is accidentally set. There is no external model call or AI grading in this release. Deterministic feedback links to test observations. `research/ai-benchmark.json` contains 50 original fixture descriptions, all awaiting expert review. A future model integration requires a separate reviewed implementation, grounded feedback evaluation, privacy/provider review and the £15/month cap before activation.

## Expansion and distribution

Complete the 12 candidate and four practitioner interviews, external review of all 24 exercises, and two consenting cohorts before expansion. Start Core Banking only with ten reviewed exercises, an accountable reviewer and adequate capacity. Recruiting messages, paid services and public publication remain separate actions; none were performed by implementation.
