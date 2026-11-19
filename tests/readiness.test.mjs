import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context={window:{}};vm.createContext(context);vm.runInContext(readFileSync(new URL('../dist/journey-model.js',import.meta.url),'utf8'),context);
const model=context.window.PrepJourneyModel;
const catalogue=JSON.parse(readFileSync(new URL('../content/catalogue.json',import.meta.url),'utf8')).map(p=>({...p,testCount:p.format==='testing'?p.mutants.length:p.tests.length}));
const p=model.profile();
function fullEvidence(profile=p,includeMock=true){
  const evidence={reviewed:[],reflections:{},attempts:[],catalogue,historyState:'ready',readiness:{}};
  for(const task of model.curriculum(profile).flatMap(stage=>stage.tasks)){
    if(task.kind==='concept')evidence.reviewed.push(task.independent||profile.language==='java'?task.id:task.id+'::'+profile.language);
    else if(task.kind==='coding'&&profile.language==='java'){
      const spec=catalogue.find(item=>item.id===task.id);
      evidence.attempts.push({problem_id:task.id,problem_version:spec.version,language:'java',mode:'check',status:'completed',result:{passed:spec.testCount,total:spec.testCount},assistance:{hints:0,answerViewed:false,solutionLoaded:false,externalHelp:false}});
    }else evidence.reflections[model.reflectionKey(profile,task)]={note:'I rehearsed the decision with a concrete case and identified a useful follow-up.',reviewed:true};
  }
  if(includeMock)evidence.readiness[model.readinessKey(profile,catalogue)]={checks:[...model.mockChecks],strengths:'I explained the concrete example, its assumptions and the output clearly.',improvements:'I will practise a boundary case and a follow-up about operational failure.',confirmed:true,recordedAt:'2026-11-19T10:30:00Z'};
  return evidence;
}
test('the current progress marker uses recorded work rather than the chosen starting level',()=>{
  const advanced=model.profile({level:'advanced'}),path=model.curriculum(advanced),result=model.progress(advanced,path,{catalogue,historyState:'ready'});
  assert.equal(result.current,'foundations');assert.equal(result.done,0);assert.equal(result.state,'not_started');assert.equal(result.ready,false);
});
test('recording one complete stage moves the actual marker to the next gap',()=>{
  const path=model.curriculum(p),evidence=fullEvidence(p,false);evidence.reviewed=path[0].tasks.map(task=>task.id);evidence.reflections={};evidence.attempts=[];
  const result=model.progress(p,path,evidence);assert.equal(result.current,'guided');assert.equal(result.milestones[0].complete,true);assert.equal(result.done,4);
});
test('later activity stays visible without skipping an earlier missing foundation',()=>{
  const evidence=fullEvidence(p,false);evidence.reviewed=evidence.reviewed.filter(id=>!id.startsWith('1-01'));
  const result=model.progress(p,model.curriculum(p),evidence);assert.equal(result.current,'foundations');assert.equal(result.milestones[2].complete,true);assert.equal(result.ready,false);
});
test('all learning milestones unlock the full mock checkpoint, not automatic readiness',()=>{
  const result=model.progress(p,model.curriculum(p),fullEvidence(p,false));assert.equal(result.practiceComplete,true);assert.equal(result.state,'mock_ready');assert.equal(result.current,'interview');assert.equal(result.ready,false);assert.equal(result.criteriaMet,5);
});
test('the interview-ready state requires full evidence and the explicit five-round mock record',()=>{
  const result=model.progress(p,model.curriculum(p),fullEvidence());assert.equal(result.ready,true);assert.equal(result.state,'ready');assert.equal(result.criteriaMet,6);assert.equal(result.sessions,0);assert(result.checked>0);
});
test('mock drafts, missing rounds, missing confirmation and empty reflections cannot qualify',()=>{
  const evidence=fullEvidence(),record=evidence.readiness[model.readinessKey(p,catalogue)];
  for(const patch of [{confirmed:false},{checks:model.mockChecks.slice(1)},{strengths:' '.repeat(80)},{improvements:'short'},{recordedAt:null}])assert.equal(model.validMock({...record,...patch}),false,JSON.stringify(patch));
});
test('an early completed mock never compensates for unfinished coding or reviewed concepts',()=>{
  const evidence=fullEvidence();evidence.attempts=[];evidence.reviewed=[];
  const result=model.progress(p,model.curriculum(p),evidence);assert.equal(result.mockComplete,true);assert.equal(result.ready,false);assert(result.gaps.length>0);
});
test('sample runs, wrong versions and assisted independent checks block readiness',()=>{
  for(const patch of [{mode:'samples'},{problem_version:'older-version'},{assistance:{hints:1,answerViewed:false,solutionLoaded:false,externalHelp:false}}]){
    const evidence=fullEvidence(),id=model.curriculum(p)[2].tasks[0].id;evidence.attempts=evidence.attempts.map(attempt=>attempt.problem_id===id?{...attempt,...patch}:attempt);
    assert.equal(model.progress(p,model.curriculum(p),evidence).ready,false,JSON.stringify(patch));
  }
});
test('unavailable or refreshing execution history cannot produce an interview-ready claim',()=>{
  for(const historyState of ['loading','unavailable',undefined]){
    const result=model.progress(p,model.curriculum(p),{...fullEvidence(),historyState});assert.equal(result.ready,false);assert.equal(result.historyKnown,false);
  }
});
test('missing curriculum editions or grading metadata cannot silently reduce the target',()=>{
  const path=model.curriculum(p);path[0].tasks=path[0].tasks.slice(1);
  const result=model.progress(p,path,fullEvidence());assert.equal(result.ready,false);assert.equal(result.state,'review_needed');assert.equal(result.missing.length,1);
  assert.equal(model.progress(p,model.curriculum(p),{...fullEvidence(),catalogue:[]}).ready,false);
});
test('readiness is scoped to language, role, domain and current problem contracts',()=>{
  const key=model.readinessKey(p,catalogue);
  assert.equal(key,model.readinessKey({...p,level:'advanced',minutes:60},catalogue));
  for(const patch of [{language:'python'},{role:'qa-sdet'},{domain:'Cloud'}])assert.notEqual(key,model.readinessKey({...p,...patch},catalogue));
  const changed=catalogue.map((item,index)=>index===0?{...item,version:'new-contract'}:item);assert.notEqual(key,model.readinessKey(p,changed));
});
test('Python readiness remains explicitly self-assessed and does not inherit Java grades',()=>{
  const python=model.profile({language:'python'}),evidence=fullEvidence(python),result=model.progress(python,model.curriculum(python),evidence);
  assert.equal(result.ready,true);assert(result.label.includes('self-assessed'));assert.equal(result.checked,0);
  evidence.reflections={};evidence.attempts=fullEvidence().attempts;assert.equal(model.progress(python,model.curriculum(python),evidence).ready,false);
});
test('remaining sessions derive from the actual remaining task estimates and chosen pace',()=>{
  const result=model.progress(p,model.curriculum(p),{catalogue,historyState:'ready'}),expected=model.curriculum(p).flatMap(stage=>stage.tasks).reduce((sum,task)=>sum+task.minutes,45);
  assert.equal(result.remainingMinutes,expected);assert.equal(result.sessions,Math.ceil(expected/p.minutes));
});
test('every supported role/domain/language can meet the same transparent checkpoint policy',()=>{
  for(const language of ['java','python'])for(const role of model.roles)for(const domain of model.domains){const profile=model.profile({language,role,domain}),result=model.progress(profile,model.curriculum(profile),fullEvidence(profile));assert.equal(result.ready,true,`${language}/${role}/${domain}`);}
});
test('the road starts before the first milestone and advances within the real current stage',()=>{
  const evidence={catalogue,historyState:'ready',reviewed:[]},path=model.curriculum(p);
  let position=model.roadPosition(model.progress(p,path,evidence));assert.equal(position.index,0);assert.equal(position.fraction,0);
  evidence.reviewed=path[0].tasks.slice(0,2).map(task=>task.id);position=model.roadPosition(model.progress(p,path,evidence));assert.equal(position.index,0);assert.equal(position.fraction,.5);
  evidence.reviewed=path[0].tasks.map(task=>task.id);position=model.roadPosition(model.progress(p,path,evidence));assert.equal(position.index,1);assert.equal(position.fraction,0);assert.equal(position.segments[0],1);
});
test('the road reaches the interview target only when readiness is confirmed',()=>{
  let position=model.roadPosition(model.progress(p,model.curriculum(p),fullEvidence(p,false)));assert.equal(position.index,5);assert.equal(position.fraction,0);
  position=model.roadPosition(model.progress(p,model.curriculum(p),fullEvidence()));assert.equal(position.index,5);assert.equal(position.fraction,1);assert(position.segments.every(value=>value===1));
  position=model.roadPosition(model.progress(p,model.curriculum(p),{...fullEvidence(),historyState:'unavailable'}));assert.equal(position.fraction,0);
});
