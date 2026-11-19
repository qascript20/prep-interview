import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../dist/road-motion.js',import.meta.url),'utf8');
function fixture(reduced=false){
  const frames=new Map(),events={},preference={matches:reduced,addEventListener:(_,fn)=>{preference.change=fn;}};
  let serial=0,current=null;
  const classes=()=>{const values=new Set();return {add:value=>values.add(value),remove:value=>values.delete(value),contains:value=>values.has(value)};};
  const attr=()=>({attributes:{},setAttribute(name,value){this.attributes[name]=value;}});
  const document={hidden:false,querySelector:()=>current,addEventListener:(name,fn)=>{events[name]=fn;}};
  const window={matchMedia:()=>preference,requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id)};
  const context={window,document};vm.createContext(context);vm.runInContext(source,context);
  function show(position){
    const button={},note={};
    const canvases=[false,true].map(mobile=>{
      const pointer=attr(),bubble={...attr(),querySelector:()=>pointer};
      const marker={...attr(),dataset:{fraction:String(position>=6?1:position%1)},querySelector:()=>bubble};
      const paths=Array.from({length:6},(_,index)=>({getTotalLength:()=>100,getPointAtLength:distance=>({x:index*100+distance,y:mobile?index*150+distance:310})}));
      return {dataset:{roadIndex:String(Math.min(5,Math.floor(position)))},classList:{contains:name=>!mobile&&name==='road-canvas-desktop'},querySelector:()=>marker,querySelectorAll:()=>paths,marker};
    });
    current={isConnected:true,classList:classes(),offsetWidth:1200,canvases,button,note,querySelectorAll:()=>canvases,querySelector:selector=>selector==='[data-road-replay]'?button:note};
    return current;
  }
  function advance(now){const callbacks=[...frames.values()];frames.clear();for(const fn of callbacks)fn(now);}
  return {api:window.PrepRoadMotion,show,frames,advance,preference,document,events,leave(){current=null;}};
}

test('reduced motion shows the exact recorded position in both layouts without starting animation',()=>{
  const f=fixture(true),road=f.show(2.5);f.api.mount({scope:'java'});
  assert.equal(f.frames.size,0);assert.equal(road.button.disabled,true);assert.equal(road.note.hidden,false);
  assert.equal(road.canvases[0].marker.attributes.transform,'translate(250 310)');
  assert.equal(road.canvases[1].marker.attributes.transform,'translate(250 350)');
  f.api.replay();assert.equal(f.frames.size,0);
});
test('changed progress animates from its previous position and stops at the recorded target',()=>{
  const f=fixture();f.show(1);f.api.mount({scope:'java'});
  const road=f.show(2.5);f.api.mount({scope:'java'});assert.equal(road.canvases[0].marker.attributes.transform,'translate(100 310)');
  f.advance(0);f.advance(700);
  const midway=Number(road.canvases[0].marker.attributes.transform.match(/translate\(([^ ]+)/)[1]);
  assert(midway>100&&midway<250);
  f.advance(3000);assert.equal(road.canvases[0].marker.attributes.transform,'translate(250 310)');
  assert.equal(f.frames.size,0);assert.equal(road.classList.contains('road-is-walking'),false);
});
test('replay travels only to the saved position and never changes the target or invents completion',()=>{
  const f=fixture(),road=f.show(.5);f.api.mount({scope:'java'});f.api.replay();
  assert.equal(road.canvases[0].marker.attributes.transform,'translate(0 310)');f.advance(0);f.advance(3000);
  assert.equal(road.canvases[0].marker.attributes.transform,'translate(50 310)');
  assert.equal(road.canvases[0].marker.dataset.fraction,'0.5');
  const start=f.show(0);f.api.mount({scope:'new-user'});f.api.replay();assert.equal(f.frames.size,0);
  assert.equal(start.canvases[0].marker.attributes.transform,'translate(0 310)');
});
test('reduced motion and hidden tabs stop running frames at the correct final position',()=>{
  for(const reason of ['reduced','hidden']){
    const f=fixture(),road=f.show(6);f.api.mount({scope:'java'});f.api.replay();f.advance(0);assert.equal(f.frames.size,1);
    if(reason==='reduced'){f.preference.matches=true;f.preference.change();}else{f.document.hidden=true;f.events.visibilitychange();}
    assert.equal(f.frames.size,0);assert.equal(road.canvases[0].marker.attributes.transform,'translate(600 310)');
    assert.equal(road.classList.contains('road-entering'),false);
  }
});
test('leaving the page cancels animation and another profile does not inherit the previous marker',()=>{
  const f=fixture();f.show(4);f.api.mount({scope:'first'});f.api.replay();f.advance(0);
  f.leave();f.api.mount({scope:'first'});assert.equal(f.frames.size,0);
  const other=f.show(.5);f.api.mount({scope:'second'});assert.equal(f.frames.size,0);
  assert.equal(other.canvases[0].marker.attributes.transform,'translate(50 310)');
});
