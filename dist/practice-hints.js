'use strict';
const codingHints = {
  '2-01-find-duplicate-trade-ids-in-second-occurrence-order': [
    'Trace the input from left to right. Which occurrence determines an ID’s place in the result?',
    'What information would help you distinguish an ID seen once from one already reported?',
    'Check an ID that occurs three times. How can you keep it from being reported twice?'
  ],
  '2-02-duplicate-ids-using-streams': [
    'Clarify which ordering the result must preserve before choosing a stream pipeline.',
    'A frequency count can identify duplicates, but does it also capture when the second occurrence happened?',
    'Think about whether a stateful stream operation would still be correct if somebody made it parallel.'
  ],
  '2-03-validate-a-trading-order-and-return-all-errors': [
    'List the independent rules for the symbol, quantity and price.',
    'Should a failure in one field prevent the remaining fields from being checked?',
    'Check for a missing price before comparing it, and use exact decimal comparison for money.'
  ],
  '2-04-calculate-total-trade-quantity-by-symbol': [
    'Which value identifies the group that each trade belongs to?',
    'Think about the starting quantity for a symbol you have not encountered yet.',
    'Trace two trades with the same symbol and one with a different symbol. Check for overflow in large totals.'
  ],
  '2-05-find-the-trade-with-the-highest-quantity': [
    'What information must you keep while comparing successive trades?',
    'Decide what an empty input and equal quantities should produce.',
    'Could you find the best candidate without sorting the entire input?'
  ],
  '2-06-find-trades-missing-from-actual-results': [
    'Start with the expected IDs: which of them have no matching actual ID?',
    'Choose a structure that makes repeated membership checks efficient.',
    'Preserve the required order and check that neither input list changes.'
  ],
  '2-07-check-a-palindrome-after-cleaning-the-string': [
    'Clarify whether case, spaces and punctuation matter.',
    'Separate the normalisation rule from the symmetry check.',
    'Try empty input, a single character and a mismatch near the middle.'
  ],
  '2-08-check-a-palindrome-with-constant-extra-space': [
    'Try comparing characters at opposite ends without creating a cleaned copy.',
    'How should each position move when it points to punctuation?',
    'Define the character and case rules, then check when the two positions meet or cross.'
  ],
  '2-09-create-an-immutable-order-with-validation-and-notional': [
    'Which fields must be valid before an order can exist?',
    'Think about visibility, reassignment and whether referenced values can change.',
    'Use exact decimal multiplication for notional and confirm the quantity is converted appropriately.'
  ],
  '2-10-deduplicate-orders-using-equals-and-hashcode': [
    'Define which fields establish the business identity of an order.',
    'Which two object methods must agree for a hash-based collection to recognise duplicates?',
    'Consider ordering and the consequences of changing an identity field after insertion.'
  ],
  '2-13-quantity-mismatches-between-maps': [
    'Separate a missing key from a present key whose quantity differs.',
    'Decide whether you need to consider keys from one snapshot or both.',
    'Test extra keys, missing keys, equal quantities and a legitimate zero quantity.'
  ],
  '2-14-reconcile-prices-and-quantities-between-ui-and-api-objects': [
    'Identify the stable key that links a UI record to an API record.',
    'Decide how to report missing records separately from field mismatches.',
    'Compare prices numerically rather than relying on their displayed decimal scale.'
  ],
  '2-16-calculate-executed-buy-notional-by-symbol': [
    'Which two conditions must an order satisfy to contribute to the total?',
    'Identify the per-order calculation and the grouping key.',
    'Keep financial arithmetic exact and test a symbol with multiple eligible orders.'
  ],
  '2-17-calculate-volume-weighted-average-execution-price': [
    'A large execution should influence the average more than a small one.',
    'What two totals would let you account for execution sizes?',
    'Define the zero-volume case, rounding policy and eligibility rules before dividing.'
  ],
  '2-18-find-the-largest-executed-trades': [
    'Filter for eligible executions before ranking candidates.',
    'Clarify what “largest” means and how ties should be ordered.',
    'Compare a full sort with retaining only the best candidates when the requested count is small.'
  ],
  '2-19-reconcile-two-complete-trade-snapshots': [
    'Identify the record key and the fields that must be compared.',
    'Separate missing records, unexpected records and changed records.',
    'Decide how duplicate IDs and numeric price equality should be handled.'
  ],
  '2-20-deduplicate-execution-events': [
    'Distinguish the identity of an execution event from that of its parent order.',
    'Think about retries arriving at the same time. Is checking then recording an event one atomic action?',
    'Consider conflicting payloads for the same event ID and how long deduplication state must be retained.'
  ],
  '2-21-maintain-best-bid-and-ask': [
    'Clarify which direction is best on each side of the order book.',
    'Choose a structure that supports ordered prices and updates to an existing level.',
    'Check removal of the best level, an empty book and zero-quantity updates.'
  ],
  '2-22-fix-a-concurrent-trade-counter': [
    'An increment involves reading, changing and writing a value. Can those steps overlap?',
    'A thread-safe container does not automatically make a multi-step update atomic.',
    'Decide whether the caller needs an exact snapshot and make the check wait for every worker to finish.'
  ],
  '2-23-prevent-stale-market-data-updates': [
    'Use the feed’s ordering contract to decide whether an incoming update is newer.',
    'Could another update arrive between checking the current version and replacing it?',
    'Define how equal versions and out-of-order arrivals are handled for each instrument.'
  ],
  '2-24-run-trading-risk-checks-concurrently': [
    'Identify which checks are independent and which results the decision needs.',
    'Set a limit on workers and define a deadline for the combined decision.',
    'Decide what failure or timeout means, then consider cancellation and executor cleanup.'
  ],
  'coding-duplicate-records': [
    'Trace the second occurrence of each ID to understand the required output order.',
    'What state would distinguish a newly repeated ID from an ID already included?',
    'Try three occurrences of one ID and check that the input is preserved.'
  ],
  'coding-missing-records': [
    'Clarify the direction of the comparison: expected records missing from actual records.',
    'Choose a structure for quick lookups while preserving the required result order.',
    'Test an empty actual list, an unexpected actual ID and duplicate expected IDs.'
  ]
};

function hintsFor(item) {
  return codingHints[item.id] || ['Clarify the input, output and invalid-input rules.', 'Work through a small example and choose the state you need to track.', 'Check boundary cases, ordering and time/space complexity.'];
}

function practiceHints(item) {
  const hints = hintsFor(item);
  return `<section class="practice-hints" aria-label="Coding hints" data-hints="${esc(item.id)}"><div class="hint-heading"><h3>Need a hint?</h3><span data-hint-progress aria-live="polite">1 of ${hints.length}</span></div><p>Try your approach first. Reveal another hint when you need a nudge.</p><ol data-hint-list><li>${esc(hints[0])}</li></ol><button class="button small" data-next-hint="${esc(item.id)}">Next hint</button></section>`;
}

function practiceAnswer(item) {
  if (!item.solved) return '<p class="domain-note">This is an independent practice problem. Use the hints and self-checks to review your approach.</p>';
  return `<section class="practice-answer"><p>Ready to compare your approach?</p><button class="button" data-show-answer="${esc(item.id)}" aria-expanded="false" aria-controls="practice-answer-content">Show answer</button><div id="practice-answer-content" data-answer-content hidden></div></section>`;
}

document.addEventListener('click', event => {
  const next = event.target.closest('[data-next-hint]');
  if (next) {
    const item = data.find(i => i.id === next.dataset.nextHint);
    if (!item) return;
    const card = next.closest('[data-hints]'), list = card.querySelector('[data-hint-list]'), hints = hintsFor(item);
    if (list.children.length < hints.length) {
      const li = document.createElement('li');
      li.textContent = hints[list.children.length];
      list.append(li);
    }
    card.querySelector('[data-hint-progress]').textContent = `${list.children.length} of ${hints.length}`;
    if (list.children.length === hints.length) { next.disabled = true; next.textContent = 'All hints shown'; }
  }
  const button = event.target.closest('[data-show-answer]');
  if (!button) return;
  const item = data.find(i => i.id === button.dataset.showAnswer);
  if (!item?.solved) return;
  const content = document.getElementById(button.getAttribute('aria-controls'));
  const show = button.getAttribute('aria-expanded') !== 'true';
  if (show) content.innerHTML = `<div class="answer-content reading-body"><h3>Answer & detailed explanation</h3>${item.code?'<button class="button small" id="load-solution">Load worked solution into editor</button>':''}${item.answer}</div>`;
  else content.replaceChildren();
  content.hidden = !show;
  button.setAttribute('aria-expanded', String(show));
  button.textContent = show ? 'Hide answer' : 'Show answer';
});
