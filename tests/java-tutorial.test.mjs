import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function fixture(){
  const listeners={};let renders=0;
  const c={window:{PREP_CONTENT:{items:[]},PrepPilotUI:{workspaceReady:()=>true}},state:{reviewed:[],drafts:{},javaTutorialChecks:{},javaTutorialProgress:{},conceptLanguage:'java'},document:{addEventListener:(name,fn)=>{listeners[name]=fn;},getElementById:()=>({focus(){}}),querySelector:()=>null},currentLanguage:'java',route:()=>({path:'learning'}),isConceptRoute:()=>true,esc:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),persist:()=>true,toast(){},render:()=>renders++,FormData:class{constructor(form){this.form=form;}get(){return this.form.choice;}}};
  vm.createContext(c);
  for(const file of ['java-technical-content.js','java-data-structures.js'])vm.runInContext(readFileSync(new URL('../dist/'+file,import.meta.url),'utf8'),c);
  c.baseData=c.window.PREP_CONTENT.items;
  vm.runInContext(readFileSync(new URL('../dist/java-tutorial.js',import.meta.url),'utf8'),c);
  return {c,listeners,get renders(){return renders;}};
}
test('the course covers the 23 real ordered lessons and distinguishes five custom structures from JDK types',()=>{
  const {c}=fixture(),course=c.window.JAVA_DATA_STRUCTURES_TUTORIAL;
  assert.equal(course.items.length,23);assert.equal(new Set(course.items).size,23);
  assert.equal(course.sections.length,6);
  const custom=[];
  for(const [index,id] of course.items.entries()){
    const item=c.baseData.find(item=>item.id===id);assert(item,id);assert.equal(item.tutorial.index,index);
    assert.equal(item.contentLanguage,'java');assert.equal(item.rounds.includes('coding'),false);
    assert(item.example.code.includes('public class Main'));assert(item.sources.length>0);
    assert.equal(item.tutorial.check.options.length,3);assert(item.tutorial.check.correct>=0&&item.tutorial.check.correct<3);
    if(item.tutorial.origin==='Custom implementation')custom.push(id);
  }
  assert.equal(custom.length,5);assert(custom.some(id=>id.endsWith('graphs')));assert(custom.some(id=>id.endsWith('range-queries')));
});
test('a checked answer never marks a lesson reviewed, and invalid or stale choices cannot qualify',()=>{
  const f=fixture(),{c}=f,item=c.baseData[0],api=c.window.JavaCollectionsTutorial;
  const submit=choice=>f.listeners.submit({target:{dataset:{tutorialQuiz:item.id},choice},preventDefault(){}});
  submit(null);assert.equal(Object.keys(c.state.javaTutorialChecks).length,0);
  submit('99');assert.equal(Object.keys(c.state.javaTutorialChecks).length,0);
  submit(String(item.tutorial.check.correct));assert.equal(api.checkRecord(item).choice,item.tutorial.check.correct);
  assert.equal(Object.keys(c.state.javaTutorialProgress).length,0);
  c.state.javaTutorialChecks[item.id].version=0;assert.equal(api.checkRecord(item),null);
});
test('lesson reviews are explicit, reversible and separate from old concept review records',()=>{
  const {c,listeners}=fixture(),item=c.baseData[0];
  const button={dataset:{tutorialReview:item.id}};
  const event={target:{closest:selector=>selector==='[data-tutorial-review]'?button:null}};
  listeners.click(event);assert.equal(c.state.javaTutorialProgress[item.id],item.tutorial.version);assert.equal(c.state.reviewed.length,0);
  listeners.click(event);assert.equal(c.state.javaTutorialProgress[item.id],undefined);
});
test('the Learn course has an honest non-Java state and does not write while identity is loading',()=>{
  const {c,listeners}=fixture();c.state.conceptLanguage='python';
  assert(c.window.JavaCollectionsTutorial.overview().includes('Open Java tutorial'));
  c.window.PrepPilotUI.workspaceReady=()=>false;
  const item=c.baseData[0];listeners.submit({target:{dataset:{tutorialQuiz:item.id},choice:'0'},preventDefault(){}});
  assert.equal(Object.keys(c.state.javaTutorialChecks).length,0);
});
