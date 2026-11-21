'use strict';
// Java 17 interview answers, reviewed against the linked Java SE APIs.
(()=>{
  const api=name=>'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/'+(name==='Object'?'java/lang/':'java/util/')+name+'.html';
  const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const paragraph=text=>`<p>${text}</p>`;
  const list=items=>`<ul>${items.map(item=>`<li>${item}</li>`).join('')}</ul>`;
  const table=(head,rows)=>`<div class="technical-comparison" role="region" aria-label="Java comparison table. Scroll horizontally if needed." tabindex="0"><table><thead><tr>${head.map(cell=>`<th scope="col">${cell}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const questions=[
    {
      id:'java-technical-common-data-structures',
      title:'Three commonly used Java data structures: List, Set and Map',
      prompt:'Explain three commonly used Java data-structure families. What do they store, which methods matter, and when would you choose each one?',
      summary:'Three useful families are List for a sequence, Set for uniqueness and Map for key-to-value lookup. These are common choices, not an official ranking of the three most-used structures.',
      explanation:table(['Family / implementation','Behaviour','Methods and typical use'],[
        ['<code>List / ArrayList</code>','Ordered sequence; duplicates allowed; positions start at 0.','<code>add</code>, <code>get</code>, <code>set</code>, <code>contains</code>. Keep trades in arrival order.'],
        ['<code>Set / HashSet</code>','Unique elements by equality; HashSet gives no iteration-order guarantee.','<code>add</code>, <code>contains</code>, <code>remove</code>. Track already-seen trade IDs.'],
        ['<code>Map / HashMap</code>','One value per key; values may repeat. Putting an equal key replaces its value.','<code>put</code>, <code>get</code>, <code>getOrDefault</code>, <code>entrySet</code>. Find quantity by trade ID.']
      ])+paragraph('A list preserves positions; a set answers “have I seen this?”; a map answers “what is stored for this key?”. ArrayList indexing is O(1), while finding an arbitrary element is O(n). HashSet membership is expected O(1) with well-distributed hashes. State the operation before discussing speed.'),
      scenario:'Keep duplicate arrivals, detect repeated IDs and retrieve the quantity for one trade.',
      input:'Arrival IDs: [T1, T2, T1]; insert T1 twice into the set; quantity for T1: 100.',
      output:'T2\ntrue\nfalse\n100',
      code:`import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> arrivals = new ArrayList<>(List.of("T1", "T2", "T1"));
        Set<String> seen = new HashSet<>();
        Map<String, Integer> quantities = new HashMap<>();
        quantities.put("T1", 100);
        System.out.println(arrivals.get(1));
        System.out.println(seen.add("T1"));
        System.out.println(seen.add("T1"));
        System.out.println(quantities.get("T1"));
    }
}`,
      why:'The list keeps all three arrivals. The set returns false for the repeated ID because nothing was added. The map associates T1 with a quantity. No example relies on HashSet or HashMap iteration order.',
      followups:['When would LinkedHashSet or LinkedHashMap help?','Why is a Map part of the collections framework without extending Collection?'],
      pitfalls:['List, Set and Map are interfaces; ArrayList, HashSet and HashMap are implementations.','An interface alone does not establish a performance bound.'],
      sources:['ArrayList','HashSet','Map']
    },
    {
      id:'java-technical-queue-versus-linked-list',
      title:'Queue versus LinkedList: what is the difference, and which is faster?',
      prompt:'Compare Queue and LinkedList. Can LinkedList be a queue? For a single-threaded FIFO workload, compare LinkedList with ArrayDeque and explain the performance assumptions.',
      summary:'Queue describes a processing contract; LinkedList is a concrete doubly linked structure implementing List and Deque, and therefore Queue. “Queue is faster than LinkedList” compares an interface with an implementation.',
      explanation:paragraph('Queues commonly use FIFO, but priority queues have a different ordering policy. For FIFO work, offer adds at the tail, poll removes the head, and peek inspects the head. Poll and peek return null when empty; remove() and element() throw when empty. Avoid null queue elements so an empty result stays unambiguous.')+table(['Operation','ArrayDeque as FIFO','LinkedList as FIFO'],[
        ['<code>offer</code> / <code>poll</code>','Amortized O(1) / O(1)','O(1) at the ends'],
        ['Search by value','O(n)','O(n)'],
        ['Indexed access','No <code>get(index)</code> API','O(n) traversal in the general case']
      ])+paragraph('Oracle describes ArrayDeque as likely faster than LinkedList when used as a queue. Its array storage also avoids a separate linked node for each element. This is a practical expectation, not a guaranteed timing result. Benchmark the actual workload. Neither implementation is thread-safe.'),
      scenario:'Process two pending orders in arrival order.',
      input:'Offer O1, then O2; peek once and poll three times.',
      output:'O1\nO1\nO2\nnull',
      code:`import java.util.*;

public class Main {
    public static void main(String[] args) {
        Queue<String> pending = new ArrayDeque<>();
        pending.offer("O1");
        pending.offer("O2");
        System.out.println(pending.peek());
        System.out.println(pending.poll());
        System.out.println(pending.poll());
        System.out.println(pending.poll());
    }
}`,
      why:'Peek leaves O1 in place. The next two calls remove O1 and O2. The final poll returns null because the queue is empty. Replacing ArrayDeque with LinkedList preserves these non-null FIFO results, but may change performance.',
      followups:['Which BlockingQueue would you consider for bounded producer/consumer work?','How does PriorityQueue change the removal order?'],
      pitfalls:['Do not assume every queue is FIFO.','LinkedList insertion is not universally O(1): finding an indexed position still requires traversal.'],
      sources:['Queue','LinkedList','ArrayDeque']
    },
    {
      id:'java-technical-list-versus-hashmap',
      title:'List versus HashMap: which operations are faster, and why?',
      prompt:'Compare List and HashMap for storing trades. Discuss ordering, duplicates, access by position and lookup by a business ID. Which operation are you measuring when you say “faster”?',
      summary:'List models a sequence; HashMap models associations. ArrayList is a useful concrete List for comparison. Pick a sequence when position matters and a map when a business key identifies a value.',
      explanation:table(['Question / operation','ArrayList','HashMap'],[
        ['Duplicates','Repeated elements allowed','One mapping per equal key; repeated values allowed'],
        ['Ordering','Maintains sequence order','No guaranteed iteration order'],
        ['Access','<code>get(index)</code>: O(1)','<code>get(key)</code>: expected O(1) with suitable hashes'],
        ['Find an arbitrary trade ID','Scan elements: O(n)','Lookup by that ID as the key: expected O(1)'],
        ['Search values','<code>contains(value)</code>: O(n)','<code>containsValue(value)</code>: scan; not a key lookup'],
        ['Append / insert','Append amortized O(1); middle insertion shifts elements','<code>put</code> amortized expected O(1); an individual resize can cost more']
      ])+paragraph('Both ArrayList indexing and a well-behaved hash lookup can be constant-time, yet they answer different questions. The map hashes a key to narrow the search; scanning a list compares candidates. HashMap does not speed up an arbitrary value predicate. Tiny collections, memory costs and key-method costs can change measured timings.'),
      scenario:'Keep all arrival IDs and maintain the latest quantity for each ID.',
      input:'List IDs [T1, T2, T1]; map updates T1=100, T2=200, then T1=150.',
      output:'3\n2\n150',
      code:`import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> arrivals = List.of("T1", "T2", "T1");
        Map<String, Integer> latest = new HashMap<>();
        latest.put("T1", 100);
        latest.put("T2", 200);
        latest.put("T1", 150);
        System.out.println(arrivals.size());
        System.out.println(latest.size());
        System.out.println(latest.get("T1"));
    }
}`,
      why:'The list contains three arrivals. The map contains two keys because the second T1 put replaces 100 with 150. This replacement would be inappropriate if every execution event needed to be retained.',
      followups:['How would you store several trades for the same symbol?','When would you maintain both a sequence and a lookup index?'],
      pitfalls:['HashMap is not always faster than every List operation.','List is an interface: LinkedList indexed access has different costs from ArrayList.'],
      sources:['ArrayList','Map','HashMap']
    },
    {
      id:'java-technical-hashmap-versus-treemap',
      title:'HashMap versus TreeMap: performance, ordering and use cases',
      prompt:'Explain how HashMap and TreeMap organize keys. Compare lookup and update costs, key ordering and range queries. Which would you choose for trade-ID lookup versus an ordered price ladder?',
      summary:'HashMap uses hashing for lookup. TreeMap uses a balanced red-black tree to keep keys ordered. Prefer a hash-based index for ordinary exact-key lookup; consider TreeMap when ordering, ranges or neighbouring keys are requirements.',
      explanation:table(['Property','HashMap','TreeMap'],[
        ['Key order','Unspecified','Natural order or supplied Comparator'],
        ['<code>get</code> / <code>put</code>','Expected constant lookup; amortized expected constant insertion','O(log n) guaranteed operation count'],
        ['Neighbour / range API','No <code>floorKey</code> or <code>subMap</code> contract','NavigableMap / SortedMap operations'],
        ['How keys match','Hashing and equality','Comparison result of zero'],
        ['Concurrency','Not synchronized','Not synchronized']
      ])+paragraph('For comparable workloads with inexpensive, well-distributed key hashes, HashMap is usually the choice for exact lookup. TreeMap pays comparison and balancing costs to maintain useful order. Its O(log n) bound counts comparisons; an expensive comparator still costs time. Keep comparison consistent with equals to honour the general Map contract.'),
      scenario:'Find a trade by ID, then show keys in sorted order.',
      input:'Insert T2=200, then T1=100; ask for T2 and the largest key no greater than T1.',
      output:'200\n[T1, T2]\nT1',
      code:`import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> byId = new HashMap<>();
        byId.put("T2", 200);
        byId.put("T1", 100);
        NavigableMap<String, Integer> sorted = new TreeMap<>(byId);
        System.out.println(byId.get("T2"));
        System.out.println(sorted.keySet());
        System.out.println(sorted.floorKey("T1"));
    }
}`,
      why:'The hash lookup finds T2. The TreeMap copy has sorted keys, regardless of source iteration order. FloorKey finds the greatest key at or below the requested key; this is useful for ordered-domain queries.',
      followups:['What happens if a Comparator returns zero for two keys that are not equal?','What does lexical ordering of T2 and T10 mean for a trade-ID comparator?'],
      pitfalls:['Do not rely on an observed HashMap iteration order.','Sorted keys do not mean values are sorted, and logarithmic complexity is not a measured latency guarantee.'],
      sources:['HashMap','TreeMap','NavigableMap']
    },
    {
      id:'java-technical-map-interface',
      title:'Which interface do Java map implementations implement?',
      prompt:'Which interface is implemented by general-purpose maps such as HashMap and TreeMap? Does Map extend Collection? Explain the additional interfaces used by sorted and navigable maps.',
      summary:'The main interface is java.util.Map<K,V>. HashMap implements Map. TreeMap implements NavigableMap, which extends SortedMap, which extends Map. Map itself is already an interface.',
      explanation:paragraph('In Java 17, List, Set and Queue are Collection families; Map is a separate framework branch. A map exposes collection views through keySet(), values() and entrySet(). Keys are unique, but the values view may contain duplicates.')+table(['Declaration','What the reference exposes'],[
        ['<code>Map&lt;K,V&gt;</code>','Key/value operations such as put, get and entrySet'],
        ['<code>SortedMap&lt;K,V&gt;</code>','Sorted keys, firstKey, lastKey and ranges'],
        ['<code>NavigableMap&lt;K,V&gt;</code>','Closest-key queries such as floorKey and ceilingKey']
      ])+paragraph('Program to the interface your caller needs. A Map reference can point to a TreeMap, but calling floorKey through that reference does not compile because Map does not declare it. HashMap also extends AbstractMap, an abstract class; that is distinct from its implemented interfaces.'),
      scenario:'Expose a lookup through Map and an ordered lookup through NavigableMap.',
      input:'Map contains T1=100; ordered map contains 10=LOW and 20=HIGH; query floorKey(15).',
      output:'100\n[T1]\n[100]\n10',
      code:`import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> quantities = new HashMap<>();
        quantities.put("T1", 100);
        NavigableMap<Integer, String> levels = new TreeMap<>();
        levels.put(10, "LOW");
        levels.put(20, "HIGH");
        System.out.println(quantities.get("T1"));
        System.out.println(quantities.keySet());
        System.out.println(quantities.values());
        System.out.println(levels.floorKey(15));
    }
}`,
      why:'The first declaration allows the HashMap implementation to be replaced without changing ordinary lookup callers. The second deliberately exposes navigation methods. Its result is 10 because that is the largest key not exceeding 15.',
      followups:['What types do keySet(), values() and entrySet() return?','Why does Map not provide get(index)?'],
      pitfalls:['Map does not extend Collection.','A class extends a class and implements interfaces; an interface extends other interfaces.'],
      sources:['Map','Collection','NavigableMap']
    },
    {
      id:'java-technical-custom-hashmap-key',
      title:'Which methods should a custom HashMap key override?',
      prompt:'A custom TradeKey should identify the same trade when venue and trade ID match. Which methods should you override, how must they agree, and what should remain immutable?',
      summary:'For value-based keys, override equals(Object) and hashCode() together. Use the same identity fields: equal objects must have equal hash codes. Two different keys may share a hash code. Identity-based keys can intentionally retain Object’s defaults.',
      explanation:paragraph('Equals defines which keys represent the same business identity. HashCode helps locate candidates; it does not establish equality. Keep identity fields stable while the key is stored, preferably with immutable fields and immutable component values. Comparable is not a requirement for an ordinary HashMap key.')+paragraph('The example is final so subclasses cannot introduce incompatible equality rules. Venue and tradeId are final Strings; quantity and price are intentionally absent because changing order state should not change identity. Objects.hash combines the identity fields; it is not collision-free.'),
      scenario:'Retrieve a stored trade using a different TradeKey instance with the same business identity.',
      input:'Store (LSE, T1)=100; retrieve using a new TradeKey("LSE", "T1").',
      output:'100\n1',
      code:`import java.util.*;

public class Main {
    static final class TradeKey {
        private final String venue;
        private final String tradeId;

        TradeKey(String venue, String tradeId) {
            this.venue = Objects.requireNonNull(venue);
            this.tradeId = Objects.requireNonNull(tradeId);
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) return true;
            if (!(other instanceof TradeKey)) return false;
            TradeKey that = (TradeKey) other;
            return venue.equals(that.venue) && tradeId.equals(that.tradeId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(venue, tradeId);
        }
    }

    public static void main(String[] args) {
        Map<TradeKey, Integer> quantities = new HashMap<>();
        quantities.put(new TradeKey("LSE", "T1"), 100);
        System.out.println(quantities.get(new TradeKey("LSE", "T1")));
        System.out.println(quantities.size());
    }
}`,
      why:'The lookup instance is a different object, but its identity fields match. Equals returns true and both instances compute the same hash code, so the mapping is found. A key with another venue remains a different logical identity.',
      followups:['How would you test symmetry, transitivity, null and equal-object hash agreement?','Could a Java record express this immutable key more briefly?'],
      pitfalls:['equals(TradeKey) overloads instead of overriding equals(Object); use @Override.','Changing equality fields while a key is stored makes Map behaviour unspecified.','Overriding toString() does not implement key equality.'],
      sources:['Object','Objects','Map']
    },
    {
      id:'java-technical-hashmap-performance',
      title:'When can HashMap performance degrade? Explain a realistic scenario',
      prompt:'An execution-reconciliation service becomes slow as its HashMap grows. Give a concrete failure scenario, explain the mechanism, and describe fixes and measurements. Separate performance issues from correctness defects.',
      summary:'One scenario is a TradeKey.hashCode() that always returns 1. Distinct trade IDs collide, so lookups need extra key comparisons. Correctness can survive collisions while latency degrades.',
      explanation:paragraph('OpenJDK 17 can use tree bins for crowded buckets. This mitigates many collisions, but is an implementation detail, not permission to return a constant hash. Do not promise O(log n) for every colliding key type: same-hash, non-orderable keys can still require broad searches.')+table(['Scenario','Symptom / mechanism','Response'],[
        ['Poor hash distribution','Many unrelated IDs compete in the same bucket','Hash stable identity fields; check distribution and equality work'],
        ['Rapid growth from a small capacity','Occasional expensive inserts while storage is rebuilt','Estimate entry count and size sensibly; measure allocation and pauses'],
        ['Expensive key methods','Hashing or comparing large object graphs dominates lookup','Use a compact immutable identity; measure key-method cost'],
        ['Large sparse allocation / retained entries','Wasteful memory and slow full traversal','Review retention and capacity; iteration costs capacity plus size'],
        ['Repeated value scans','containsValue or entry scans visit many candidates','Use a suitable secondary index if that query is frequent']
      ])+paragraph('Profile with realistic sizes, hit/miss ratios and key types; compare throughput and tail latency before and after the change. A mutated key or unsafely shared mutable HashMap is a correctness problem, not merely “slow HashMap”. Fix ownership and synchronization separately.'),
      scenario:'Two distinct execution IDs have a deliberately bad hash function.',
      input:'Insert E1=100 and E2=200; both BadKey instances return hash code 1.',
      output:'true\n2\n200',
      code:`import java.util.*;

public class Main {
    // Deliberately bad distribution; record supplies value-based equals.
    record BadKey(String executionId) {
        @Override
        public int hashCode() {
            return 1;
        }
    }

    public static void main(String[] args) {
        BadKey first = new BadKey("E1");
        BadKey second = new BadKey("E2");
        Map<BadKey, Integer> executions = new HashMap<>();
        executions.put(first, 100);
        executions.put(second, 200);
        System.out.println(first.hashCode() == second.hashCode());
        System.out.println(executions.size());
        System.out.println(executions.get(new BadKey("E2")));
    }
}`,
      why:'The keys collide but are not equal, so both mappings remain. The example proves collision handling, not a timing claim; two entries are too small to establish a performance trend. Expanding this key design to many executions creates the diagnostic scenario.',
      followups:['What would you measure before changing capacity or load factor?','How would you distinguish slow key methods, excessive growth and a value-scan query?'],
      pitfalls:['A collision does not overwrite an unrelated key; equality determines replacement.','An individual insertion may resize even though average insertion is fast.','Treeification details vary by implementation and version.'],
      sources:['HashMap'],
      extraSources:[{title:'OpenJDK 17 HashMap implementation notes',url:'https://github.com/openjdk/jdk17u/blob/master/src/java.base/share/classes/java/util/HashMap.java'}]
    }
  ];
  const items=questions.map((entry,index)=>{
    const sources=[...entry.sources.map(name=>({title:`Java SE 17 ${name} API`,url:api(name)})),...(entry.extraSources||[])];
    const answer=`<h2>Interview answer</h2>${paragraph(entry.summary)}<h3>Detailed explanation</h3>${entry.explanation}<h3>Scenario</h3>${paragraph(entry.scenario)}<p><strong>Input:</strong> ${escape(entry.input)}</p><h3>Runnable Java 17 example</h3><div class="codeblock"><pre><code>${escape(entry.code)}</code></pre></div><p><strong>Output</strong></p><div class="codeblock"><pre><code>${escape(entry.output)}</code></pre></div><h3>Why the result looks like this</h3>${paragraph(entry.why)}<h3>Common mistakes</h3>${list(entry.pitfalls)}<h3>Follow-up questions</h3>${list(entry.followups)}<h3>Official references</h3>${list(sources.map(source=>`<a href="${source.url}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a>`))}<p class="muted">Java 17 baseline · reviewed 21 November 2026. Complexity describes operations, not a measured runtime guarantee.</p>`;
    const question=`<p class="pill">Java technical interview · ${index+1} of ${questions.length}</p><h2>Question</h2>${paragraph(entry.prompt)}<p>Try a concise answer first. Explain the operation, assumptions and one concrete example before revealing the worked answer.</p>`;
    return {id:entry.id,title:entry.title,type:'problem',domain:'Shared',category:'Java collections interview',language:'text',contentLanguage:'java',supportedLanguages:['java'],rounds:['technical'],roles:['all'],solved:true,question,answer,html:question+answer,code:'',text:(entry.title+' '+question+' '+answer).replace(/<[^>]*>/g,' '),reviewedAt:'2026-11-21',sources,example:{input:entry.input,output:entry.output,code:entry.code}};
  });
  window.PREP_CONTENT.items.unshift(...items);
})();
