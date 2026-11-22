# Subscription workflow and operations

Updated 22 November 2026. The agreed offer is £9.99 GBP/month for unlimited AI interviews and all available learning/coding resources. The site remains local and unpublished.

## Public flow

The homepage directly asks role, domain, language and company. Round, level and optional topic focus are under Interview settings. Text or push-to-talk voice and Gemini data consent are selected before starting. There is no My track, Progress, dashboard or marketing catalogue navigation.

A free preview receives one constrained, one-use Gemini token expiring five minutes after authorization. The server always sets the duration, ignoring a client request for more time. Failed token provisioning or cancellation before token delivery releases the preview claim. An issued preview allocates its five-minute connection; ending it early does not create another free preview. At expiry, the conversation stops and a voluntary subscription action is shown. There is no automatic payment or redirect into a purchase.

Subscriber conversations renew with recent context through new five-minute leases. Current subscription state is checked server-side for each new lease; a client flag grants nothing. There is no personal weekly interview quota. One API conversation is admitted at a time, and reconnection storms are rate-limited. The original £15 conservative allocation now bounds free previews rather than subscriber AI usage. Subscriber model usage is not subject to that artificial cap; provider billing/monitoring must be operated separately. Local identity is a browser cookie, not a public multi-tenant account system. Production access depends on trusted Sites identity.

## Stripe setup

Use test mode while local. Create a Product and active recurring Price with:

- Currency: GBP
- Amount: 999 minor units (£9.99)
- Interval: month, interval count 1
- Quantity: 1

The server retrieves and validates the configured Price before opening Checkout. Client-supplied amounts, currencies, roles or URL parameters cannot change it. Configure `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `BILLING_ENABLED=true` and `PUBLIC_BASE_URL`. Live keys on a loopback URL fail closed. No publishable key is required because payment entry occurs on Stripe's hosted page.

Enable Stripe's customer portal, including subscription cancellation, before enabling checkout. For local webhook delivery use Stripe CLI forwarding to `/api/billing/webhook`; the command's signing secret belongs in the ignored `.env`. For future HTTPS hosting configure a normal public Stripe webhook endpoint instead. Subscribe to `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`. Restart the local service after configuration changes.

The application uses Stripe API version `2026-11-18.endive`. It creates a Customer from explicitly submitted name/email and a subscription-mode Checkout Session using a fixed server Price ID and fixed allowed return origin. Card filtering uses `allowed_payment_method_types`; the older `payment_method_types` creation parameter was removed in Endive and returns HTTP 400 ([official migration notice](https://docs.stripe.com/changelog/endive/2026-09-30/remove-payment-method-types-checkout-sessions)). An HTTP contract test verifies the form encoding against that version. It does not create or accept arbitrary card forms, trial periods, coupons or alternate prices. Stripe's final payment page presents the actual purchase. Configure any additional seller policies and operational requirements in Stripe before public launch; none have been invented by this implementation.

## Verification and ownership

- Every checkout creation and return confirmation requires the current workspace identity. Hosted mutations require trusted Sites identity and a matching workspace header.
- The order links the owner to Stripe Customer and Checkout Session IDs. Fulfillment re-fetches authoritative Stripe state and verifies the owner, order, customer, configured recurring price and subscription status.
- A success URL does not unlock access. Pending verification shows a retry path and suppresses another subscription form. An existing open checkout is reused, rather than starting another paid subscription blindly.
- Webhooks use the exact raw request body, HMAC SHA-256, a five-minute timestamp tolerance, bounded input size and constant-time comparison. Repeated delivery safely updates the same entitlement.
- An active subscription must have a verified future paid-period end. Scheduled cancellation remains active until that boundary. Past-due, cancelled and paused state do not grant new access. Webhooks update state; the status page also reconciles older cached records with Stripe.
- Billing portal sessions are created only for the current owner's Customer and can redirect only to Stripe's billing domain.
- Lesson/question assets and worked-answer APIs are protected independently of frontend visibility, including encoded paths and copied local `/client/` build paths.

## Data and account deletion

The application stores private name/email and provider order identifiers for checkout ownership. Card details remain with Stripe. Browser form values remain transient in memory. Interview context is stored only temporarily in the current tab when starting checkout, with a clear notice; billing contact details are excluded from that context. The context is scoped to workspace, expires after an hour and is cleared when resumed/discarded. Audio is never stored.

Local cookies are HttpOnly, SameSite=Lax and loopback-scoped, allowing a top-level payment return while same-origin JSON and workspace guards protect mutations. The loopback server must never be exposed publicly. Hosted identity remains Sites-managed.

Private export includes only the owner's trial, billing and practice records. Account deletion is blocked while an active subscription would keep renewing. After cancellation, deletion removes billing contact details, anonymizes local provider bookkeeping and preserves only the existing anonymous cost accounting. Stripe retains its own customer/payment data under its applicable terms; the app does not claim to delete Stripe records.

## Checks and launch limits

Automated tests cover exact pricing, recurring consent, ownership, forged returns, signatures, cancellation, replay-safe fulfillment, disabled setup, private resources, five-minute free timing, paid renewal and account switching. The synthetic Gemini transport was checked with a separate local test workspace, preserving the owner's free preview. No Stripe test key or webhook secret is currently present, so live provider checkout, payment confirmation, portal cancellation and webhook delivery have not been verified or claimed.

Before activating real payments, test the complete Stripe test-mode purchase and return, webhook success without a browser return, renewal/payment failure, portal cancellation and recovery from a pending verification state. Source synchronization does not deploy the website or enable billing.

Official references: [Stripe Checkout lifecycle](https://docs.stripe.com/payments/checkout/how-checkout-works?payment-ui=stripe-hosted), [subscription fulfillment](https://docs.stripe.com/checkout/fulfillment?ui=full-page), [subscription object](https://docs.stripe.com/api/subscriptions/object), [webhook delivery/signatures](https://docs.stripe.com/events/manage-webhook-endpoints), [Gemini ephemeral tokens](https://aistudio.google.com/docs/live-api/ephemeral-tokens).
