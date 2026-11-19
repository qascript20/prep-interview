import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function workspace(){
  const storage=new Map();
  const context={window:{addEventListener(){}},document:{addEventListener(){},querySelector(){return {addEventListener(){}};}},URL,URLSearchParams,Map,Set,BigInt,setInterval(){},setTimeout(){},clearTimeout(){},location:{hash:'#/concepts'},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}};
  context.history={replaceState(_state,_title,hash){context.location.hash=hash;}};
  vm.createContext(context);
  for(const file of ['data.js','language-data.js','prep-content.js','concept-content.js','concept-availability.js','public-app.js'])vm.runInContext(readFileSync(new URL('../dist/'+file,import.meta.url),'utf8'),context);
  context.window.PrepPilotUI={prepareBase:items=>items,materialize:item=>item};
  context.detailedCodingQuestion=item=>item.question;
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').split('window.PrepPilotUI.install();')[0];
  vm.runInContext(app,context);
  return {context,run:source=>vm.runInContext(source,context)};
}

test('all 27 concepts are classified and every language edition has official versioned sources',()=>{
  const {context,run}=workspace(),registry=context.window.ConceptAvailability.entries;
  const originals=run("baseData.filter(item=>item.type==='concept')");
  assert.equal(originals.length,27);assert.equal(Object.keys(registry).length,27);
  for(const original of originals){
    const entry=registry[original.id];assert(entry,original.id);
    if(entry.kind==='independent'){assert.equal(original.language,'text');assert.equal(entry.editions,undefined);continue;}
    assert.deepEqual(Object.keys(entry.editions),['java','python']);
    for(const [language,edition] of Object.entries(entry.editions)){
      assert.equal(edition.status,'reviewed');assert.equal(edition.reviewed,'2026-11-19');assert(edition.sources.length>0);
      for(const source of edition.sources){assert.equal(new URL(source.url).hostname,language==='java'?'docs.oracle.com':'docs.python.org');assert(source.title.length>5);}
    }
  }
});
test('an unavailable, unknown or wrongly translated concept never falls back to Java',()=>{
  const {context,run}=workspace(),availability=context.window.ConceptAvailability,original=run("baseData.find(item=>item.id==='1-06-streams-pipelines-filtering-mapping-and-ordering')");
  assert.equal(availability.materialize(original,'python',undefined),null);
  assert.equal(availability.materialize(original,'python',original),null);
  assert.equal(availability.materialize(original,'typescript',undefined),null);
  assert.equal(availability.materialize({...original,id:'unreviewed-concept'},'java'),null);
  assert.equal(availability.materialize(undefined,'java'),null);
});
test('all twenty reviewed language editions have matching authored content and native method tables',()=>{
  const {context,run}=workspace(),availability=context.window.ConceptAvailability;
  for(const original of run("baseData.filter(item=>item.type==='concept'&&item.language==='java')")){
    for(const language of ['java','python']){
      const variant=context.window.PREP_LANGUAGES?.[language]?.[original.id]||context.window.LANGUAGE_CONTENT?.[language]?.[original.id];
      const item=availability.materialize(original,language,variant);
      assert(item,original.id+' '+language);assert.equal(item.language,language);assert.equal(item.conceptKind,'language');
      if(language==='python'){
        const tables=[...item.html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)].map(match=>match[1]).join(' ');
        assert(!/BigDecimal|ConcurrentHashMap|AtomicLong|CompletableFuture|ThreadLocal|Collectors\./.test(tables),original.id);
        assert(!/<span>java<\/span>/.test(item.html),original.id);
      }
    }
  }
});
test('draft editions and editions without official versioned evidence are excluded',()=>{
  const {context,run}=workspace(),availability=context.window.ConceptAvailability,original=run("baseData.find(item=>item.id.startsWith('1-06'))"),variant=context.window.LANGUAGE_CONTENT.python[original.id],edition=availability.entries[original.id].editions.python;
  edition.status='draft';assert.equal(availability.materialize(original,'python',variant),null);
  edition.status='reviewed';edition.sources=[{title:'Unofficial explanation',url:'https://example.com/python'}];assert.equal(availability.materialize(original,'python',variant),null);
  edition.sources=[{title:'Spoofed official host',url:'https://docs.python.org.example.com/3.9/library/itertools.html'}];assert.equal(availability.materialize(original,'python',variant),null);
});
test('Python catalogues show native concepts and filters, with neutral topics kept distinct',()=>{
  const {run}=workspace();
  run("location.hash='#/concepts?language=python';syncLanguage(route());");
  assert.equal(run("concepts.filter(item=>item.programming).length"),10);
  assert.equal(run("concepts.filter(item=>!item.programming).length"),17);
  assert.equal(run("concepts.filter(item=>item.programming).every(item=>item.language==='python')"),true);
  assert.equal(run("concepts.find(item=>item.id.startsWith('1-06')).category"),'Pipelines');
  assert.equal(run("concepts.find(item=>item.id.startsWith('1-03')).title"),'Decimal arithmetic and rounding');
  const filters=run('toolbar()');assert(!filters.includes('Core Java'));assert(!filters.includes('>Streams<'));assert(filters.includes('Pipelines'));
  const html=run('conceptView()');assert(html.includes('10 Python lessons'));assert(html.includes('data-concept-group="language"'));assert(html.includes('Language-independent concepts (17)'));assert(!html.includes('BigDecimal financial arithmetic'));
});
test('global language choices refresh concepts even when the lab already uses that language',()=>{
  const {run}=workspace();
  run("location.hash='#/concepts?language=python';syncLanguage(route());");
  assert.equal(run('state.language'),'java');
  run("location.hash='#/round/coding?tab=questions&language=java';syncLanguage(route());");
  assert.equal(run('state.conceptLanguage'),'java');
  assert.equal(run("concepts.find(item=>item.id.startsWith('1-06')).category"),'Streams');
  run("location.hash='#/round/coding?tab=questions&language=python';syncLanguage(route());");
  assert.equal(run('state.conceptLanguage'),'python');assert(!run('toolbar()').includes('Core Java'));
});
test('legacy unsupported URLs normalize while concept and practice drafts keep their language',()=>{
  const {run}=workspace();
  run("location.hash='#/lab?language=typescript';syncLanguage(route());location.hash='#/concepts?language=typescript';syncLanguage(route());");
  assert.equal(run('state.language'),'typescript');assert.equal(run('state.conceptLanguage'),'java');assert(run('location.hash').includes('language=java'));
});
