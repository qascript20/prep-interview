import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context={window:{}};vm.createContext(context);vm.runInContext(readFileSync(new URL('../dist/journey-model.js',import.meta.url),'utf8'),context);
const model=context.window.PrepJourneyModel,catalogue=JSON.parse(readFileSync(new URL('../content/catalogue.json',import.meta.url),'utf8')).map(p=>({...p,testCount:p.format==='testing'?p.mutants.length:p.tests.length}));
const p=model.profile(),stages=model.curriculum(p),task=stages[2].tasks[0],spec=catalogue.find(p=>p.id===task.id);
const attempt={problem_id:task.id,problem_version:spec.version,language:'java',mode:'check',status:'completed',result:{passed:spec.testCount,total:spec.testCount},assistance:{hints:0,answerViewed:false,solutionLoaded:false,externalHelp:false}};
test('a valid journey has five stages and all seven role paths produce a real discussion prompt',()=>{assert.equal(stages.length,5);for(const role of model.roles){const path=model.curriculum({...p,role});assert(path[3].tasks.some(t=>t.id==='role-'+role+'-technical'));assert.equal(path[4].tasks.length,5);}});
test('starting level changes the recommendation without inventing earlier completion',()=>{for(const level of Object.keys(model.levels)){const profile=model.profile({level}),path=model.curriculum(profile),next=model.recommend(path,profile,{});assert.equal(next.stage.id,model.levels[level].stage);assert(path[0].tasks.every(t=>!model.taskStatus(t,profile,{}).done));}});
test('only full current-version checks in the correct language count as checked coding',()=>{assert.equal(model.taskStatus(task,p,{catalogue,attempts:[attempt]}).done,true);for(const patch of [{mode:'samples'},{language:'python'},{problem_version:'old'},{status:'incorrect_output'},{result:{passed:1,total:1}}])assert.equal(model.taskStatus(task,p,{catalogue,attempts:[{...attempt,...patch}]}).done,false,JSON.stringify(patch));});
test('independent coding excludes recorded assistance and missing assistance records',()=>{for(const assistance of [undefined,{...attempt.assistance,hints:1},{...attempt.assistance,answerViewed:true},{...attempt.assistance,solutionLoaded:true},{...attempt.assistance,externalHelp:true}])assert.equal(model.taskStatus(task,p,{catalogue,attempts:[{...attempt,assistance}]}).done,false);const guided={...task,independent:false};assert.equal(model.taskStatus(guided,p,{catalogue,attempts:[{...attempt,assistance:{hints:1}}]}).done,true);});
test('Python practice never inherits a Java assessment pass',()=>{const python=model.profile({language:'python'});const result=model.taskStatus(task,python,{catalogue,attempts:[attempt]});assert.equal(result.done,false);assert.equal(result.source,'reflection');});
test('self-review requires a deliberate record and remains scoped to language, role and domain',()=>{const rehearsal=stages[4].tasks[0],key=model.reflectionKey(p,rehearsal),note='I used a concrete project example and clarified the outcome.';assert.equal(model.taskStatus(rehearsal,p,{reflections:{[key]:{note,reviewed:false}}}).done,false);assert.equal(model.taskStatus(rehearsal,p,{reflections:{[key]:{note:'short',reviewed:true}}}).done,false);const evidence={reflections:{[key]:{note,reviewed:true}}};assert.equal(model.taskStatus(rehearsal,p,evidence).done,true);for(const changed of [{language:'python'},{role:'qa-sdet'},{domain:'Cloud'}])assert.equal(model.taskStatus(rehearsal,{...p,...changed},evidence).done,false);});
test('concept reviews distinguish language editions and retain language-independent reviews',()=>{const python=model.profile({language:'python'}),concept=stages[0].tasks[0],common=stages[0].tasks[3];assert.equal(model.taskStatus(concept,python,{reviewed:[concept.id]}).done,false);assert.equal(model.taskStatus(concept,python,{reviewed:[concept.id+'::python']}).done,true);assert.equal(model.taskStatus(common,python,{reviewed:[common.id]}).done,true);});
test('input preferences normalize unsupported values and session allocations add up',()=>{const invalid=model.profile({level:'expert-guaranteed',language:'typescript',role:'unknown',domain:'unknown',minutes:1000});assert.equal(invalid.level,'beginner');assert.equal(invalid.language,'java');assert.equal(invalid.minutes,20);for(const minutes of [20,40,60])assert.equal(Object.values(model.session(minutes)).reduce((a,b)=>a+b),minutes);});
test('every role/domain path links to available content in its selected language',()=>{
  const content={window:{}};vm.createContext(content);for(const file of ['data.js','prep-content.js','language-data.js','concept-content.js','concept-availability.js'])vm.runInContext(readFileSync(new URL('../dist/'+file,import.meta.url),'utf8'),content);
  const items=[...content.window.STUDY_DATA.map(item=>({...item,...content.window.PREP_CONTENT.meta[item.id]})),...content.window.PREP_CONTENT.items];
  for(const language of ['java','python'])for(const role of model.roles)for(const domain of model.domains)for(const stage of model.curriculum({language,role,domain}))for(const task of stage.tasks){
    const item=items.find(item=>item.id===task.id);
    if(task.kind==='coding'&&language==='java'&&catalogue.some(p=>p.id===task.id))continue;
    assert(item,task.id);
    const variant=content.window.PREP_LANGUAGES?.[language]?.[task.id]||content.window.LANGUAGE_CONTENT?.[language]?.[task.id];
    if(task.kind==='concept')assert(content.window.ConceptAvailability.materialize(item,language,variant),task.id+' '+language);
    else if(task.kind==='coding')assert(variant?.language===language||item.language===language,task.id+' '+language);
  }
});
test('journey refresh rerenders after identity changes while evidence was loading',async()=>{
  let renders=0;const state={learningJourney:{...p},pilotWorkspaceKey:'workspace-a'};
  const screen={window:{PrepJourneyModel:model,PrepPilotUI:{workspaceReady:()=>true,learningAttempts:async()=>{state.pilotWorkspaceKey='workspace-b';delete state.learningJourney;return [];}}},state,document:{addEventListener(){},querySelector(){return null;}},route:()=>({path:'learn'}),render:()=>renders++};
  vm.createContext(screen);vm.runInContext(readFileSync(new URL('../dist/learning-journey.js',import.meta.url),'utf8'),screen);
  await screen.window.PrepJourney.mount();assert.equal(renders,1);assert.equal(state.learningJourney,undefined);
});
test('unavailable attempt history does not trigger an endless render/retry loop',async()=>{
  let requests=0,renders=0;const state={learningJourney:{...p},pilotWorkspaceKey:'workspace-a'};
  const screen={window:{PrepJourneyModel:model,PrepPilotUI:{workspaceReady:()=>true,learningAttempts:async()=>{requests++;throw new Error('offline');}}},state,document:{addEventListener(){},querySelector(){return null;}},route:()=>({path:'learn'}),render:()=>renders++};
  vm.createContext(screen);vm.runInContext(readFileSync(new URL('../dist/learning-journey.js',import.meta.url),'utf8'),screen);
  await screen.window.PrepJourney.mount();await screen.window.PrepJourney.mount();assert.equal(requests,1);assert.equal(renders,1);
  state.pilotWorkspaceKey='workspace-b';await screen.window.PrepJourney.mount();assert.equal(requests,2);
});
