# Concept language review

Reviewed on 19 November 2026 against Oracle Java SE 17 documentation and the Python 3.9 language/standard-library documentation. Python 3.9 matches the minimum APIs used by the existing local examples; this is a content compatibility baseline, not a support-lifecycle claim.

There are 27 concept topics: ten programming topics, each with an authored Java and Python edition, plus 17 language-independent interview/domain topics. The latter are grouped separately and do not claim to be language APIs or to be endorsed by a language publisher.

The complete per-edition source list, version, review date and availability policy are in `dist/concept-availability.js`. Lessons expose these sources under **Official documentation**. PrepSpace authors the explanations and exercises; the sources establish the availability and semantics of the language features.

| Topic | Java edition | Python edition |
| --- | --- | --- |
| Object construction and state | Classes, constructors, fields, immutable copies | Data model, dataclasses, frozen instances and tuples |
| Equality and missing values | Object, Objects, String | Identity/value equality, None, string operations, hashing |
| Decimal money | BigDecimal | decimal.Decimal, quantize, decimal contexts |
| Collections and copies | Java Collections Framework | list, set, dict, deque and shallow copies |
| Maps and ordering | Map, TreeMap, Comparator | dict, Counter, sorted and max |
| Pipelines | java.util.stream and functional interfaces | Comprehensions, generators and itertools |
| Grouping and reductions | Collectors | Counter, defaultdict, sum and itertools.groupby |
| Executors and futures | Thread, ExecutorService, Future | concurrent.futures and threading |
| Shared-state coordination | AtomicLong, LongAdder, ConcurrentHashMap, queues, latches, semaphores and locks | threading.Lock and queue.Queue |
| Context and async composition | ThreadLocal and CompletableFuture | asyncio, contextvars and threading.local |

Important distinctions verified during review:

- Java Streams, Collectors, BigDecimal, TreeMap, ConcurrentHashMap, AtomicLong and CompletableFuture are not presented as Python APIs. The Python editions use their documented native features.
- Python dict ordering is insertion ordering, rather than TreeMap-style key ordering. `itertools.groupby` groups consecutive keys.
- `Stream.toList()` is available from Java 16 and therefore in the Java 17 baseline. `asyncio.to_thread()` is available from Python 3.9.
- A frozen dataclass does not deeply freeze nested mutable state. Future cancellation and waiting timeouts do not guarantee that running work has stopped.

Unknown concepts, missing language editions, missing learning profiles and unreviewed editions are excluded rather than falling back to a Java page. Adding a new language edition requires matching content, a learning profile, official sources, a version and an explicit review entry.

The concept language selector and topic categories use the reviewed concept catalogue. Explicit Java/Python choices elsewhere in the site also refresh that catalogue. Coding problem categories cannot leak into concept filters. JavaScript and TypeScript remain available in Practice Lab only.

Verification: `npm run check` checks the availability rules and executes all ten published Python concept examples against their published outputs. Browser checks cover the catalogue selector, Java/Python categories, topic changes, round pages and source references. Unit/API checks establish availability and functional behaviour; they do not certify teaching quality or interview outcomes.
