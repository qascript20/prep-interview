# PrepSpace — AI interview practice

A simple interview workflow starts on the homepage at http://127.0.0.1:8796:

1. Choose a role, business domain, programming language and target company.
2. Practise with a Gemini interviewer by text or push-to-talk voice.
3. After the five-minute free preview, choose whether to subscribe and continue.

Nova is the named AI interviewer, with a bundled photorealistic AI portrait on setup and conversation screens. Both its label and interviewer instructions identify it as AI. The portrait is served locally without an external image request.

Interview setup offers 35 IT roles grouped into software engineering, architecture/leadership, quality engineering, data/AI, cloud/operations, cybersecurity, and product/design/delivery. Its 18 business domains describe industries such as banking, insurance, healthcare, retail, telecoms, manufacturing and public services. Technical specialisms are represented by roles. Each choice supplies relevant context to the AI interviewer; the separate learning/coding catalogue retains its stated content coverage. Older Ecommerce, AI, Cloud and Data Engineering domain selections are mapped to the matching current business sector.

My track, Progress, roadmaps and broad catalogue navigation are removed from the public interface. Previous study data and code drafts are preserved. Old dashboard routes return to the interview homepage.

## Subscription

**PrepSpace Unlimited: £9.99 GBP per month**, renewing until cancelled. Stripe hosted Checkout collects payment details. The application collects name, email and explicit agreement to monthly renewal; it never accepts card numbers or CVC.

A verified active subscription unlocks unlimited AI interview practice and the learning/coding library. AI connections renew in five-minute segments using recent context, without a per-user weekly quota. One conversation is admitted at a time; rapid reconnection attempts and shared execution capacity remain bounded. Free preview allocation is one five-minute connection per authenticated account (one browser workspace on the local preview); changing the browser timer or requesting longer input cannot extend the server-issued token.

`/library.html` and its lesson/question payloads require an active subscription on the server. The library contains the existing 23 Java data-structures lessons, 24 assessed Java exercises and existing manual practice in the other languages. Content coverage varies by domain/language and is labelled. No My track or Progress navigation is added to the subscriber library.

Stripe returns and signed webhooks verify the customer, order, configured recurring price, payment and subscription status. A success URL alone grants nothing. Repeated fulfillment is idempotent. Pending verification suppresses another subscription form, and an open checkout is reused to reduce duplicate subscriptions. Cancellation at period end keeps access through the paid period; cancelled, paused or overdue subscriptions lose access when verified. Subscription management uses Stripe's billing portal.

## Local setup

```sh
npm ci --cache /private/tmp/prepspace-npm-cache
npm run build
python3 -B server/local_server.py --port 8796
```

Set server configuration only in the ignored project `.env`:

```dotenv
GEMINI_API_KEY=<server key>
GEMINI_STUDIO_ENABLED=true
GEMINI_LIVE_MODEL=gemini-3.8-live
STRIPE_SECRET_KEY=<Stripe test secret key>
STRIPE_PRICE_ID=<active GBP 9.99 monthly recurring Price ID>
STRIPE_WEBHOOK_SECRET=<Stripe signing secret>
BILLING_ENABLED=true
PUBLIC_BASE_URL=http://127.0.0.1:8796
```

Create the recurring Price and enable Stripe's customer portal in the Stripe Dashboard. For local test webhook delivery, run `stripe listen --forward-to http://127.0.0.1:8796/api/billing/webhook` and use its signing secret. Restart PrepSpace after configuration changes. Live Stripe keys are deliberately disabled for loopback previews. A future live deployment needs its own HTTPS base URL, runtime secrets, database migrations and working webhook endpoint.

**Stripe is not yet configured in the local environment, so checkout is currently disabled and no payment has been taken.** The source and hosted Worker are prepared, not published or deployed. Never expose the loopback Mac code runner publicly.

## Privacy and verification

The permanent Gemini and Stripe keys remain server-side. Gemini receives answers/audio only after consent. Audio is never recorded by the application. Transcript remains in page memory; when going to checkout, recent context can be kept temporarily in tab-scoped session storage for up to one hour, with an explicit notice, to resume after returning from Stripe. It is cleared on resume/discard. Name/email are private billing records and are not sent to Gemini. Private exports are owner-scoped; active subscriptions must be cancelled before account deletion can remove billing contact details.

```sh
npm run check
npm run build
```

Tests cover payment ownership, exact price, signed webhooks, cancellation, repeat fulfillment, private resource access, free-session timing, paid reconnection, account switching and compiler boundaries. A real synthetic Gemini check received a question and turn-complete event through the new five-minute lease. Live Stripe checkout, webhook delivery and the customer portal await test credentials; no simulated result is presented as a real payment. Hardware microphone/speaker and hosted identity still require hands-on verification.

See [subscription operations](docs/SUBSCRIPTIONS.md). Earlier learning/progress design documents are historical; they do not describe the current public navigation. CodeMirror/TypeScript and SDK licenses remain bundled.
