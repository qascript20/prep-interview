'use strict';
window.PrepRoadMotion=(()=>{
  const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const remembered=new Map();
  let active=null;
  const reduced=()=>preference?.matches===true;

  // Position is measured in milestones (0–6), so the same progress follows
  // either the horizontal or vertical SVG without moving labels or links.
  function place(canvas,position){
    const segments=canvas.querySelectorAll('[data-road-segment]');
    const index=Math.min(Math.floor(position),segments.length-1);
    const path=segments[index],marker=canvas.querySelector('[data-road-marker]');
    if(!path||!marker)return;
    const fraction=position>=segments.length?1:position-index;
    const point=path.getPointAtLength(path.getTotalLength()*fraction);
    marker.setAttribute('transform',`translate(${point.x} ${point.y})`);
    const bubble=marker.querySelector('.road-user-bubble');
    const below=canvas.classList.contains('road-canvas-desktop')&&point.y<235;
    bubble?.setAttribute('transform',below?'translate(0 126)':'');
    bubble?.querySelector('path')?.setAttribute('d',below?'m-6-76 6-8 6 8':'m-6-47 6 8 6-8');
  }
  function positionAt(run,position){
    run.position=position;
    for(const canvas of run.canvases)place(canvas,position);
  }
  function motionControls(run){
    const off=reduced(),button=run.section.querySelector('[data-road-replay]');
    if(button){button.disabled=off;button.title=off?'Your device has reduced motion enabled.':'Replay the road to your recorded position';}
    const note=run.section.querySelector('[data-road-motion-note]');
    if(note)note.hidden=!off;
  }
  function stop(run,finish=false){
    if(!run)return;
    if(run.frame!==null)window.cancelAnimationFrame(run.frame);
    run.frame=null;
    run.observer?.disconnect();
    run.observer=null;
    run.section.classList.remove('road-is-walking');
    if(finish){run.section.classList.remove('road-entering');positionAt(run,run.target);}
  }
  function play(run,from){
    stop(run);
    run.started=true;
    motionControls(run);
    if(reduced()||document.hidden){stop(run,true);return;}
    run.section.classList.remove('road-entering');
    // Restart the short, finite entrance sequence on explicit replay.
    void run.section.offsetWidth;
    run.section.classList.add('road-entering');
    if(from===run.target){positionAt(run,run.target);return;}
    positionAt(run,from);
    run.section.classList.add('road-is-walking');
    const duration=Math.min(2600,900+Math.abs(run.target-from)*280);
    let started=null;
    function tick(now){
      if(active!==run)return;
      if(!run.section.isConnected||document.hidden||reduced()){stop(run,true);return;}
      started??=now;
      const fraction=Math.min(1,(now-started)/duration);
      const eased=fraction*fraction*(3-2*fraction);
      positionAt(run,from+(run.target-from)*eased);
      if(fraction<1)run.frame=window.requestAnimationFrame(tick);
      else{run.frame=null;run.section.classList.remove('road-is-walking');positionAt(run,run.target);}
    }
    run.frame=window.requestAnimationFrame(tick);
  }
  function mount({scope}={}){
    const section=document.querySelector('.progress-road');
    if(active?.section===section){motionControls(active);return;}
    const previous=active?.scope===scope?active.position:remembered.get(scope);
    const sameView=!!active&&active.scope===scope,hadStarted=active?.started===true;
    stop(active);
    active=null;
    if(!section)return;
    const canvases=[...section.querySelectorAll('.progress-road-canvas')];
    const first=canvases[0],marker=first?.querySelector('[data-road-marker]');
    if(!marker)return;
    const target=Number(first.dataset.roadIndex)+Number(marker.dataset.fraction);
    const run={section,canvases,scope,target,position:target,frame:null,observer:null,started:false};
    active=run;
    remembered.set(scope,target);
    motionControls(run);
    positionAt(run,target);
    if(reduced()||document.hidden)return;
    const from=Number.isFinite(previous)?previous:target;
    // Evidence loading can replace the view. Do not restart the reveal on
    // unchanged progress or turn that refresh into an artificial journey.
    if(sameView&&from===target&&hadStarted){run.started=true;return;}
    if(window.IntersectionObserver){
      run.observer=new window.IntersectionObserver(entries=>{
        if(active!==run||!entries.some(entry=>entry.isIntersecting))return;
        run.observer?.disconnect();run.observer=null;play(run,from);
      },{threshold:.12});
      run.observer.observe(section);
    }else play(run,from);
  }
  function replay(){if(active)play(active,0);}
  preference?.addEventListener?.('change',()=>{if(active){motionControls(active);if(reduced())stop(active,true);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stop(active,true);});
  return {mount,replay};
})();
