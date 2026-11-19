'use strict';
// Availability is explicit: an untranslated Java lesson is never a Python edition.
window.ConceptAvailability=(()=>{
  const reviewed='2026-11-19';
  const java=(title,path)=>({title,url:'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/'+path+'.html'});
  const python=(title,path)=>({title,url:'https://docs.python.org/3.9/'+path+'.html'});
  const classes={title:'Java Language Specification: classes',url:'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html'};
  const entries={};
  function register(id,javaSources,pythonSources,notes={}){
    entries[id]={kind:'language',editions:{
      java:{status:'reviewed',version:'Java SE 17',reviewed,sources:javaSources,note:notes.java||'Uses Java language features and standard-library APIs documented for Java SE 17.'},
      python:{status:'reviewed',version:'Python 3.9',reviewed,sources:pythonSources,note:notes.python||'Uses Python language features and standard-library APIs documented for Python 3.9.'}
    }};
  }
  register('1-01-objects-constructors-and-immutability',[
    classes,java('List: immutable copies','java/util/List')
  ],[
    python('Data model: object construction','reference/datamodel'),python('Dataclasses and frozen instances','library/dataclasses'),python('Built-in types: tuples','library/stdtypes')
  ]);
  register('1-02-equality-null-handling-and-object-utility-methods',[
    java('Object: equality, hashes and monitors','java/lang/Object'),java('Objects: null-safe utilities','java/util/Objects'),java('String: empty and blank values','java/lang/String')
  ],[
    python('Data model: equality and hashing','reference/datamodel'),python('Built-in types: None and string methods','library/stdtypes'),python('Built-in functions: hash','library/functions')
  ]);
  register('1-03-bigdecimal-financial-arithmetic-and-rounding',[
    java('BigDecimal: arithmetic and rounding','java/math/BigDecimal')
  ],[
    python('Decimal: arithmetic, contexts and rounding','library/decimal')
  ],{python:'Python uses decimal.Decimal, arithmetic operators and quantize. BigDecimal is a Java API and is not presented as a Python method.'});
  register('1-04-collections-lists-sets-queues-and-copies',[
    java('Java Collections Framework','java/util/package-summary'),java('List: sequence operations and copies','java/util/List'),java('Set: uniqueness and immutable sets','java/util/Set'),java('Concurrent collections','java/util/concurrent/package-summary')
  ],[
    python('Built-in types: lists, sets and dictionaries','library/stdtypes'),python('Data structures: comprehensions and copies','tutorial/datastructures'),python('Collections: deque','library/collections')
  ]);
  register('1-05-maps-sorted-maps-and-comparators',[
    java('Map: defaults and updates','java/util/Map'),java('TreeMap: ordered keys','java/util/TreeMap'),java('Comparator: ordering','java/util/Comparator')
  ],[
    python('Built-in types: dictionaries','library/stdtypes'),python('Collections: Counter','library/collections'),python('Built-in functions: sorted and max','library/functions')
  ],{python:'Python dictionaries preserve insertion order. sorted and max are documented alternatives for ordering and lookup; they are not a built-in TreeMap or Comparator API.'});
  register('1-06-streams-pipelines-filtering-mapping-and-ordering',[
    java('Stream: pipelines and terminal operations','java/util/stream/Stream'),java('Functional interfaces','java/util/function/package-summary')
  ],[
    python('Data structures: comprehensions','tutorial/datastructures'),python('Itertools: lazy iterator operations','library/itertools'),python('Built-in functions: sorted','library/functions')
  ],{java:'Java Streams are documented in java.util.stream. Stream.toList() requires Java 16 or later and is available in the Java 17 baseline.',python:'Python has comprehensions, generator expressions and itertools. Java Streams are not a Python API; this edition teaches the native Python features.'});
  register('1-07-collectors-grouping-and-financial-reductions',[
    java('Collectors: grouping and reductions','java/util/stream/Collectors')
  ],[
    python('Collections: Counter and defaultdict','library/collections'),python('Itertools: consecutive-key groupby','library/itertools'),python('Decimal: financial totals','library/decimal'),python('Built-in functions: sum','library/functions')
  ],{python:'Python uses Counter, defaultdict, sum and itertools.groupby. Java Collectors are not a Python API, and groupby groups consecutive keys.'});
  register('1-08-threads-executors-futures-and-lifecycle-management',[
    java('Thread: starting, joining and interruption','java/lang/Thread'),java('ExecutorService: submission and shutdown','java/util/concurrent/ExecutorService'),java('Future: results, timeouts and cancellation','java/util/concurrent/Future')
  ],[
    python('Concurrent futures: executors, results and cancellation','library/concurrent.futures'),python('Threading: threads and locks','library/threading')
  ]);
  register('1-09-atomic-updates-concurrent-maps-and-bounded-queues',[
    java('AtomicLong: atomic updates','java/util/concurrent/atomic/AtomicLong'),java('LongAdder: counters','java/util/concurrent/atomic/LongAdder'),java('ConcurrentHashMap: atomic map updates','java/util/concurrent/ConcurrentHashMap'),java('BlockingQueue: bounded waiting','java/util/concurrent/BlockingQueue'),java('CountDownLatch','java/util/concurrent/CountDownLatch'),java('Semaphore','java/util/concurrent/Semaphore'),java('ReentrantLock','java/util/concurrent/locks/ReentrantLock')
  ],[
    python('Threading: Lock and critical sections','library/threading'),python('Queue: synchronized bounded queues','library/queue'),python('Concurrent futures: joining work','library/concurrent.futures')
  ],{python:'Python uses threading.Lock and queue.Queue for these examples. AtomicLong and ConcurrentHashMap are Java APIs, not Python standard-library classes.'});
  register('1-10-threadlocal-context-and-completablefuture-composition',[
    java('ThreadLocal: per-thread state and cleanup','java/lang/ThreadLocal'),java('CompletableFuture: composition','java/util/concurrent/CompletableFuture')
  ],[
    python('Asyncio: tasks, gather and to_thread','library/asyncio-task'),python('Context variables: set and reset','library/contextvars'),python('Threading: thread-local data','library/threading')
  ],{python:'Python uses asyncio and contextvars for asynchronous tasks and request context. asyncio.to_thread was introduced in Python 3.9. These are not Java CompletableFuture or ThreadLocal APIs.'});
  for(const id of ['shared-structured-answers','shared-problem-solving','core-ledger','core-idempotency','ecommerce-inventory','ecommerce-checkout','ai-evaluation','ai-rag','cloud-reliability','cloud-access','data-replay','data-quality','intro-concept','coding-concept','technical-concept','manager-concept','hr-concept']){
    entries[id]={kind:'independent',reviewed};
  }
  function documented(edition,language){
    const prefixes=language==='java'?['https://docs.oracle.com/en/java/javase/17/','https://docs.oracle.com/javase/specs/jls/se17/']:language==='python'?['https://docs.python.org/3.9/']:[];
    return edition?.status==='reviewed'&&edition.version&&edition.reviewed&&edition.sources?.length>0&&edition.sources.every(source=>source.title&&prefixes.some(prefix=>source.url?.startsWith(prefix)));
  }
  function materialize(original,language,variant){
    if(!original)return null;
    const entry=entries[original.id];
    if(!entry||!window.CONCEPT_LESSONS?.profiles[original.id])return null;
    if(entry.kind==='independent')return original.language==='text'?{...original,programming:false,conceptKind:'independent'}:null;
    const edition=entry.editions[language],content=language===original.language?original:variant;
    if(!documented(edition,language)||!content?.html||content.language!==language)return null;
    if(language!==original.language&&!window.CONCEPT_LESSONS.overrides[language]?.[original.id])return null;
    return {...original,...content,programming:true,conceptKind:'language',conceptAvailability:edition};
  }
  return {entries,materialize};
})();
