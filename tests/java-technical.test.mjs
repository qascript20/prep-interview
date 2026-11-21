import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('Java oral questions stay in the Technical Round and never become another language or live-coding exercise',()=>{
  const content={window:{PREP_CONTENT:{items:[]}}};vm.createContext(content);
  vm.runInContext(readFileSync(new URL('../dist/java-technical-content.js',import.meta.url),'utf8'),content);
  const items=content.window.PREP_CONTENT.items;
  assert.equal(items.length,7);
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  const materialize=app.slice(app.indexOf('function materializeLanguage()'),app.indexOf('data=materializeLanguage();'));
  for(const language of ['java','python','javascript','typescript']){
    const screen={window:{PrepPilotUI:{materialize:item=>item}},baseData:items,currentLanguage:language,state:{conceptLanguage:'java'},detailedCodingQuestion(){throw new Error('Oral questions must not become live coding.');}};
    vm.createContext(screen);vm.runInContext(materialize,screen);
    const visible=screen.materializeLanguage();
    assert.equal(visible.length,language==='java'?7:0,language);
    for(const item of visible){assert.equal(item.programming,false);assert.deepEqual([...item.rounds],['technical']);assert.equal(item.contentLanguage,'java');}
  }
});
