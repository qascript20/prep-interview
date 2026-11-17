"""Original banking exercises. Oracle outputs are checked outside candidate execution."""
import textwrap

IMPORTS = '''import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.math.*;
import java.nio.charset.StandardCharsets;
'''
HELPERS = '''    static String[] rows(String input) { return input.isEmpty() || input.equals("-") ? new String[0] : input.split("\\\\R", -1); }
    static List<String> ids(String input) {
        if (input.equals("~")) throw new IllegalArgumentException();
        if (input.equals("-") || input.isEmpty()) return new ArrayList<>();
        List<String> result = new ArrayList<>(Arrays.asList(input.split(",", -1)));
        if (result.stream().anyMatch(s -> s.isBlank() || s.equals("~"))) throw new IllegalArgumentException();
        return result;
    }
    static String list(Collection<?> values) { return values.isEmpty() ? "-" : String.join(",", values.stream().map(Object::toString).toList()); }
    static String map(Map<String,?> values) { return list(values.entrySet().stream().map(e -> e.getKey()+"="+e.getValue()).toList()); }
    static BigDecimal decimal(String value) { if (value.equals("~")) throw new IllegalArgumentException(); return new BigDecimal(value); }
    static String money(BigDecimal value) { return value.setScale(2, RoundingMode.HALF_UP).toPlainString(); }
'''.replace('\\\\R', '\\R')

def program(body, extra=''):
    return IMPORTS+'\npublic class Main {\n'+HELPERS+textwrap.indent(textwrap.dedent(extra).strip(), '    ')+'\n    static String solve(String input) throws Exception {\n'+textwrap.indent(textwrap.dedent(body).strip(), '        ')+'''\n    }
    public static void main(String[] args) throws Exception {
        String input = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);
        try { System.out.print(solve(input)); }
        catch (IllegalArgumentException | ArithmeticException error) { System.out.print("ERROR"); }
    }
}
'''

def testcase(name, input, expected, category='normal', sample=False):
    return dict(name=name, input=input, expected=expected, category=category, sample=sample)

P=[]
def add(id, title, competency, description, contract, cases, body, explanation, *, extra='', difficulty='Medium', format='implementation', starter=None, roles=None, followup=None, hints=None):
    solution={'Main.java':program(body, extra)}
    files=starter or {'Main.java':program('throw new UnsupportedOperationException("Implement the documented contract.");',extra)}
    p=dict(id=id,version='2.0.0',title=title,competency=competency,domain='Investment Banking',language='java',runtime='Java 17',format=format,difficulty=difficulty,
           roles=roles or ['backend','sdet'],description=description,contract=contract,
           constraints=['Use Java 17 and the standard library. Do not add a package declaration.', 'For this terminal interface, identifiers contain no commas, pipes, equals signs or line breaks. Match identifiers exactly and case-sensitively.', 'Use the supplied Main entry point. Print only the required result; diagnostics belong on standard error.', 'Inputs contain at most 10,000 records unless a narrower limit is stated. Output must be at most 64 KiB.'],
           examples=[c for c in cases if c.get('sample')],starter=files,solution=solution,tests=cases,
           hints=hints or ['Trace the smallest example and identify the state that must survive between records.', 'Choose a collection or arithmetic operation that preserves the documented ordering and precision.', 'Check the boundary cases in the contract before considering optimisation.'],
           followup=followup or 'Explain your tests, time and space complexity, and one change needed for a production banking service.',
           explanation=explanation,transferGroup=competency,estimatedMinutes=40 if format=='project' else 25)
    P.append(p); return p

DUP='2-01-find-duplicate-trade-ids-in-second-occurrence-order'
add(DUP,'Find duplicate trade IDs in second-occurrence order','collections',
    'A trade feed may repeat a record. Return each duplicated ID once, ordered by when its second occurrence arrives.',
    'Input: one comma-separated list. A dash (-) means an empty list; ~ means a null list or ID. Output: comma-separated duplicates, or -. Reject a null list, null ID or blank ID with ERROR. Do not trim or normalise valid IDs.',
    [testcase('Second occurrence order','T1,T2,T2,T3,T1,T2','T2,T1',sample=True),testcase('Empty feed','-','-','boundary',True),testcase('Exact matching','T1,t1,t1,T1','t1,T1','ordering'),testcase('Third retry','A,A,A,A','A','boundary'),testcase('No duplicates','A,B,C','-'),testcase('Null list','~','ERROR','validation'),testcase('Blank ID','A, ,A','ERROR','validation'),testcase('Null ID','A,~','ERROR','validation')],
    '''Map<String,Integer> counts = new HashMap<>();
    List<String> result = new ArrayList<>();
    for (String id : ids(input)) {
        int count = counts.merge(id, 1, Integer::sum);
        if (count == 2) result.add(id);
    }
    return list(result);''',
    ['Validate IDs before recording them so incomplete records cannot become map keys.', 'The map stores the number of times an ID has appeared. Append an ID only when its new count is exactly two; later retries do not append it again.', 'Walking the feed in encounter order makes the second occurrence determine the output position. For n IDs and u distinct IDs, expected time is O(n) and additional storage is O(u).', 'A production feed needs a retention window and a policy for conflicting payloads, which this ID-only exercise deliberately leaves to the follow-up.'], difficulty='Easy')

VALID='2-03-validate-a-trading-order-and-return-all-errors'
validation_body='''String[] fields = input.split("\\\\|", -1);
String symbol = fields[0]; long quantity = Long.parseLong(fields[1]);
BigDecimal price = fields[2].equals("~") ? null : new BigDecimal(fields[2]);
List<String> errors = new ArrayList<>();
if (symbol.equals("~") || symbol.isBlank()) errors.add("Symbol is required");
if (quantity <= 0) errors.add("Quantity must be positive");
if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) errors.add("Price must be positive");
return errors.isEmpty() ? "OK" : String.join(";", errors);'''.replace('\\\\|','\\|')
add(VALID,'Validate an order and report every error','validation',
    'Validate an order without stopping at the first invalid field. Return messages in symbol, quantity, price order.',
    'Input: symbol|quantity|price. ~ means a missing symbol or price. Quantity is a signed long; present prices are valid decimal text. Output: OK, or semicolon-separated messages exactly as shown. A symbol containing only whitespace is invalid. Quantity and price must both be strictly positive.',
    [testcase('Valid order','AAPL|10|100.25','OK',sample=True),testcase('All errors',' |0|-1','Symbol is required;Quantity must be positive;Price must be positive','validation',True),testcase('Missing symbol','~|1|1','Symbol is required','validation'),testcase('Missing price','MSFT|1|~','Price must be positive','validation'),testcase('Negative quantity','IBM|-1|2','Quantity must be positive','validation'),testcase('Zero price','IBM|1|0.00','Price must be positive','validation'),testcase('Fractional price','IBM|1|0.001','OK','precision')], validation_body,
    ['Parse the terminal representation into domain values. Keep a missing price as null rather than constructing BigDecimal from ~.', 'Evaluate each independent rule and append messages to a list in the specified order. Independent if statements ensure that one error does not hide another.', 'The null check short-circuits the decimal comparison. compareTo checks numeric value, so both 0 and 0.00 are rejected.', 'The number of fields is fixed, so work and additional storage are O(1), apart from the length of the input text.'])

add('2-04-calculate-total-trade-quantity-by-symbol','Aggregate trade quantities safely','aggregation',
    'Calculate total traded quantity per symbol. Large quantities must not wrap into negative totals.',
    'Input: symbol,quantity records on separate lines; - means no records. Symbols are nonblank and quantities are nonnegative signed longs. Output: symbol=total pairs in alphabetical symbol order, comma-separated; - for empty. Print ERROR for negative quantities, blank symbols, or a total exceeding Long.MAX_VALUE.',
    [testcase('Repeated symbols','AAPL,100\nMSFT,50\nAAPL,200','AAPL=300,MSFT=50',sample=True),testcase('Empty','-','-','boundary',True),testcase('Long total','X,2147483647\nX,1','X=2147483648','overflow'),testcase('Overflow','X,9223372036854775807\nX,1','ERROR','overflow'),testcase('Zero','X,0','X=0','boundary'),testcase('Negative','X,-1','ERROR','validation')],
    '''Map<String,Long> totals = new TreeMap<>();
    for (String row : rows(input)) {
        String[] f = row.split(",", -1); long quantity = Long.parseLong(f[1]);
        if (f[0].isBlank() || quantity < 0) throw new IllegalArgumentException();
        totals.put(f[0], Math.addExact(totals.getOrDefault(f[0], 0L), quantity));
    }
    return map(totals);''',
    ['A map connects each symbol to its running total; getOrDefault supplies zero for the first trade.', 'Use long for the quantity and Math.addExact for accumulation. A long type alone does not prevent overflow.', 'TreeMap supplies alphabetical output directly. For n records and u symbols, work is O(n log u) and storage is O(u).', 'Zero is a valid contribution under this contract. Negative quantities and overflow are rejected rather than silently changing the financial result.'])

add('2-06-find-trades-missing-from-actual-results','Reconcile missing trades without changing inputs','reconciliation',
    'Find IDs in the expected snapshot that have no matching actual record. Extra actual IDs are ignored.',
    'Input: expected comma-separated IDs on line 1, actual IDs on line 2. Each list contains unique, nonblank IDs. - represents an empty list. Output: missing IDs in expected order, comma-separated, or -. Do not change either input list.',
    [testcase('Missing and extra','T1,T2,T3,T4\nT2,T4,T5','T1,T3',sample=True),testcase('Empty actual','Z,A\n-','Z,A','boundary',True),testcase('Empty expected','-\nX','-','boundary'),testcase('Exact case','a,A\nA','a','ordering'),testcase('Complete','A,B\nB,A','-')],
    '''String[] f = input.split("\\\\R", -1);
    List<String> expected = ids(f[0]); Set<String> actual = new HashSet<>(ids(f[1]));
    List<String> missing = new ArrayList<>();
    for (String id : expected) if (!actual.contains(id)) missing.add(id);
    return list(missing);'''.replace('\\\\R','\\R'),
    ['Build a membership set from actual IDs once, then traverse expected IDs in their original order.', 'Append to a new result list instead of removing from expected. This also works when the input list has a fixed size or is unmodifiable.', 'Expected work is O(n+m) for the two lists, with O(m) membership storage plus the result.', 'A missing-only comparison does not detect unexpected records or field mismatches; the full-snapshot exercise extends this contract.'], difficulty='Easy')

order_extra='''static final class Order {
    private final String id;
    private final String symbol;
    private final long quantity;
    private final BigDecimal price;
    Order(String id, String symbol, long quantity, BigDecimal price) {
        if (id == null || id.isBlank() || symbol == null || symbol.isBlank() || quantity <= 0 || price == null || price.signum() <= 0) throw new IllegalArgumentException();
        this.id=id; this.symbol=symbol; this.quantity=quantity; this.price=price;
    }
    BigDecimal notional() { return price.multiply(BigDecimal.valueOf(quantity)); }
}'''
order_starter=program('''String[] f = input.split("\\\\|", -1);
Order order = new Order(f[0], f[1], Long.parseLong(f[2]), f[3].equals("~") ? null : new BigDecimal(f[3]));
return money(order.notional());'''.replace('\\\\|','\\|'),'''static final class Order {
    // Add private final fields and validate the constructor.
    Order(String id, String symbol, long quantity, BigDecimal price) { }
    BigDecimal notional() { throw new UnsupportedOperationException("Implement notional"); }
}''')
add('2-09-create-an-immutable-order-with-validation-and-notional','Model an immutable financial order','validation',
    'Complete the immutable Order type and calculate its notional. Validate state at construction time.',
    'Input: id|symbol|quantity|price. ID and symbol must be nonblank; quantity and price strictly positive; ~ is a missing price. Output: quantity × price rounded once to two decimals with HALF_UP, or ERROR. The object must have private final state and no setters; automated checks cover constructor behaviour and notional, while immutability design is a self-review item.',
    [testcase('Notional','O1|AAPL|10|100.25','1002.50',sample=True),testcase('Invalid quantity','O1|AAPL|0|2','ERROR','validation',True),testcase('Blank ID',' |X|1|2','ERROR','validation'),testcase('Blank symbol','O| |1|2','ERROR','validation'),testcase('Null price','O|X|1|~','ERROR','validation'),testcase('Rounding','O|X|3|0.335','1.01','precision')],
    '''String[] f = input.split("\\\\|", -1);
    return money(new Order(f[0], f[1], Long.parseLong(f[2]), f[3].equals("~") ? null : new BigDecimal(f[3])).notional());'''.replace('\\\\|','\\|'),
    ['Validate every invariant before storing constructor arguments. An invalid order should never become observable.', 'Private final fields prevent direct access and reassignment. String and BigDecimal are immutable, so these references do not expose mutable internal state.', 'Multiply with BigDecimal.valueOf(quantity), then round the final result for the terminal output. BigDecimal arithmetic returns a new value.', 'The output tests cannot prove every design property. Inspect field visibility, finality and the absence of setters during the explanation review.'],extra=order_extra,starter={'Main.java':order_starter})

add('2-10-deduplicate-orders-using-equals-and-hashcode','Deduplicate orders using business identity','collections',
    'Order identity is its ID, regardless of symbol changes. Keep the first record for each ID in encounter order.',
    'Input: id,symbol records on separate lines, or -. All fields are nonblank. Output: id:symbol pairs in first-occurrence order. Implement equals and hashCode consistently on the immutable ID and use a hash-based collection.',
    [testcase('Keep first','O1,AAPL\nO2,MSFT\nO1,GOOG','O1:AAPL,O2:MSFT',sample=True),testcase('Empty','-','-','boundary',True),testcase('Case sensitive','o,X\nO,Y','o:X,O:Y','ordering'),testcase('Repeated','A,X\nA,X\nA,Y','A:X','boundary')],
    '''Set<Order> orders = new LinkedHashSet<>();
    for (String row : rows(input)) { String[] f=row.split(",",-1); orders.add(new Order(f[0],f[1])); }
    return list(orders.stream().map(o -> o.id+":"+o.symbol).toList());''',
    ['Define equality from the stable business identity before selecting a collection.', 'equals and hashCode must use the same ID field. Otherwise HashSet or LinkedHashSet may put equal orders in different buckets.', 'LinkedHashSet retains insertion order and keeps the first object when a later equal object is added.', 'Expected work is O(n), storage O(u). Functional checks validate output; explain why immutable identity prevents broken membership after insertion.'],
    extra='''static final class Order {
    final String id, symbol;
    Order(String id, String symbol) { this.id=id; this.symbol=symbol; }
    public boolean equals(Object other) { return other instanceof Order o && id.equals(o.id); }
    public int hashCode() { return id.hashCode(); }
}''',starter={'Main.java':program('''Set<Order> orders = new LinkedHashSet<>();
for (String row : rows(input)) { String[] f=row.split(",",-1); orders.add(new Order(f[0],f[1])); }
return list(orders.stream().map(o -> o.id+":"+o.symbol).toList());''','''static final class Order {
    final String id, symbol;
    Order(String id, String symbol) { this.id=id; this.symbol=symbol; }
    // Implement equals and hashCode using business identity.
}''')})

add('2-16-calculate-executed-buy-notional-by-symbol','Aggregate executed BUY notional by symbol','financial-precision',
    'Create a summary of executed BUY orders. SELL and nonexecuted orders must not contribute.',
    'Input: symbol,side,status,quantity,price records, or -. Side is BUY/SELL; status EXECUTED/PENDING/CANCELLED; quantities and prices are positive. Output: alphabetical symbol=notional pairs. Sum exact quantity × price products before rounding each symbol total to two decimals HALF_UP. A symbol with no eligible orders is omitted.',
    [testcase('Filter both conditions','AAPL,BUY,EXECUTED,10,100.25\nAAPL,SELL,EXECUTED,5,99\nMSFT,BUY,PENDING,8,20\nAAPL,BUY,EXECUTED,2,100','AAPL=1202.50',sample=True),testcase('No eligible trades','X,SELL,EXECUTED,1,2','-','boundary',True),testcase('Sum before rounding','X,BUY,EXECUTED,1,0.335\nX,BUY,EXECUTED,1,0.335','X=0.67','precision'),testcase('Alphabetical','Z,BUY,EXECUTED,1,2\nA,BUY,EXECUTED,3,1.1','A=3.30,Z=2.00','ordering'),testcase('Empty','-','-','boundary')],
    '''Map<String,BigDecimal> totals = new TreeMap<>();
    for (String row : rows(input)) {
        String[] f=row.split(",");
        if (f[1].equals("BUY") && f[2].equals("EXECUTED")) {
            BigDecimal notional=new BigDecimal(f[4]).multiply(new BigDecimal(f[3]));
            totals.merge(f[0], notional, BigDecimal::add);
        }
    }
    return list(totals.entrySet().stream().map(e -> e.getKey()+"="+money(e.getValue())).toList());''',
    ['Filter by both side and execution status. Checking only one condition includes ineligible orders.', 'Construct decimals from input strings and multiply before aggregating. No binary floating-point conversion is needed.', 'Merge each exact contribution into its symbol total and apply rounding only when formatting the result. Rounding each trade first changes some totals.', 'TreeMap provides deterministic output. Work is O(n log u), storage O(u). A stream solution can use filtering and grouping, provided it preserves these arithmetic rules.'])

add('2-17-calculate-volume-weighted-average-execution-price','Calculate a volume-weighted execution price','financial-precision',
    'Calculate the average execution price weighted by executed quantity, rather than the arithmetic mean of prices.',
    'Input: quantity,price records, or -. All quantities and prices are positive. Output: sum(quantity × price) / sum(quantity), rounded to two decimals HALF_UP. Empty input returns NO_VOLUME. Totals may exceed long range, so accumulate quantity without integer overflow.',
    [testcase('Weighted result','10,100\n30,110','107.50',sample=True),testcase('No volume','-','NO_VOLUME','boundary',True),testcase('Rounding','1,1.005','1.01','precision'),testcase('Large quantities','9223372036854775807,1\n9223372036854775807,2','1.50','overflow')],
    '''BigDecimal notional=BigDecimal.ZERO, volume=BigDecimal.ZERO;
    for (String row : rows(input)) {
        String[] f=row.split(","); BigDecimal quantity=new BigDecimal(f[0]);
        volume=volume.add(quantity); notional=notional.add(quantity.multiply(new BigDecimal(f[1])));
    }
    return volume.signum()==0 ? "NO_VOLUME" : notional.divide(volume,2,RoundingMode.HALF_UP).toPlainString();''',
    ['Maintain the total notional and total quantity as separate accumulators.', 'The quotient is meaningful only when volume is nonzero; handle the empty case before division.', 'BigDecimal quantity accumulation avoids overflowing a long sum. Divide with an explicit output scale and rounding mode to handle nonterminating decimal quotients.', 'The algorithm is one pass, O(n) record operations and O(1) accumulator count; decimal arithmetic cost grows with operand size.'])

add('2-18-find-the-largest-executed-trades','Rank the largest executed trades','ranking',
    'Return the top k executed trades by notional. Resolve equal notionals by ascending trade ID.',
    'Input: k on line 1, followed by id,status,quantity,price records. IDs are unique. Status is EXECUTED/PENDING; quantities and prices are positive. Output: at most k IDs ordered by descending exact notional then ascending ID. k=0 or no eligible trades returns -. k is between 0 and 10,000.',
    [testcase('Ranking and tie','2\nT3,EXECUTED,2,10\nT1,EXECUTED,1,20\nT2,PENDING,100,100','T1,T3',sample=True),testcase('Zero k','0\nA,EXECUTED,1,1','-','boundary',True),testcase('Decimal order','3\nB,EXECUTED,1,1.001\nA,EXECUTED,1,1.000','B,A','precision'),testcase('No trades','4','-','boundary')],
    '''String[] all=rows(input); int k=Integer.parseInt(all[0]);
    record Execution(String id, BigDecimal notional) {}
    List<Execution> executions=new ArrayList<>();
    for (int i=1;i<all.length;i++) { String[] f=all[i].split(","); if(f[1].equals("EXECUTED")) executions.add(new Execution(f[0],new BigDecimal(f[2]).multiply(new BigDecimal(f[3])))); }
    executions.sort(Comparator.comparing(Execution::notional).reversed().thenComparing(Execution::id));
    return list(executions.stream().limit(k).map(Execution::id).toList());''',
    ['Filter executions before ranking them so a large pending trade cannot enter the result.', 'Compare exact notionals numerically and then apply the ID tie-breaker. Avoid converting values to double.', 'Sorting m eligible trades costs O(m log m); producing the first k is straightforward and easy to verify.', 'When k is much smaller than m, a bounded priority queue can reduce ranking work to O(m log k), with careful handling of the tie-breaker.'])

snapshot_body='''String[] sections=input.split("\\\\|",-1);
Map<String,String[]> expected=snapshot(sections[0]),actual=snapshot(sections[1]);
Set<String> keys=new TreeSet<>(expected.keySet()); keys.addAll(actual.keySet());
List<String> result=new ArrayList<>();
for(String id:keys) {
    if(!actual.containsKey(id)) result.add(id+":MISSING");
    else if(!expected.containsKey(id)) result.add(id+":UNEXPECTED");
    else {String[] a=expected.get(id),b=actual.get(id); if(!a[0].equals(b[0]) || Long.parseLong(a[1])!=Long.parseLong(b[1]) || new BigDecimal(a[2]).compareTo(new BigDecimal(b[2]))!=0) result.add(id+":CHANGED");}
}
return list(result);'''.replace('\\\\|','\\|')
snapshot_extra='''static Map<String,String[]> snapshot(String section) {
    Map<String,String[]> result=new HashMap<>();
    if(section.equals("-")) return result;
    for(String row:section.split(";")) {
        String[] f=row.split(",");
        if(result.putIfAbsent(f[0], Arrays.copyOfRange(f,1,4))!=null) throw new IllegalArgumentException();
    }
    return result;
}'''
add('2-19-reconcile-two-complete-trade-snapshots','Reconcile complete trade snapshots','reconciliation',
    'Compare UI and API trade snapshots by stable ID and report missing, unexpected and changed records.',
    'Input: expected|actual. Each snapshot is semicolon-separated id,symbol,quantity,price records; - is empty. Fields are present, quantities positive and prices valid positive decimals. Duplicate IDs in either snapshot produce ERROR. Output: ID:MISSING, ID:UNEXPECTED or ID:CHANGED in ascending ID order; - if equal. Compare prices numerically, including different scales.',
    [testcase('All mismatch classes','A,X,1,2;B,Y,2,3|B,Y,3,3;C,Z,1,1','A:MISSING,B:CHANGED,C:UNEXPECTED',sample=True),testcase('Scale equality','A,X,1,10.0|A,X,1,10.00','-','precision',True),testcase('Duplicate expected','A,X,1,1;A,X,1,1|-','ERROR','validation'),testcase('Both empty','-|-','-','boundary'),testcase('Symbol mismatch','A,X,1,1|A,Y,1,1','A:CHANGED')], snapshot_body,
    ['Index each snapshot by trade ID. Reject duplicates before comparing, because silently overwriting a record hides data-quality problems.', 'Traverse the sorted union of IDs. Membership determines missing versus unexpected; matching IDs then require field comparison.', 'Use BigDecimal.compareTo for prices. BigDecimal.equals also considers scale, which would falsely report 10.0 and 10.00 as different.', 'Indexing is O(n+m); sorting u IDs costs O(u log u). Storage is O(n+m). In production, snapshots also need an agreed consistency boundary.'],extra=snapshot_extra)

add('2-20-deduplicate-execution-events','Apply execution events idempotently','idempotency',
    'Consistent retries must not increase executed quantity twice. Reusing an event ID with a different payload is a conflict.',
    'Input: eventId,orderId,quantity records, or -. IDs are nonblank, quantities strictly positive signed longs. Output: alphabetical orderId=total pairs, counting each unique event once. A repeated event ID must have identical order ID and quantity, otherwise print ERROR. Reject overflow.',
    [testcase('Retry does not double count','E1,O1,10\nE1,O1,10\nE2,O1,5','O1=15',sample=True),testcase('Conflicting retry','E1,O1,10\nE1,O1,11','ERROR','validation',True),testcase('Different order conflict','E,O,1\nE,P,1','ERROR','validation'),testcase('Empty','-','-','boundary'),testcase('Separate orders','B,Z,2\nA,A,1','A=1,Z=2','ordering'),testcase('Overflow','A,O,9223372036854775807\nB,O,1','ERROR','overflow')],
    '''Map<String,String> events=new HashMap<>(); Map<String,Long> totals=new TreeMap<>();
    for(String row:rows(input)) {
        String[] f=row.split(","); long quantity=Long.parseLong(f[2]); if(quantity<=0) throw new IllegalArgumentException();
        String payload=f[1]+","+quantity; String existing=events.putIfAbsent(f[0],payload);
        if(existing!=null) { if(!existing.equals(payload)) throw new IllegalArgumentException(); continue; }
        totals.put(f[1],Math.addExact(totals.getOrDefault(f[1],0L),quantity));
    }
    return map(totals);''',
    ['Store the business payload against each event ID, rather than only remembering that the ID was seen.', 'An identical retry is ignored. A changed order or quantity under the same event ID is rejected as a conflict.', 'Add quantity only after accepting a new event. Math.addExact prevents a large accumulated quantity from wrapping.', 'This implementation is sequential. ConcurrentHashMap alone does not make the separate event and aggregate updates atomic; discuss a lock, transaction or durable idempotency record for production.'])

add('2-21-maintain-best-bid-and-ask','Maintain the best bid and ask','ordered-collections',
    'Process price-level updates and return the highest live bid and lowest live ask. A zero quantity removes a level.',
    'Input: side,price,quantity records, or -. Side is BID/ASK, price positive decimal, quantity nonnegative. Updates replace the quantity at that numeric price level. Output: BID=price,ASK=price with two-decimal HALF_UP display; NONE for a side without levels. Numeric prices with different scales identify the same level.',
    [testcase('Best prices','BID,100,2\nBID,101,1\nASK,103,4\nASK,102,2','BID=101.00,ASK=102.00',sample=True),testcase('Remove same numeric level','BID,100.0,1\nBID,100.00,0','BID=NONE,ASK=NONE','precision',True),testcase('Replace level','ASK,2,5\nASK,2.00,1','BID=NONE,ASK=2.00'),testcase('Empty','-','BID=NONE,ASK=NONE','boundary')],
    '''NavigableMap<BigDecimal,Long> bids=new TreeMap<>(),asks=new TreeMap<>();
    for(String row:rows(input)) {String[] f=row.split(","); BigDecimal price=new BigDecimal(f[1]); long quantity=Long.parseLong(f[2]); NavigableMap<BigDecimal,Long> levels=f[0].equals("BID")?bids:asks; if(quantity==0) levels.remove(price); else levels.put(price,quantity);}
    return "BID="+(bids.isEmpty()?"NONE":money(bids.lastKey()))+",ASK="+(asks.isEmpty()?"NONE":money(asks.firstKey()));''',
    ['Use ordered maps for the two sides. The highest bid is lastKey; the lowest ask is firstKey.', 'Treat updates as replacement values and zero as deletion. Adding quantities instead would implement a different contract.', 'TreeMap uses numeric comparison for BigDecimal keys, so 100.0 and 100.00 refer to the same level.', 'Each update costs O(log p) for p live levels. Production designs also need sequence-gap detection and snapshot recovery.'])

# Four debugging exercises start with runnable, deliberately incorrect implementations.
add('banking-debug-price-scale','Debug false price mismatches','financial-precision',
    'A reconciliation job flags equal prices when their displayed decimal scales differ. Repair the comparison without changing its input contract.',
    'Input: decimalA|decimalB. Output: SAME when numerically equal, DIFFERENT otherwise. Both inputs are valid decimals, including negatives and zero.',
    [testcase('Equal value, different scale','10.0|10.00','SAME',sample=True),testcase('Different value','10.0|10.01','DIFFERENT',sample=True),testcase('Zero scales','0.000|0','SAME','precision'),testcase('Negative','-1.20|-1.2','SAME','precision')],
    'String[] f=input.split("\\\\|",-1); return new BigDecimal(f[0]).compareTo(new BigDecimal(f[1]))==0 ? "SAME" : "DIFFERENT";'.replace('\\\\|','\\|'),
    ['Reproduce the failure with equal numeric values that have different scales.', 'BigDecimal.equals compares value and scale. compareTo returns zero for numeric equality.', 'Use the repaired comparison in reconciliation and consider whether a business rule separately requires a particular display scale.'],format='debugging',starter={'Main.java':program('String[] f=input.split("\\\\|",-1); return new BigDecimal(f[0]).equals(new BigDecimal(f[1])) ? "SAME" : "DIFFERENT";'.replace('\\\\|','\\|'))})

add('banking-debug-first-order','Debug overwritten order records','collections',
    'A deduplication job keeps the last retry, but its contract requires the first record. Repair the update logic.',
    'Input: id,symbol records or -. Output: id:symbol pairs in first-occurrence order, retaining the first payload for each exact ID.',
    [testcase('Changed retry','O1,AAPL\nO2,MSFT\nO1,GOOG','O1:AAPL,O2:MSFT',sample=True),testcase('Empty','-','-','boundary',True),testcase('Exact IDs','a,X\nA,Y\na,Z','a:X,A:Y','ordering')],
    '''Map<String,String> orders=new LinkedHashMap<>(); for(String row:rows(input)) {String[] f=row.split(","); orders.putIfAbsent(f[0],f[1]);} return list(orders.entrySet().stream().map(e->e.getKey()+":"+e.getValue()).toList());''',
    ['LinkedHashMap preserves first insertion order but put still replaces an existing value.', 'Use putIfAbsent to preserve the first payload as well as the first key position.', 'Test both a changed duplicate and different IDs with the same payload; identity and payload are distinct concepts.'],format='debugging',starter={'Main.java':program('Map<String,String> orders=new LinkedHashMap<>(); for(String row:rows(input)) {String[] f=row.split(","); orders.put(f[0],f[1]);} return list(orders.entrySet().stream().map(e->e.getKey()+":"+e.getValue()).toList());')})

retry_body='''String[] f=input.split("\\\\|",-1); int max=Integer.parseInt(f[0]); String[] codes=f[1].split(",");
int attempts=0,last=0;
for(String text:codes) {if(attempts==max) break; last=Integer.parseInt(text); attempts++; if(!(last==429 || last>=500 && last<=599)) break;}
return attempts+":"+last;'''.replace('\\\\|','\\|')
add('banking-debug-retry-budget','Debug an API retry budget','retry-policy',
    'A payment API retry loop makes one extra call and retries permanent client errors. Correct both defects using a deterministic response sequence.',
    'Input: maxAttempts|comma-separated HTTP statuses. maxAttempts is 1–10; the sequence is nonempty and contains at least maxAttempts statuses. Retry only 429 and 500–599, stopping at the attempt budget or any other status. Output: attempts:lastStatus. This simulation performs no network calls or sleeps.',
    [testcase('Retry then succeed','3|500,429,200','3:200',sample=True),testcase('Permanent failure','3|400,200,200','1:400',sample=True),testcase('Budget of one','1|503,200','1:503','boundary'),testcase('Budget exhausted','2|500,503,200','2:503','boundary'),testcase('Success first','2|200,500','1:200')], retry_body,
    ['Define maxAttempts as total calls, including the first call. Check the budget before consuming another response.', 'Classify retryable statuses explicitly; a broad >=400 test retries permanent failures such as 400.', 'Increment the counter exactly once per consumed status and stop on success or nonretryable failure.', 'This deterministic simulation tests policy without timing flakiness. A real client also needs idempotency, jitter, deadlines and cancellation.'],format='debugging',starter={'Main.java':program('String[] f=input.split("\\\\|",-1); int max=Integer.parseInt(f[0]); int n=0,last=0; for(String code:f[1].split(",")) {if(n>max) break; last=Integer.parseInt(code); n++; if(last<400) break;} return n+":"+last;'.replace('\\\\|','\\|'))})

pagination_body='''String[] lines=rows(input); Map<String,String[]> pages=new HashMap<>();
for(int i=1;i<lines.length;i++){String[] f=lines[i].split("\\\\|",-1); pages.put(f[0],new String[]{f[1],f[2]});}
String cursor=lines[0]; Set<String> visited=new HashSet<>(); List<String> result=new ArrayList<>();
while(!cursor.equals("END")){if(!visited.add(cursor) || !pages.containsKey(cursor)) throw new IllegalArgumentException(); String[] page=pages.get(cursor); result.addAll(ids(page[1])); cursor=page[0];}
return list(result);'''.replace('\\\\|','\\|')
add('banking-debug-pagination','Debug incomplete and cyclic API pagination','api-contracts',
    'A client fetches only the first page of trade IDs. Follow continuation tokens, including empty pages, and reject cycles or missing referenced pages.',
    'Input: starting cursor on line 1, followed by cursor|nextCursor|comma-separated IDs records. END means no next page; - is an empty page. Cursors are unique and all referenced pages must exist. Output: IDs in page encounter order, retaining duplicates. Print ERROR for a cycle or missing page. Starting cursor END returns -.',
    [testcase('Continue through empty page','p1\np1|p2|T1\np2|p3|-\np3|END|T2','T1,T2',sample=True),testcase('Cycle','p1\np1|p2|T1\np2|p1|T2','ERROR','validation',True),testcase('Missing page','p1\np1|p2|T1','ERROR','validation'),testcase('No page','END','-','boundary'),testcase('Retain duplicates','a\na|b|T1\nb|END|T1','T1,T1','boundary')],pagination_body,
    ['An empty result page does not imply the end of pagination; the continuation token controls traversal.', 'Record visited cursors before fetching each page. Reusing one is a cycle, even if it contains no records.', 'Reject a missing referenced page instead of returning a falsely complete snapshot.', 'The loop processes each reachable page once, O(p+n) time and O(p+n) storage including output.'],format='debugging',starter={'Main.java':program('String[] lines=rows(input); if(lines[0].equals("END")) return "-"; for(int i=1;i<lines.length;i++) {String[] f=lines[i].split("\\\\|",-1); if(f[0].equals(lines[0])) return f[2];} return "-";'.replace('\\\\|','\\|'))})

# Mutation exercises generate black-box cases; the trusted host validates assertions and seeded behaviours.
def mutation(id,title,competency,description,contract,entries,mutants,oracle):
    rows_java=',\n'.join('            new String[]{'+__import__('json').dumps(x)+','+__import__('json').dumps(y)+'}' for x,y in entries)
    main='''import java.util.*;
public class Main {
    static List<String[]> cases() {
        return Arrays.asList(
CASES
        );
    }
    public static void main(String[] args) {
        for(String[] test : cases()) System.out.println(test[0] + " => " + test[1]);
    }
}
'''
    p=add(id,title,competency,description,contract,
          [testcase('Correct implementation accepts the suite','',str(len(entries)),sample=True)],'',
          ['Write explicit input/expected-output pairs. The host first checks every expected value against the correct contract; an incorrect assertion invalidates the suite.', 'The host then evaluates the valid cases against separately implemented, deliberately faulty behaviours. A behaviour is detected when at least one case distinguishes it from the correct result.', 'Choose cases that isolate boundaries, ordering and precision. Increasing the number of similar happy-path cases is less useful than covering different failure mechanisms.', 'The worked suite is one sufficient set, not the only acceptable solution. These exercises evaluate black-box case design; they do not claim to execute JUnit or measure all possible bugs.'],format='testing',starter={'Main.java':main.replace('CASES',rows_java.split(',\n')[0])})
    p['solution']={'Main.java':main.replace('CASES',rows_java)}
    p['mutants']=mutants; p['oracle']=oracle
    p['examples']=[dict(name='Case declaration',input=entries[0][0],expected=entries[0][1],category='example',sample=True)]
    return p

mutation('banking-test-order-validation','Design tests that detect broken order validators','validation',
    'Write a Java program that emits a black-box test suite for the order validator. Detect each listed seeded fault while keeping every assertion correct.',
    'Emit one input => expected pair per line, using symbol|quantity|price inputs and the validation messages from the order-validation exercise. Maximum 50 cases; integers fit signed long. The six faulty behaviours are: accepting blank symbols, accepting missing symbols, accepting zero quantity, accepting negative quantity, accepting zero price, and accepting a missing price. A correct suite must detect all six. ~ means missing. The first shown case alone is insufficient.',
    [('AAPL|1|1','OK'),(' |1|1','Symbol is required'),('~|1|1','Symbol is required'),('X|0|1','Quantity must be positive'),('X|-1|1','Quantity must be positive'),('X|1|0','Price must be positive'),('X|1|~','Price must be positive')],
    ['blank-symbol','missing-symbol','zero-quantity','negative-quantity','zero-price','missing-price'],'validation')
mutation('banking-test-missing-trades','Design missing-trade reconciliation tests','reconciliation',
    'Design a compact suite that detects ordering, direction and identifier-matching errors in missing-trade reconciliation.',
    'Emit expectedIDs|actualIDs => missingIDs pairs; IDs are comma-separated and unique per list, - means empty. Preserve expected order and exact case. Detect five seeded behaviours: reverse comparison direction, sorting the result, case-insensitive matching, returning nothing for an empty actual list, and dropping the final missing record. Maximum 50 cases.',
    [('A,B|B','A'),('Z,A|-','Z,A'),('a,A|A','a'),('-|X','-')],
    ['reverse-direction','sorted-output','case-insensitive','empty-actual','drop-final'],'missing')
mutation('banking-test-retry-policy','Design deterministic retry-policy tests','retry-policy',
    'Generate test cases that distinguish the documented retry policy from common boundary mistakes.',
    'Emit maxAttempts|statuses => attempts:lastStatus pairs. maxAttempts is 1–10; provide at least maxAttempts statuses, each 100–599. Retry only 429 and 500–599. Detect five seeded behaviours: one extra attempt, retrying all 4xx errors, never retrying 429, never retrying 5xx, and stopping after the first attempt. Maximum 50 cases.',
    [('3|500,429,200','3:200'),('1|503,200','1:503'),('3|400,200,200','1:400'),('2|429,200','2:200'),('2|500,200','2:200')],
    ['extra-attempt','retry-4xx','ignore-429','ignore-5xx','single-attempt'],'retry')
mutation('banking-test-money','Design financial precision and validation tests','financial-precision',
    'Write cases that detect premature rounding and incorrect validation in an order-notional service.',
    'Emit quantity|price => amount pairs. Quantity is an integer from -1,000,000 to 1,000,000 and price is valid decimal text with at most six fractional digits and absolute value at most 1,000,000. Require both values strictly positive; otherwise expect ERROR. Multiply exactly, then round once to two decimals HALF_UP. Detect five seeded behaviours: HALF_EVEN rounding, rounding price before multiplication, accepting zero quantity, accepting negative price, and adding quantity to price. Maximum 50 cases.',
    [('10|100.25','1002.50'),('1|1.005','1.01'),('3|0.335','1.01'),('0|2','ERROR'),('1|-2','ERROR')],
    ['half-even','round-price-first','zero-quantity','negative-price','addition'],'money')

# Four standard-library, multi-file projects. All expected results stay outside the candidate VM.
p=add('banking-project-reconciler','Build a snapshot reconciliation component','reconciliation',
    'Complete a reusable Reconciler in a three-file project. Keep the CLI adapter separate from the domain model and comparison logic.',
    'Use the full-snapshot contract: expected|actual with semicolon-separated id,symbol,quantity,price records. Report sorted ID:MISSING, ID:UNEXPECTED and ID:CHANGED entries. Numeric prices may have different scales. Reject duplicate IDs with ERROR. Main.java is the CLI adapter; implement Reconciler.java using immutable Trade records.',
    [testcase('Changed and extra','A,X,1,1;B,Y,2,2|A,X,1,1.00;C,Z,1,3','B:MISSING,C:UNEXPECTED',sample=True),testcase('Duplicate actual','-|A,X,1,1;A,X,1,1','ERROR','validation',True),testcase('Quantity mismatch','A,X,1,1|A,X,2,1','A:CHANGED'),testcase('Empty','-|-','-','boundary')], '',
    ['The CLI adapter parses input and renders output; Trade holds immutable domain data; Reconciler owns comparison policy.', 'Build indexes with duplicate detection, then compare the sorted union of keys. Missing and unexpected records are distinct outcomes.', 'Compare quantities directly and prices numerically. Return a new result list so caller snapshots remain unchanged.', 'This separation allows unit tests to call the reconciler directly without a terminal, UI or API transport.'],format='project')
p['solution']={'Trade.java':'import java.math.BigDecimal;\npublic record Trade(String id,String symbol,long quantity,BigDecimal price) {}\n',
'Reconciler.java':'''import java.util.*;
public final class Reconciler {
    public static List<String> reconcile(List<Trade> expected,List<Trade> actual) {
        Map<String,Trade> a=index(expected),b=index(actual); Set<String> keys=new TreeSet<>(a.keySet()); keys.addAll(b.keySet()); List<String> out=new ArrayList<>();
        for(String id:keys) {
            if(!b.containsKey(id)) out.add(id+":MISSING");
            else if(!a.containsKey(id)) out.add(id+":UNEXPECTED");
            else {Trade x=a.get(id),y=b.get(id); if(!x.symbol().equals(y.symbol()) || x.quantity()!=y.quantity() || x.price().compareTo(y.price())!=0) out.add(id+":CHANGED");}
        }
        return out;
    }
    private static Map<String,Trade> index(List<Trade> trades) {Map<String,Trade> map=new HashMap<>(); for(Trade t:trades) if(map.putIfAbsent(t.id(),t)!=null) throw new IllegalArgumentException(); return map;}
}
''','Main.java':'''import java.util.*;
import java.math.BigDecimal;
public class Main {
    static List<Trade> parse(String s) {List<Trade> out=new ArrayList<>(); if(s.equals("-")) return out; for(String row:s.split(";")){String[] f=row.split(","); out.add(new Trade(f[0],f[1],Long.parseLong(f[2]),new BigDecimal(f[3])));} return out;}
    public static void main(String[] args) throws Exception {String[] f=new String(System.in.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8).split("\\|",-1); try {List<String> result=Reconciler.reconcile(parse(f[0]),parse(f[1])); System.out.print(result.isEmpty()?"-":String.join(",",result));} catch(IllegalArgumentException error){System.out.print("ERROR");}}
}
'''}
p['starter']={**p['solution'],'Reconciler.java':'import java.util.*;\npublic final class Reconciler {\n    public static List<String> reconcile(List<Trade> expected,List<Trade> actual) {\n        throw new UnsupportedOperationException("Implement reconciliation");\n    }\n}\n'}

p=add('banking-project-ledger','Build an idempotent ledger posting service','idempotency',
    'Implement an in-memory ledger that applies each posting once, rejects conflicting retries and preserves exact balances.',
    'Input: postingId,accountId,amount records, or -. Amounts are signed decimal values with at most two fractional digits; zero is allowed. Output: alphabetical account=balance pairs with exactly two decimals. A consistent retry contributes once. Reusing an ID with a different account or numeric amount produces ERROR. Negative account balances are permitted in this simplified ledger; no overdraft rule is implied.',
    [testcase('Retry and debit','P1,A,10.00\nP1,A,10.0\nP2,A,-3.25','A=6.75',sample=True),testcase('Conflict','P,A,1\nP,B,1','ERROR','validation',True),testcase('Exact sum','P1,A,0.1\nP2,A,0.2','A=0.30','precision'),testcase('Empty','-','-','boundary'),testcase('Zero posting','Z,B,0','B=0.00','boundary')], '',
    ['Represent a posting as immutable identity, account and amount. Treat decimal scale differences as numerically equal retries.', 'Keep the seen-posting map and account balances within one Ledger instance. Validate a retry before applying any new amount.', 'Use BigDecimal for balance arithmetic and format only at the boundary. A real ledger additionally needs durable atomicity and balanced accounting entries.', 'This exercise is a single-process posting component, not a complete double-entry accounting system.'],format='project')
p['solution']={'Posting.java':'import java.math.BigDecimal;\npublic record Posting(String id,String account,BigDecimal amount) {}\n',
'Ledger.java':'''import java.util.*;
import java.math.BigDecimal;
public final class Ledger {
    private final Map<String,Posting> seen=new HashMap<>();
    private final Map<String,BigDecimal> balances=new TreeMap<>();
    public void apply(Posting p) {Posting old=seen.get(p.id()); if(old!=null){if(!old.account().equals(p.account()) || old.amount().compareTo(p.amount())!=0) throw new IllegalArgumentException(); return;} seen.put(p.id(),p); balances.merge(p.account(),p.amount(),BigDecimal::add);}
    public Map<String,BigDecimal> snapshot(){return new TreeMap<>(balances);}
}
''','Main.java':'''import java.util.*;
import java.math.BigDecimal;
public class Main {
    public static void main(String[] args) throws Exception {String input=new String(System.in.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8); Ledger ledger=new Ledger(); try {if(!input.equals("-")&&!input.isEmpty()) for(String line:input.split("\\R")){String[] f=line.split(","); ledger.apply(new Posting(f[0],f[1],new BigDecimal(f[2])));} List<String> out=new ArrayList<>(); ledger.snapshot().forEach((key,value)->out.add(key+"="+value.setScale(2).toPlainString())); System.out.print(out.isEmpty()?"-":String.join(",",out));} catch(IllegalArgumentException error){System.out.print("ERROR");}}
}
'''}
p['starter']={**p['solution'],'Ledger.java':'''import java.util.*;
import java.math.BigDecimal;
public final class Ledger {
    public void apply(Posting posting) { throw new UnsupportedOperationException("Implement posting"); }
    public Map<String,BigDecimal> snapshot() { throw new UnsupportedOperationException("Implement snapshot"); }
}
'''}

p=add('banking-project-concurrent-events','Make execution counting thread-safe','concurrency',
    'Multiple workers replay execution IDs concurrently. Count each distinct ID exactly once, even when retries race.',
    'Input: workers|replays|comma-separated event IDs. workers is 1–8; replays 1–100; at most 1,000 IDs; - means no IDs. The supplied adapter submits every ID on every replay to an ExecutorService. Output: the number of distinct exact IDs after all work finishes. Implement Counter.accept and Counter.size. Automated results check observed outcomes; they do not prove race freedom under every schedule.',
    [testcase('Concurrent duplicates','4|30|E1,E2,E1,E3','3',sample=True),testcase('Empty','2|10|-','0','boundary',True),testcase('Repeated hot key','8|100|X,X,X','1','concurrency'),testcase('Exact IDs','4|40|e,E,A,B,C','5','concurrency')], '',
    ['Use one atomic collection operation to establish whether an event has already been accepted.', 'ConcurrentHashMap.newKeySet supplies a thread-safe set whose add operation is atomic. A separate contains followed by add on an ordinary HashSet is unsafe.', 'Wait for every submitted Future before inspecting the final size. Otherwise the snapshot may be observed before processing completes.', 'Stress cases can reveal races but cannot prove their absence. Explain the collection contract and the happens-before relationship established by Future.get.'],format='project')
p['solution']={'Counter.java':'''import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
public final class Counter {
    private final Set<String> ids=ConcurrentHashMap.newKeySet();
    public void accept(String id){ids.add(id);}
    public int size(){return ids.size();}
}
''','Main.java':'''import java.util.*;
import java.util.concurrent.*;
public class Main {
    public static void main(String[] args) throws Exception {String[] f=new String(System.in.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8).split("\\|",-1); int workers=Integer.parseInt(f[0]),replays=Integer.parseInt(f[1]); Counter counter=new Counter(); ExecutorService pool=Executors.newFixedThreadPool(workers); try {List<Future<?>> pending=new ArrayList<>(); if(!f[2].equals("-")) for(int i=0;i<replays;i++) for(String id:f[2].split(",")) pending.add(pool.submit(()->counter.accept(id))); for(Future<?> task:pending)task.get(); System.out.print(counter.size());} finally {pool.shutdownNow();}}
}
'''}
p['starter']={**p['solution'],'Counter.java':'''import java.util.*;
public final class Counter {
    // Replace unsafe shared state with an atomic, thread-safe design.
    private final Set<String> ids=new HashSet<>();
    public void accept(String id){if(!ids.contains(id)) ids.add(id);}
    public int size(){return ids.size();}
}
'''}

p=add('banking-project-regression-runner','Build a bounded regression task runner','concurrency',
    'Execute independent regression tasks with a bounded pool, preserve submission order and isolate individual task failures.',
    'Input: workers on line 1 (1–8), then taskId,value records. value is an integer or FAIL. Output: taskId=value or taskId=ERROR in submission order; - when no tasks exist. Runner.execute receives Callable<String> tasks and must use a bounded ExecutorService, await every result, isolate failed tasks and shut down resources. Output tests check ordering/failure handling; bounded execution and cleanup require code review.',
    [testcase('Order and failure isolation','2\nA,10\nB,FAIL\nC,20','A=10,B=ERROR,C=20',sample=True),testcase('No tasks','1','-','boundary',True),testcase('One worker','1\nZ,3\nA,4','Z=3,A=4','ordering'),testcase('All fail','3\nA,FAIL\nB,FAIL','A=ERROR,B=ERROR','errors')], '',
    ['Submit work to a fixed-size executor to bound simultaneous execution.', 'Read Futures in submission order to preserve output order, even when tasks finish in another order.', 'Catch ExecutionException per task, so one failure becomes one ERROR result while remaining tasks are still observed.', 'Restore interruption when handling InterruptedException and always shut down the executor in finally. Review lifecycle and concurrency separately from functional output.'],format='project')
p['solution']={'Runner.java':'''import java.util.*;
import java.util.concurrent.*;
public final class Runner {
    public static List<String> execute(int workers,List<Callable<String>> tasks) throws InterruptedException {
        ExecutorService pool=Executors.newFixedThreadPool(workers);
        try {List<Future<String>> futures=new ArrayList<>(); for(Callable<String> task:tasks) futures.add(pool.submit(task)); List<String> out=new ArrayList<>(); for(Future<String> future:futures) {try {out.add(future.get());} catch(ExecutionException error){out.add("ERROR");}} return out;}
        finally {pool.shutdownNow();}
    }
}
''','Main.java':'''import java.util.*;
import java.util.concurrent.*;
public class Main {
    public static void main(String[] args) throws Exception {String[] lines=new String(System.in.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8).split("\\R"); int workers=Integer.parseInt(lines[0]); List<String> ids=new ArrayList<>(); List<Callable<String>> tasks=new ArrayList<>(); for(int i=1;i<lines.length;i++){String[] f=lines[i].split(","); ids.add(f[0]); String value=f[1]; tasks.add(()->{if(value.equals("FAIL"))throw new IllegalStateException("Seeded task failure"); return value;});} List<String> values=Runner.execute(workers,tasks); List<String> out=new ArrayList<>(); for(int i=0;i<ids.size();i++)out.add(ids.get(i)+"="+values.get(i)); System.out.print(out.isEmpty()?"-":String.join(",",out));}
}
'''}
p['starter']={**p['solution'],'Runner.java':'''import java.util.*;
import java.util.concurrent.*;
public final class Runner {
    public static List<String> execute(int workers,List<Callable<String>> tasks) throws InterruptedException {
        throw new UnsupportedOperationException("Implement a bounded runner");
    }
}
'''}

def problems():
    assert len(P)==24
    import re
    for item in P:
        for kind in ('starter','solution'):
            for name,source in item[kind].items():
                item[kind][name]=re.sub(r'(?<!\\)\\([R|])',lambda match:'\\\\'+match.group(1),source)
    return P
