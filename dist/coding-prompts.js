'use strict';

// These are exercise contracts and expected results, not solution instructions.
function codingPromptSpec(item) {
  const language=item.language, cents=language==='javascript'||language==='typescript';
  const invalid=language==='java'?'IllegalArgumentException':language==='python'?'ValueError':'Error';
  const missing=language==='python'?'None':'null';
  const price=value=>{
    if(!cents)return '"'+value+'"';
    const negative=value.startsWith('-'), unsigned=negative?value.slice(1):value;
    const [whole,fraction='']=unsigned.split('.');
    const amount=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
    return String(negative?-amount:amount)+'n';
  };
  const moneyRule=cents?'Represent prices as bigint cents in one fixed two-decimal currency: 10025n means 100.25. Quantities are safe integers.':'Prices shown as decimal text must be represented with '+(language==='python'?'Decimal':'BigDecimal')+', not binary floating-point values.';
  const duplicate={
    difficulty:'Easy',topics:['Arrays','Maps','Ordering'],
    statement:'Given a list of trade IDs, return every ID that appears more than once. Include each duplicated ID only once, in the order in which its second occurrence appears in the input. Match IDs exactly and leave the original list unchanged.',
    input:'A list of string IDs named tradeIds.',output:'A list of duplicated IDs in second-occurrence order.',
    examples:[
      {input:'tradeIds = ["T1", "T2", "T2", "T3", "T1", "T2"]',output:'["T2", "T1"]',explanation:'T2 reaches its second occurrence before T1. The third T2 does not create another result.'},
      {input:'tradeIds = ["T1", "T2", "T3"]',output:'[]',explanation:'Every ID is unique.'},
      {input:'tradeIds = ["T1", "t1", "t1", "T1"]',output:'["t1", "T1"]',explanation:'Matching is case-sensitive.'}
    ],
    constraints:['0 <= tradeIds.length <= 100,000.','IDs are case-sensitive; nonblank IDs are not trimmed or normalised.','An empty list returns an empty list.','A missing list, missing ID or blank ID must raise '+invalid+'.','Do not modify the input list.'],
    followUp:'Can you explain the time and additional space needed by your solution?'
  };
  const absent={
    difficulty:'Easy',topics:['Arrays','Sets','Reconciliation'],
    statement:'Given expected trade IDs and actual trade IDs, return the expected IDs that are missing from actual. Preserve their order in expected. Extra actual IDs do not belong in the result.',
    input:'Two lists, expected and actual, each containing unique non-null IDs.',output:'The missing IDs, in expected-list order.',
    examples:[
      {input:'expected = ["T1", "T2", "T3", "T4"]\nactual = ["T2", "T4", "T5"]',output:'["T1", "T3"]',explanation:'T1 and T3 are missing. T5 is extra and is ignored.'},
      {input:'expected = ["T3", "T1"]\nactual = []',output:'["T3", "T1"]',explanation:'Every expected ID is missing, and expected order is retained.'},
      {input:'expected = []\nactual = ["T1"]',output:'[]',explanation:'There are no expected IDs to report.'}
    ],
    constraints:['0 <= expected.length, actual.length <= 100,000.','Both lists and all IDs are non-null. IDs are unique within each list.','Match IDs exactly and case-sensitively.','Preserve both input lists.'],followUp:'How would your contract change if expected could contain duplicate IDs?'
  };
  const palindrome={
    difficulty:'Easy',topics:['Strings','Normalisation'],
    statement:'Given a string, return whether it reads the same forwards and backwards after ignoring English-letter case and ordinary spaces. Punctuation and other whitespace characters are outside this exercise’s input contract.',
    input:'A string s, or a missing string.',output:'A boolean indicating whether s is a palindrome under these rules.',
    examples:[
      {input:'s = "Nurses Run"',output:'true',explanation:'Ignoring case and spaces gives "nursesrun", which reads the same in both directions.'},
      {input:'s = "Trading"',output:'false',explanation:'The characters do not match in reverse order.'},
      {input:'s = ""',output:'true',explanation:'The empty string is a palindrome.'}
    ],
    constraints:['0 <= s.length <= 100,000 when s is present.','Present strings contain only A–Z, a–z and ordinary spaces.','A missing string returns false. A string containing only spaces returns true.','Do not change the caller’s input.']
  };
  const specs={
    '01':duplicate,
    '02':{...duplicate,difficulty:'Medium',topics:[language==='java'?'Streams':'Collection pipelines','Grouping','Ordering'],statement:duplicate.statement+' Express the duplicate detection with '+(language==='java'?'Java Streams.':'a collection-processing pipeline appropriate to your language.'),followUp:'Does your solution rely on encounter order, and would parallel execution preserve its behaviour?'},
    '03':{
      difficulty:'Easy',topics:['Validation','Collections','Financial data'],money:true,
      statement:'Validate a trading order and return all validation errors. A symbol is required, quantity must be positive, and price must be present and positive. Report errors in symbol, quantity, price order. Invalid values produce messages rather than exceptions.',
      input:'symbol, integer quantity and '+(cents?'bigint priceCents':'decimal price')+'.',output:'A list of validation messages. A valid order returns an empty list.',
      examples:[
        {input:'symbol = "AAPL", quantity = 10, '+(cents?'priceCents':'price')+' = '+price('100.25'),output:'[]',explanation:'All three fields satisfy their rules.'},
        {input:'symbol = " ", quantity = 0, '+(cents?'priceCents':'price')+' = '+price('-1.00'),output:'["Symbol is required", "Quantity must be positive", "Price must be positive"]',explanation:'All failures are returned in the required order.'},
        {input:'symbol = "MSFT", quantity = 5, '+(cents?'priceCents':'price')+' = '+missing,output:'["Price must be positive"]',explanation:'A missing price is invalid.'}
      ],constraints:['Quantity is an integer; zero and negative values are invalid.','A missing, empty or whitespace-only symbol is invalid.','Use exactly the message strings shown in the examples.','Evaluate all fields even when an earlier field is invalid.']
    },
    '04':{
      difficulty:'Easy',topics:['Maps','Aggregation'],statement:'Given trades containing a symbol and quantity, return the total quantity for each symbol. Trades with the same symbol contribute to one total.',input:'A list of trade records with symbol and integer quantity.',output:'A mapping from symbol to total quantity. Key order is not significant.',
      examples:[
        {input:'trades = [{symbol:"AAPL", quantity:100}, {symbol:"MSFT", quantity:50},\n          {symbol:"AAPL", quantity:200}, {symbol:"MSFT", quantity:25}]',output:'{"AAPL":300, "MSFT":75}',explanation:'AAPL totals 100 + 200, and MSFT totals 50 + 25.'},
        {input:'trades = []',output:'{}',explanation:'No symbols are present.'}
      ],constraints:['0 <= trades.length <= 100,000.','All trades have a valid nonblank symbol and positive integer quantity.','Each final total fits within a signed 32-bit integer.','Preserve the input records and list.']
    },
    '05':{
      difficulty:'Easy',topics:['Arrays','Comparisons'],statement:'Return the original trade object with the highest quantity. When multiple trades share the highest quantity, return the first one encountered. Do not sort the input.',input:'A list of valid trade records with an ID and quantity.',output:'The highest-quantity input object, or '+missing+' when the list is empty.',
      examples:[
        {input:'trades = [{id:"T1", quantity:100}, {id:"T2", quantity:300}, {id:"T3", quantity:200}]',output:'{id:"T2", quantity:300}',explanation:'T2 has the largest quantity.'},
        {input:'trades = [{id:"T1", quantity:300}, {id:"T2", quantity:300}]',output:'{id:"T1", quantity:300}',explanation:'The first object wins the tie.'},
        {input:'trades = []',output:missing,explanation:'There is no trade to return.'}
      ],constraints:['0 <= trades.length <= 100,000.','The list and its records are non-null; quantities are valid integers.','Return an existing input object rather than constructing a replacement.','Do not sort or mutate the list.']
    },
    '06':absent,
    '07':palindrome,
    '08':{...palindrome,topics:['Strings','Two pointers','Space complexity'],statement:palindrome.statement+' Solve this version without allocating a cleaned or reversed copy of the string.',constraints:[...palindrome.constraints,'Use O(1) additional space and O(n) time.']},
    '09':{
      difficulty:'Medium',topics:['Object design','Immutability','Validation'],money:true,
      statement:'Create an immutable Order containing orderId, symbol, quantity and price. Validate all constructor arguments before creating a valid object, expose read access to its fields and provide a notional calculation equal to price multiplied by quantity.',
      input:'Arguments for constructing an Order, followed by a request for its field values or notional.',output:'An immutable order and its exact notional, or a validation exception for invalid construction.',
      examples:[
        {input:'Order(orderId="O1", symbol="AAPL", quantity=10, '+(cents?'priceCents':'price')+'='+price('100.25')+')\nRead the order’s notional.',output:price('1002.50'),explanation:'Ten units at 100.25 produce a notional of 1002.50.'},
        {input:'Order(orderId="O2", symbol="MSFT", quantity=0, '+(cents?'priceCents':'price')+'='+price('50.00')+')',output:'Raise '+invalid+'("Quantity must be positive")',explanation:'An order with zero quantity must not be constructed.'}
      ],constraints:['Identifiers must be present and nonblank. Quantity must be a positive integer.','Price must be present and greater than zero.','The object’s observable fields must not change after construction.','Expose getters/read-only access and a notional operation; do not expose mutation operations.']
    },
    '10':{
      difficulty:'Medium',topics:['Object identity','Equality','Sets'],statement:'Two orders represent the same business order when their orderId values match. Deduplicate a list while retaining the first actual object for each ID and preserving encounter order. Other fields do not establish identity.',input:'A list of valid orders. Fields other than orderId may differ between duplicates.',output:'A list of the retained original objects.',
      examples:[
        {input:'orders = [{orderId:"O1", quantity:10}, {orderId:"O2", quantity:20},\n          {orderId:"O1", quantity:99}]',output:'[{orderId:"O1", quantity:10}, {orderId:"O2", quantity:20}]',explanation:'The later O1 does not replace the first object.'},
        {input:'orders = []',output:'[]',explanation:'No objects are retained.'}
      ],constraints:['0 <= orders.length <= 100,000.','Input orders and their IDs are non-null and valid.','Do not mutate the input objects or list.','In Java, implement a consistent equals/hashCode contract based on orderId. In Python or JS/TS, use the corresponding explicit business-key semantics.']
    },
    '13':{
      difficulty:'Easy',topics:['Maps','Reconciliation'],statement:'Compare expected quantities with actual quantities by trade ID. Return each expected ID that is missing from actual or has a different quantity. Ignore IDs found only in actual.',input:'Two mappings from trade ID to integer quantity.',output:'A set of mismatched IDs. Set-member order does not matter.',
      examples:[
        {input:'expected = {T1:100, T2:200, T3:150}\nactual = {T1:100, T2:250, T4:300}',output:'{T2, T3}',explanation:'T2 has the wrong quantity; T3 is missing. Extra T4 is ignored.'},
        {input:'expected = {T1:0}\nactual = {}',output:'{T1}',explanation:'A missing ID is different from a present ID with quantity zero.'}
      ],constraints:['Inputs, keys and quantities are non-null.','Each mapping contains at most 100,000 entries.','Compare quantities by numeric value. Preserve both inputs.','An empty expected mapping returns an empty set.']
    },
    '14':{
      difficulty:'Medium',topics:['Reconciliation','Exact decimals','Maps'],money:true,
      statement:'Compare a UI trade snapshot with an API snapshot. Return IDs that appear in only one source, or whose price or quantity differs numerically. Different decimal scales alone are not a mismatch.',input:'Two lists of trades containing unique IDs, prices and quantities for the same snapshot.',output:'A set of IDs with missing records or numeric differences; member order does not matter.',
      examples:[
        {input:'ui = [T1(price='+price('100.00')+', quantity=10), T2(price='+price('50.00')+', quantity=20), T4(price='+price('25.00')+', quantity=5)]\napi = [T1(price='+price('100.0')+', quantity=10), T2(price='+price('50.00')+', quantity=25), T3(price='+price('12.00')+', quantity=5)]',output:'{T2, T3, T4}',explanation:'T1 is numerically equal. T2 has a different quantity, and T3/T4 are each missing from one source.'},
        {input:'ui = []\napi = []',output:'{}',explanation:'Two empty snapshots agree.'}
      ],constraints:['IDs are unique within each source. All records and fields are non-null.','The snapshots use the same currency and observation time.','For Java/Python, compare decimal quantities numerically; examples use whole quantities. JS/TS quantities use the declared integer contract.','Preserve both input snapshots.']
    },
    '16':{
      difficulty:'Medium',topics:['Filtering','Grouping','Financial arithmetic'],money:true,
      statement:'Calculate total notional per symbol using only orders whose side is BUY and status is EXECUTED. Each eligible order contributes price × quantity. Other sides and statuses contribute nothing.',input:'A list of trades with symbol, side, status, price and quantity.',output:'A symbol-to-notional mapping. Omit symbols with no eligible trades.',
      examples:[
        {input:'trades = [\n  AAPL BUY EXECUTED price='+price('100.25')+' quantity=10,\n  AAPL BUY EXECUTED price='+price('102.00')+' quantity=5,\n  AAPL SELL EXECUTED price='+price('105.00')+' quantity=20,\n  MSFT BUY EXECUTED price='+price('50.00')+' quantity=20\n]',output:'{"AAPL":'+price('1512.50')+', "MSFT":'+price('1000.00')+'}',explanation:'The AAPL sell is excluded. Eligible AAPL notionals total 1002.50 + 510.00.'},
        {input:'trades = [AAPL BUY PENDING price='+price('100.00')+' quantity=10]',output:'{}',explanation:'No order is both EXECUTED and BUY.'}
      ],constraints:['0 <= trades.length <= 100,000.','Records are valid; prices and integer quantities are positive.','All monetary values refer to one currency.','Preserve input. Key order is not significant.']
    },
    '17':{
      difficulty:'Medium',topics:['Weighted averages','Rounding','Aggregation'],money:true,
      statement:'For every symbol with executed trades, calculate the volume-weighted average execution price: total executed notional divided by total executed quantity. Include both BUY and SELL executions. Return four decimal places using HALF_UP rounding.',input:'A list of valid trades containing symbol, side, status, price and quantity.',output:'A symbol-to-VWAP mapping. '+(cents?'Return the four-decimal price as text.':'Return a decimal value with four decimal places.'),
      examples:[
        {input:'trades = [AAPL BUY EXECUTED price='+price('100.00')+' quantity=10,\n          AAPL SELL EXECUTED price='+price('110.00')+' quantity=30]',output:'{"AAPL":"107.5000"}',explanation:'The total notional is 4300.00 and total quantity is 40.'},
        {input:'trades = [AAPL BUY PENDING price='+price('100.00')+' quantity=10]',output:'{}',explanation:'Symbols with no executions are omitted.'}
      ],constraints:['0 <= trades.length <= 100,000.','Executed quantities are positive integers, so included symbols have nonzero total volume.','Use exact arithmetic and HALF_UP rounding at four decimal places.','Preserve input. Do not treat the unweighted mean of prices as VWAP.']
    },
    '18':{
      difficulty:'Medium',topics:['Ranking','Comparators','Collections'],money:true,
      statement:'Return at most limit executed trades, ordered by notional descending. Break equal-notional ties by trade ID ascending. Preserve the original records and input order outside the returned result.',input:'A trade list and an integer limit.',output:'A list of original trade objects. In examples, IDs identify the returned input objects.',
      examples:[
        {input:'trades = [T1(EXECUTED, price='+price('100.00')+', quantity=10),\n          T2(EXECUTED, price='+price('50.00')+', quantity=20),\n          T3(EXECUTED, price='+price('75.00')+', quantity=20),\n          T4(PENDING, price='+price('200.00')+', quantity=100)]\nlimit = 2',output:'[T3, T1]',explanation:'T3 has notional 1500.00. T1 and T2 tie at 1000.00, so T1 ranks first. Pending T4 is excluded.'},
        {input:'trades = [T1(EXECUTED, price='+price('100.00')+', quantity=10)]\nlimit = 0',output:'[]',explanation:'A zero limit returns no trades.'}
      ],constraints:['0 <= trades.length <= 100,000. IDs are unique and non-null.','Prices and quantities are valid and positive.','Reject a negative limit. A limit greater than the eligible count returns all eligible trades.','Do not sort the caller’s list in place.'],followUp:'How would you retain only the top ten from millions of records?'
    },
    '19':{
      difficulty:'Medium',topics:['Snapshot reconciliation','Maps','Domain models'],money:true,
      statement:'Reconcile complete expected and actual trade snapshots. Report IDs present in only one snapshot or differing in symbol, side, status, numeric price or quantity.',input:'Two complete trade lists representing the same observation time and currency.',output:'A set of differing IDs, regardless of set order.',
      examples:[
        {input:'expected = [T1(AAPL,BUY,EXECUTED,price='+price('100.00')+',quantity=10),\n            T2(MSFT,SELL,PENDING,price='+price('50.00')+',quantity=20)]\nactual = [T1(AAPL,BUY,EXECUTED,price='+price('100.0')+',quantity=10),\n          T2(MSFT,SELL,EXECUTED,price='+price('50.00')+',quantity=20)]',output:'{T2}',explanation:'T1 agrees numerically. T2 has a different status.'},
        {input:'expected = [T1(AAPL,BUY,EXECUTED,price='+price('100.00')+',quantity=10)]\nactual = []',output:'{T1}',explanation:'T1 is missing from actual.'}
      ],constraints:['Each source contains unique, valid, non-null IDs and fields.','Each source contains at most 100,000 records.','Numeric scale alone does not create a price difference.','Preserve both snapshots. Target expected O(n + m) time.'],followUp:'Extend the output to include which fields differ and the expected/actual values.'
    },
    '20':{
      difficulty:'Easy',topics:['Deduplication','Sets','Event processing'],statement:'Remove duplicate execution events by executionId. Retain the first actual record for each execution ID in encounter order. Distinct executions for the same order remain valid separate records.',input:'A list of execution records containing executionId, orderId and quantity.',output:'The retained original execution objects.',
      examples:[
        {input:'events = [E1(order=O1,quantity=10), E2(order=O1,quantity=15), E1(order=O1,quantity=10)]',output:'[E1(order=O1,quantity=10), E2(order=O1,quantity=15)]',explanation:'E1 is repeated; E2 remains even though it belongs to the same order.'},
        {input:'events = [E1(order=O1,quantity=10), E1(order=O1,quantity=99)]',output:'[E1(order=O1,quantity=10)]',explanation:'Under this exercise’s first-record rule, the later conflicting record does not replace E1.'}
      ],constraints:['0 <= events.length <= 100,000.','Records and IDs are valid and non-null; quantities are positive integers.','Do not alter input or retained objects.','Identity is executionId, not orderId.'],followUp:'How would you report conflicting payloads for one execution ID instead of silently keeping the first?'
    },
    '21':{
      difficulty:'Medium',topics:['Ordered collections','Order books','State updates'],statement:'Maintain a single-threaded price-level order book. An update replaces the quantity at its price. A zero quantity removes the level. Return the highest bid and the lowest ask, including their quantities.',input:'A sequence of bid/ask updates with integer priceInTicks and integer quantity.',output:'The best price level on each side; an empty side has no result.',
      examples:[
        {input:'updateBid(10000,10)\nupdateBid(10025,20)\nupdateAsk(10050,15)\nupdateAsk(10075,30)\nbestBid(); bestAsk()',output:'bestBid = {priceInTicks:10025, quantity:20}\nbestAsk = {priceInTicks:10050, quantity:15}',explanation:'The highest bid is 10025; the lowest ask is 10050.'},
        {input:'updateBid(10000,10)\nupdateBid(10025,20)\nupdateBid(10025,0)\nbestBid(); bestAsk()',output:'bestBid = {priceInTicks:10000, quantity:10}\nbestAsk = empty',explanation:'Removing the highest bid exposes the next level; no asks were added.'}
      ],constraints:['Each example starts with an empty book.','Prices use positive integer ticks; quantities must be nonnegative integers.','Reject negative quantities. Do not create zero-quantity levels.','Represent an empty side with Optional.empty() in Java, None in Python or null in JS/TS.','This exercise is single-threaded; explain the costs of updates and best-price queries.']
    },
    '22':{
      difficulty:'Medium',topics:['Concurrency','Atomic updates','Shared state'],statement:'Implement a safe trade counter per symbol. Multiple workers may record trades concurrently. After every worker has finished, each symbol’s count must equal the number of recorded trades without lost updates.',input:'Worker batches containing a symbol and a number of recordTrade calls.',output:'The final count per symbol after all workers complete.',
      examples:[
        {input:'workers = 10\nEach worker records 10,000 trades for "AAPL".\nWait for every worker to finish, then read the count.',output:'{"AAPL":100000}',explanation:'Every one of the 100,000 calls must be counted, independent of scheduling.'},
        {input:'Concurrent batches: AAPL × 3, MSFT × 2, AAPL × 4.\nWait for all batches to finish.',output:'{"AAPL":7, "MSFT":2}',explanation:'Counts are independent by symbol.'}
      ],constraints:['Worker inputs use valid nonblank symbols and nonnegative repetition counts.','Initial counts are zero. Reading an unseen symbol returns zero.','Final totals fit in a signed 64-bit integer; JS/TS samples use safe integer totals.','State the coordination model for your language. A normal JS/TS Map is not shared across workers automatically.','Verify final results after workers complete; intermediate scheduling order is unspecified.']
    },
    '23':{
      difficulty:'Medium',topics:['Concurrency','Versioning','Market data'],money:true,
      statement:'Maintain a thread-safe latest-quote cache by symbol. Accept an incoming quote only when its sequence is strictly greater than the stored sequence. Equal or lower sequences must leave the stored quote unchanged.',input:'Quotes containing symbol, exact price and integer sequence, plus latest(symbol) queries.',output:'The newest accepted quote for the requested symbol, or no result for an unseen symbol.',
      examples:[
        {input:'Concurrent AAPL quotes: (price='+price('100.00')+',sequence=12),\n(price='+price('99.00')+',sequence=10), (price='+price('101.00')+',sequence=13).\nAfter all updates finish, call latest("AAPL").',output:'{symbol:"AAPL", price:'+price('101.00')+', sequence:13}',explanation:'Sequence 13 must be retained regardless of arrival scheduling.'},
        {input:'update(AAPL, price='+price('100.00')+', sequence=10)\nupdate(AAPL, price='+price('102.00')+', sequence=10)\nlatest("AAPL")',output:'{symbol:"AAPL", price:'+price('100.00')+', sequence:10}',explanation:'The equal-sequence update is rejected.'}
      ],constraints:['Quotes have non-null, valid symbols and prices; sequences are positive integers.','Start with an empty cache. Sequence numbers are comparable within each symbol’s feed.','Sequence validation and state replacement must be one coordinated operation.','Unrelated symbols should be able to progress independently.','State how your runtime coordinates threads, workers or asynchronous completions.']
    },
    '24':{
      difficulty:'Medium',topics:['Concurrency','Deadlines','Cancellation'],statement:'Run simulated credit, position and market-risk checks with at most three operations in flight. Use one overall 1,000 ms deadline for the entire batch. Report PASS, FAIL, ERROR or TIMEOUT for every check and request cancellation of unfinished work.',input:'Named checks with simulated durations and outcomes. Durations in the examples use a controlled clock.',output:'A status for each named check. Report order is not significant.',
      examples:[
        {input:'deadline = 1000 ms\ncredit: 100 ms → PASS\nposition: 200 ms → PASS\nmarketRisk: 300 ms → FAIL',output:'{credit:PASS, position:PASS, marketRisk:FAIL}',explanation:'All checks finish within the batch deadline.'},
        {input:'deadline = 1000 ms\ncredit: 100 ms → PASS\nposition: 150 ms → throws an exception\nmarketRisk: 2000 ms → PASS if allowed to finish',output:'{credit:PASS, position:ERROR, marketRisk:TIMEOUT}',explanation:'The exception becomes ERROR. The unfinished risk check reaches the shared deadline.'}
      ],constraints:['There is one batch deadline, not a fresh deadline for every result.','Run at most three checks at once.','Use deterministic timing in tests; exact real-world scheduling is not asserted.','Assume tasks support cooperative cancellation. Cancellation requests may not stop running work immediately.','Release resources you own and handle interruption/cancellation according to your runtime.']
    }
  };
  if(item.id==='coding-duplicate-records')return {...duplicate,statement:duplicate.statement.replaceAll('trade IDs','record IDs'),input:'A list of string IDs named recordIds.',examples:duplicate.examples.map(example=>({...example,input:example.input.replaceAll('tradeIds','recordIds')})),constraints:duplicate.constraints.map(rule=>rule.replaceAll('tradeIds','recordIds'))};
  if(item.id==='coding-missing-records')return {...absent,statement:absent.statement.replaceAll('trade IDs','record IDs')};
  const key=item.id.match(/^2-(\d+)-/)?.[1];
  const spec=specs[key];
  return spec?{...spec,moneyRule:spec.money?moneyRule:null}:null;
}

function detailedCodingQuestion(item) {
  const spec=codingPromptSpec(item);
  if(!spec)return item.question;
  return `<div class="coding-question"><div class="question-topics"><span class="difficulty difficulty-${spec.difficulty.toLowerCase()}">${esc(spec.difficulty)}</span>${spec.topics.map(topic=>`<span class="question-topic">${esc(topic)}</span>`).join('')}</div><p class="problem-statement">${esc(spec.statement)}</p><div class="question-contract"><p><strong>Input</strong> ${esc(spec.input)}</p><p><strong>Return</strong> ${esc(spec.output)}</p></div><p class="example-format-note">Examples describe logical arguments and return values. Use equivalent objects and collections in your selected language; no input parser is required.</p>${spec.moneyRule?`<p class="money-contract">${esc(spec.moneyRule)}</p>`:''}<section class="question-examples" aria-label="Input and output examples">${spec.examples.map((example,n)=>`<article class="question-example"><h3>Example ${n+1}</h3><div class="example-values"><div><strong>Input:</strong><pre>${esc(example.input)}</pre></div><div><strong>Output:</strong><pre>${esc(example.output)}</pre></div></div><p><strong>Explanation:</strong> ${esc(example.explanation)}</p></article>`).join('')}</section><section class="question-constraints"><h3>Constraints</h3><ul>${spec.constraints.map(rule=>`<li>${esc(rule)}</li>`).join('')}</ul></section>${spec.followUp?`<p class="question-follow-up"><strong>Follow-up:</strong> ${esc(spec.followUp)}</p>`:''}</div>`;
}
