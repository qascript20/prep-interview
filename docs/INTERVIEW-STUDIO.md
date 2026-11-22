# Connected preparation and Interview Studio

Reviewed 22 November 2026. The site remains local and unpublished. Synchronising source does not activate hosted execution or copy the ignored `.env`.

## Candidate experience

The new overview leads to goal onboarding: role, business domain, coding language, company preference, starting point and session length. The dashboard connects the existing five-stage path, relevant learning material, coding availability, all five interview simulations and progress. Available languages are Java, Python, JavaScript and TypeScript. Automated coding assessment remains Java-only. Missing domain-specific coding is labelled rather than replaced silently by another domain. Banking exercises can be chosen explicitly as transferable practice.

The curated sequence and next-step rule work without AI. Optional Gemini priorities are restricted to the supplied, server-validated resource IDs. They are escaped as text, labelled as suggestions, scoped to the profile/workspace and saved in the browser. Company preferences provide context; no verified employer-specific questions or hiring process is claimed.

The readiness evidence score is the floor of 100 × the average of six fractions: the five stage completion fractions and a 0/1 full mock reflection. It is capped at 99 unless all original readiness gates are met. Missing evidence stays in the denominator; unknown history marks the score provisional. Reviews and rehearsals remain self-assessed, while Java coding requires full current-version contract checks and independent tasks require no recorded help. A reviewed current tutorial edition can satisfy a specifically mapped equivalent collection/equality milestone. AI suggestions, quiz answers, a starting-level choice and company names never award points. This is a study coverage indicator, not a validated assessment or pass probability.

## Gemini configuration

Set only on the trusted server, in the ignored project `.env` for local use:

```dotenv
GEMINI_API_KEY=<server credential>
GEMINI_STUDIO_ENABLED=true
GEMINI_LIVE_MODEL=gemini-3.8-live
GEMINI_STUDIO_BUDGET_PENCE=1500
GEMINI_STUDIO_RESERVATION_PENCE=100
GEMINI_STUDIO_WEEKLY_LIMIT=2
```

Restart the local server after changing settings. The local loader reads a fixed whitelist, never evaluates shell text, and preserves already-exported environment values. Hosted deployments require secrets through their own runtime environment and the prepared database migration. No deployment has been performed.

The pinned official `@google/genai` 3.6.1 SDK is bundled locally for the browser. The permanent key is used only on the trusted server. A one-use v1beta ephemeral token locks the model, interviewer prompt, empty tools and Live configuration. New connection window: one minute. Session: five or eight minutes, including a wrap-up period. There is no session resumption. The allowlist also permits the documented legacy `gemini-3.1-flash-live-preview` when deliberately configured. Model metadata listing is not used as an access gate: the Live handshake is the relevant test.

Gemini 3.5 Flash-Lite generates optional structured priorities. The output schema restricts resource IDs; the server also validates uniqueness, types and length limits. SDK retries are bounded to two attempts, with a 12-second request timeout and short delay; the local bridge has a 32-second outer deadline. A failed suggestion leaves the curated track intact. Provider messages and credentials are never sent to candidates as raw diagnostics.

## Text and voice

The same Gemini Live WebSocket accepts typed and spoken answers. Audio output is transcribed; text mode ignores audio playback. Microphone access starts only when the candidate clicks Start speaking. Input is mono 16-bit PCM little-endian at 16 kHz; output is 24 kHz PCM. Push-to-talk uses manual activity start/end, flushing the final chunk before ending the activity. AudioWorklet resampling handles device sample rates across block boundaries. Pending microphone requests, tracks, contexts, playback sources, socket and timers are cleaned up on end/navigation. Hiding the page stops capture. Permission failure keeps text available.

The interviewer asks first, follows up one question at a time and provides a qualitative summary when asked to finish. It cannot execute code or award automated readiness grades. Transcript/audio are not stored by the application server or browser storage. The transcript exists in page memory until navigation and can be downloaded explicitly. A candidate may separately save their own rehearsal reflection in the browser; a real candidate answer is required and the self-review is labelled. Google processes the content; the candidate sees the data notice and consents before connecting. Provider retention/training depends on the Google account’s applicable terms.

## Boundaries and allowances

Local identity is the existing loopback browser workspace. Hosted endpoints require trusted Sites identity, pilot membership and a matching workspace header; mutations reject cross-origin requests. Admission uses a single conditional D1 insert, or a locked SQLite transaction. Two interviews and two optional plans per rolling seven days. Only one active interview per account. Server failures do not become incorrect answers. Cancelling before token delivery prevents the late token from being returned. Never expose the loopback Mac code runner publicly.

The shared AI allocation defaults to £15 per calendar month. Each issued interview reserves at least £1; each planning request reserves 10p, including failed planning requests that may have incurred provider work. Allocation records retain anonymous costs after account deletion; private exports contain only owned records. Reservations are conservative capacity estimates, not provider invoice reconciliation or an enforceable Google billing cap. Operators must configure provider-side limits too.

## Verification

Automated tests cover constrained token creation, validation, identity, membership, origin/workspace checks, ownership, rolling allowance, atomic admission, cancellation before admission and during minting, ending failed requests without losing allowance, provider failures, shared planning/interview allocation, anonymous cost retention, structured plan validation, PCM sample count/endianness and microphone cleanup when permission resolves late or context construction fails. Workflow tests cover score boundaries, company context and current tutorial editions.

A real browser session using the configured key received a first Test Director / QA Lead question, accepted a synthetic typed answer, received a relevant follow-up and received a qualitative practice summary. An early 20-second wrap-up limit cut off the final provider completion marker; it was extended to 40 seconds and automatic wrap-up now starts 45 seconds before token expiry. A separate real planning request returned three validated priorities after earlier Gemini 503 responses; the final browser flow then displayed four resource-linked recommendations for the selected Test Director / QA Lead track. Those synthetic checks are not evidence of candidate performance. Hardware microphone/speaker behaviour and hosted identity/provider paths still need hands-on live verification.

Official references: [Live API](https://aistudio.google.com/docs/live-api), [ephemeral tokens](https://aistudio.google.com/docs/live-api/ephemeral-tokens), [Live API reference](https://aistudio.google.com/api-reference/live), [3.5 Flash-Lite](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite), [structured output](https://aistudio.google.com/docs/structured-output), [Google API data terms](https://ai.google.dev/gemini-api/terms).

Final local verification: 95 Node tests and 18 Python tests passed; client/Worker build passed. Desktop and 390px mobile onboarding, track and Studio layouts were checked.
