'use strict';
window.InterviewStudio=(()=>{
  let availability=null,loadedWorkspace=null,loading=false,loadError=false,generation=0,run=null;
  const isRoute=()=>['studio','rounds'].includes(route().path);
  const micIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg>';
  const options=(values,selected)=>values.map(([value,label])=>`<option value="${esc(value)}" ${value===selected?'selected':''}>${esc(label)}</option>`).join('');
  function defaults(){
    const old={...(state.studioSetup||{})},journey=state.learningJourney||{};const requested=Object.fromEntries(route().query);for(const key of ['role','round','domain','language','company','focus'])if(requested[key])old[key]=requested[key];
    return {role:roleConfig.some(role=>role.id===old.role)?old.role:roleConfig.some(role=>role.id===journey.role)?journey.role:'software-engineer',round:roundConfig.some(round=>round.id===old.round)?old.round:'technical',domain:domains.includes(old.domain)?old.domain:domains.includes(journey.domain)?journey.domain:'Investment Banking',language:Object.hasOwn(languageConfig,old.language)?old.language:currentLanguage,level:['intermediate','senior','lead'].includes(old.level)?old.level:'senior',minutes:[5,8].includes(Number(old.minutes))?Number(old.minutes):5,mode:old.mode==='voice'?'voice':'text',company:typeof (old.company??journey.company)==='string'?(old.company??journey.company).slice(0,120):'',focus:typeof old.focus==='string'?old.focus.slice(0,400):''};
  }
  function notice(){
    if(loadError)return {title:'Connection unavailable',text:'We could not check the interview service. Your practice materials are still available. Refresh the connection to try again.'};
    if(!availability)return {title:'Checking the connection',text:'Choose your interview settings while we check the AI interviewer.'};
    if(!availability.enabled)return {title:'Live interviews are not connected yet',text:'You can choose your interview settings. Starting a session becomes available once the site’s Gemini connection is enabled.'};
    if(!availability.eligible)return {title:'Pilot invitation required',text:'Live AI interviews are available to invited pilot accounts. Open your pilot account to sign in or join.'};
    if(!availability.capacityAvailable||availability.remaining===0)return {title:'Interview allowance reached',text:'Live sessions are paused for the current allowance. Learn and Practice remain available.'};
    return {title:'Gemini is configured for interviews',text:`${availability.remaining} of ${availability.weeklyLimit} sessions available in your rolling seven-day allowance. Each session lasts up to eight minutes.`};
  }
  const canStart=()=>!!availability?.enabled&&availability.eligible&&availability.capacityAvailable&&availability.remaining>0;
  function setupForm(){const p=defaults(),active=run&&!run.closed;return `<form id="studio-setup" class="studio-setup"><fieldset ${active?'disabled':''}><legend>Shape your interview</legend><div class="studio-fields"><label>Target role<select name="role">${options(roleConfig.map(role=>[role.id,role.name]),p.role)}</select></label><label>Interview round<select name="round">${options(roundConfig.map(round=>[round.id,round.name]),p.round)}</select></label><label>Domain<select name="domain">${options(domains.map(domain=>[domain,domain]),p.domain)}</select></label><label>Experience level<select name="level">${options([['intermediate','Intermediate'],['senior','Senior'],['lead','Lead / Director']],p.level)}</select></label><label>Programming language<select name="language">${options(Object.entries(languageConfig).map(([id,value])=>[id,value.name]),p.language)}</select></label><label>Session length<select name="minutes">${options([['5','5 minutes'],['8','8 minutes']],String(p.minutes))}</select></label></div><label class="studio-focus">Target company (optional)<input name="company" maxlength="120" value="${esc(p.company)}" placeholder="For example: SMBC, Barclays or a company of your choice"></label><label class="studio-focus">Optional topic focus<input name="focus" maxlength="400" value="${esc(p.focus)}" placeholder="For example: Java collections, API testing or release risk"></label><fieldset class="studio-mode"><legend>How would you like to answer?</legend><label><input type="radio" name="mode" value="text" ${p.mode==='text'?'checked':''}><span><strong>Type your answers</strong><small>Read the interviewer’s questions and reply in text.</small></span></label><label><input type="radio" name="mode" value="voice" ${p.mode==='voice'?'checked':''}><span><strong>Speak your answers</strong><small>Use push-to-talk, with spoken questions and a transcript.</small></span></label></fieldset><label class="studio-consent"><input type="checkbox" name="consent" required><span>I understand that my answers, and microphone audio when I choose to speak, are sent to Google Gemini for this practice session.</span></label><p class="studio-data-note">This website does not store your interview audio or transcript. Avoid confidential employer information. A transcript is kept on this page until you leave; download it if you want a copy. <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer">Google’s API data terms</a></p><button class="button primary large" type="submit" ${!canStart()?'disabled':''}>Start interview</button></fieldset></form>`;}
  function sessionPanel(){
    if(!run)return `<section class="studio-room studio-room-empty"><div class="studio-interviewer"><span class="studio-orb">${micIcon}</span><span>AI INTERVIEWER</span><h2>A conversation that starts with your role.</h2><p>Your interviewer asks the first question, listens to your answer and follows up. You can switch between text and voice during the session.</p></div><div class="studio-empty-steps"><p><strong>Choose your setting.</strong> Pick a role, round and level.</p><p><strong>Answer one question at a time.</strong> Clarify, think aloud and give a concrete example.</p><p><strong>Reflect at the end.</strong> Ask for an AI-generated practice summary and next steps.</p></div><p class="studio-feedback-note">Practice feedback is advisory. It does not certify readiness or predict a hiring decision.</p></section>`;
    const p=run.selection,role=roleConfig.find(role=>role.id===p.role),round=roundConfig.find(round=>round.id===p.round);
    return `<section class="studio-room studio-live-room"><header class="studio-session-heading"><div><span class="studio-eyebrow">AI INTERVIEWER · GOOGLE GEMINI</span><h2>${esc(role.name)}</h2><p>${esc(round.name)} · ${esc(p.domain)}${p.company?' · '+esc(p.company):''} · ${p.minutes} minutes</p></div><span class="studio-session-badge" data-studio-status></span></header><p class="studio-session-message" data-studio-message role="status"></p><div class="studio-transcript" data-studio-transcript role="log" aria-label="Interview transcript" aria-relevant="additions text"></div><div class="studio-response"><div class="studio-response-tools"><button class="button small" data-studio-mic>${micIcon}<span>Start speaking</span></button><button class="button small" data-studio-sound>Spoken questions off</button><button class="button small" data-studio-repeat>Repeat question</button></div><form id="studio-answer-form"><label for="studio-answer">Your answer</label><textarea id="studio-answer" rows="4" maxlength="6000" placeholder="Type your answer, or choose Start speaking…">${esc(run.draft||'')}</textarea><div class="studio-send-row"><small data-studio-answer-help>Take a moment to think. Send your answer when you’re ready.</small><button class="button primary" type="submit" data-studio-send>Send answer</button></div></form></div><footer class="studio-session-footer"><button class="button" data-studio-finish>Finish & get feedback</button><button class="button quiet" data-studio-stop>End now</button><button class="button quiet" data-studio-download>Download transcript</button>${run.closed?'<button class="button primary" data-studio-new>Set up another interview</button>':''}</footer>${run.closed?`<form id="studio-reflection-form" class="studio-reflection"><label for="studio-reflection">What will you practise next?</label><textarea id="studio-reflection" rows="3" minlength="20" maxlength="3000" required placeholder="Write your own reflection: what worked, what needs practice and why…"></textarea><p>Save your own note in this browser and explicitly record this round as self-reviewed. This is separate from Gemini’s feedback.</p><button class="button" type="submit">Save my rehearsal reflection</button><a class="button quiet" href="#/learn">Back to my track</a><span data-studio-reflection-status role="status"></span></form>`:''}<p class="studio-feedback-note">AI feedback may be incomplete or mistaken. It should refer to your actual answers; it is not an automated grade or hiring prediction.</p></section>`;
  }
  function page(){const status=notice();return `<div class="interview-studio"><header class="studio-hero"><div><span class="studio-eyebrow">A REAL CONVERSATION. ROOM TO PRACTISE.</span><h1>Interview Studio</h1><p>Meet your AI interviewer. Practise for the role you want, answer by text or voice, and work through realistic follow-up questions.</p></div><div class="studio-format-tags"><span>Role-based interviews</span><span>Text + voice</span><span>One question at a time</span></div></header><section class="studio-connection" data-connected="${canStart()}"><div><strong>${esc(status.title)}</strong><p>${esc(status.text)}</p></div><button class="button small" data-studio-refresh>Refresh connection</button>${availability?.enabled&&!availability.eligible?'<a class="button small" href="#/pilot">Open pilot account</a>':''}</section><div class="studio-layout">${setupForm()}${sessionPanel()}</div><section class="studio-guides"><div><span class="studio-eyebrow">BUILD CONFIDENCE BEFORE THE CONVERSATION</span><h2>Prepare for each interview round.</h2><p>Explore questions and answer approaches before starting your simulation.</p></div>${roundCards()}</section></div>`;}
  async function api(path,body,signal,workspace=state.pilotWorkspaceKey){
    const response=await fetch('/api/studio/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(workspace?{'X-PrepSpace-Workspace':workspace}:{})},...(body?{body:JSON.stringify(body)}:{}),signal,cache:'no-store'});
    const value=await response.json();if(!response.ok)throw new Error(value.error||'The interview service is unavailable.');return value;
  }
  async function mount(){
    if(!isRoute())return;
    await window.PrepPilotUI.ensureWorkspace();
    if(!isRoute())return;
    const key=state.pilotWorkspaceKey;
    if(loadedWorkspace===key||loading){paint();return;}
    const token=++generation;loading=true;loadError=false;loadedWorkspace=key;
    try{const result=await api('status');if(token===generation&&key===state.pilotWorkspaceKey)availability=result;}
    catch{if(token===generation){loadError=true;availability=null;}}
    finally{loading=false;if(token===generation&&isRoute())render();}
  }
  function transcriptHtml(){return run.messages.map(message=>`<article class="studio-message" data-speaker="${message.role}"><span>${message.role==='assistant'?'AI interviewer':'You'}${message.interrupted?' · interrupted':''}${message.failed?' · not sent':''}</span><p>${esc(message.text)}</p></article>`).join('')||'<div class="studio-waiting">Connecting to your interviewer. The first question will appear here after Gemini responds.</div>';}
  function paint(){
    if(!run)return;
    const root=document.querySelector('.studio-live-room');if(!root)return;
    const text=(selector,value)=>{const element=root.querySelector(selector);if(element)element.textContent=value;};
    text('[data-studio-status]',run.closed?'Session ended':run.listening?'Listening':run.ending?'Wrapping up':run.ready?'Connected':'Connecting');
    text('[data-studio-message]',run.message||'');
    const transcript=root.querySelector('[data-studio-transcript]');
    if(transcript){const nearBottom=transcript.scrollHeight-transcript.scrollTop-transcript.clientHeight<80;transcript.innerHTML=transcriptHtml();if(nearBottom)transcript.scrollTop=transcript.scrollHeight;}
    const unavailable=!run.ready||run.closed||run.ending;
    for(const selector of ['[data-studio-send]','[data-studio-repeat]']){const button=root.querySelector(selector);if(button)button.disabled=unavailable||run.listening||run.capturePending||run.stoppingCapture;}
    const microphone=root.querySelector('[data-studio-mic]');if(microphone){microphone.disabled=unavailable||run.capturePending||run.stoppingCapture;microphone.querySelector('span').textContent=run.listening?'Finish voice answer':run.capturePending?'Opening microphone…':'Start speaking';microphone.classList.toggle('is-listening',run.listening);microphone.setAttribute('aria-pressed',String(run.listening));}
    const sound=root.querySelector('[data-studio-sound]');if(sound){sound.textContent=run.sound?'Spoken questions on':'Spoken questions off';sound.setAttribute('aria-pressed',String(run.sound));sound.disabled=run.closed;}
    for(const selector of ['[data-studio-finish]','[data-studio-stop]']){const button=root.querySelector(selector);if(button)button.disabled=run.closed||(selector.includes('finish')&&unavailable);}
    text('[data-studio-answer-help]',run.closed?'The session has ended. Download the transcript before leaving.':run.listening?'Finish your voice answer before sending a typed answer.':'Take a moment to think. Send your answer when you’re ready.');
  }
  function mergeText(previous,delta){return previous&&delta.startsWith(previous)?delta:previous+delta;}
  function appendReply(target,text,role){
    if(!text)return;
    const field=role==='assistant'?'reply':'voiceReply';
    target[field]??={role,text:''};
    if(!target.messages.includes(target[field]))target.messages.push(target[field]);
    target[field].text=mergeText(target[field].text,String(text));
    if(target.messages.reduce((n,item)=>n+item.text.length,0)>60000)terminate(target,'The transcript limit was reached. You can download the recorded conversation.');
  }
  function kickoff(target){
    if(target.closed||target.started||!target.live||!target.ready)return;
    target.started=true;target.message='Your AI interviewer is preparing the first question.';
    try{target.live.sendClientContent({turns:[{role:'user',parts:[{text:'Start the selected practice interview now. Greet me briefly, ask your first relevant question, then wait for my answer.'}]}],turnComplete:true});}catch{terminate(target,'The interview connection closed before the first question.');}paint();
  }
  function onMessage(target,message){
    if(run!==target||target.closed)return;
    if(message.setupComplete){clearTimeout(target.handshake);target.ready=true;kickoff(target);}
    if(message.goAway){terminate(target,'The provider session is ending. Download your transcript; start a fresh session if your allowance permits.');return;}
    const content=message.serverContent;
    if(!content){paint();return;}
    if(content.interrupted){target.audio.stopPlayback();if(target.reply)target.reply.interrupted=true;target.reply=null;}
    if(content.inputTranscription?.text)appendReply(target,content.inputTranscription.text,'user');
    const transcript=content.outputTranscription?.text;
    if(transcript)appendReply(target,transcript,'assistant');
    for(const part of content.modelTurn?.parts||[]){
      if(!transcript&&part.text&&!part.thought)appendReply(target,part.text,'assistant');
      if(target.sound&&part.inlineData?.data)try{target.audio.play(part.inlineData.data,part.inlineData.mimeType);}catch{target.message='Spoken playback is unavailable. Continue with the written transcript.';}
    }
    if(transcript||content.modelTurn)target.message=target.ending?'Receiving your practice summary.':'Read or listen, then answer when you are ready.';
    if(content.generationComplete)target.generationComplete=true;
    if(content.turnComplete){target.reply=null;target.voiceReply=null;if(target.ending){terminate(target,'Interview finished. Review the AI practice summary and download your transcript.');return;}}
    paint();
  }
  async function start(form){
    if(run&&!run.closed)return;
    const data=Object.fromEntries(new FormData(form));data.minutes=Number(data.minutes);data.consent=data.consent==='on';data.requestId=crypto.randomUUID();
    if(!canStart()){toast(notice().text);return;}
    state.studioSetup={...data};delete state.studioSetup.consent;delete state.studioSetup.requestId;persist();
    const target={selection:data,workspace:state.pilotWorkspaceKey,sessionId:data.requestId,messages:[],draft:'',audio:new window.PrepStudioAudio(),sound:data.mode==='voice',ready:false,closed:false,ending:false,listening:false,capturePending:false,stoppingCapture:false,abort:new AbortController(),message:'Connecting to Gemini…'};run=target;
    if(target.sound)try{await target.audio.preparePlayback();}catch{target.sound=false;target.message='Spoken playback is unavailable. Text remains available.';}
    render();
    try{
      const details=await api('session',data,target.abort.signal,target.workspace);
      if(run!==target||target.closed){api('end',{sessionId:details.sessionId},undefined,target.workspace).catch(()=>{});return;}
      target.deadline=setTimeout(()=>finish(target),Math.max(0,Date.parse(details.expiresAt)-Date.now()-45000));
      target.expiry=setTimeout(()=>terminate(target,'The session time limit was reached. Download your transcript to review what was covered.'),Math.max(0,Date.parse(details.expiresAt)-Date.now()));
      target.handshake=setTimeout(()=>{if(!target.ready)terminate(target,'Gemini did not finish connecting. Check the provider configuration or try again.');},20000);
      const live=await window.PrepStudioTransport.connect(details,{onmessage:message=>onMessage(target,message),onerror:()=>terminate(target,'The live connection was interrupted. Your transcript is still on this page.'),onclose:()=>{if(!target.closed)terminate(target,'The live session closed. Your transcript remains available to download.');}});
      if(target.closed){live.close();return;}
      target.live=live;kickoff(target);paint();
    }catch(error){if(!target.closed)terminate(target,error.name==='AbortError'?'Interview cancelled.':'The AI interview could not connect. Check the provider setup or try again.');}
  }
  async function stopVoice(target,flush=true){
    if(target.stoppingCapture)return;
    target.stoppingCapture=true;paint();
    try{await target.audio.stopCapture(flush);if(target.listening&&!target.closed)target.live?.sendRealtimeInput({activityEnd:{}});}
    finally{target.listening=false;target.capturePending=false;target.stoppingCapture=false;paint();}
  }
  async function microphone(){
    const target=run;if(!target||!target.ready||target.closed||target.ending)return;
    if(target.listening){try{await stopVoice(target);}catch{terminate(target,'The voice connection ended. Your transcript remains on this page.');}return;}
    target.capturePending=true;target.audio.stopPlayback();paint();
    try{
      target.live.sendRealtimeInput({activityStart:{}});target.listening=true;
      const opened=await target.audio.startCapture(data=>{if(!target.closed&&target.listening)target.live.sendRealtimeInput({audio:{data,mimeType:'audio/pcm;rate=16000'}});});
      if(!opened||target.closed)return;
      target.message='Microphone on. Speak your answer, then choose Finish voice answer.';
    }catch{target.listening=false;try{target.live?.sendRealtimeInput({activityEnd:{}});}catch{}target.message='Microphone access was denied or unavailable. You can type your answer instead.';}
    finally{target.capturePending=false;paint();}
  }
  function send(text){
    const target=run;if(!target||target.closed||!target.ready||target.ending||target.listening||target.capturePending)return false;
    target.audio.stopPlayback();target.reply=null;target.voiceReply=null;const message={role:'user',text};target.messages.push(message);
    try{target.live.sendClientContent({turns:[{role:'user',parts:[{text}]}],turnComplete:true});target.message='Your interviewer is considering your answer.';paint();return true;}
    catch{message.failed=true;terminate(target,'Your answer could not be sent. The draft and transcript remain on this page.');return false;}
  }
  async function finish(target=run){
    if(!target||target.closed||target.ending)return;
    if(!target.ready){terminate(target,'Interview ended before connecting.');return;}
    try{await stopVoice(target);}catch{}if(target.closed)return;target.ending=true;target.generationComplete=false;target.audio.stopPlayback();target.reply=null;
    try{target.live.sendClientContent({turns:[{role:'user',parts:[{text:'Finish this practice interview now. Do not ask another question. Give the brief evidence-based practice summary described in your instructions, and identify anything we did not cover.'}]}],turnComplete:true});}catch{terminate(target,'The connection ended before a summary could be requested. Download the available transcript.');return;}
    target.message='Your interviewer is preparing a practice summary.';target.finishTimeout=setTimeout(()=>terminate(target,'The session ended before the complete summary arrived. Download the available transcript.'),40000);paint();
  }
  function terminate(target,message){
    if(!target||target.closed)return;
    target.closed=true;target.ready=false;target.message=message;target.abort?.abort();
    for(const name of ['deadline','expiry','handshake','finishTimeout'])clearTimeout(target[name]);
    target.audio.close().catch(()=>{});try{target.live?.close();}catch{}
    api('end',{sessionId:target.sessionId},undefined,target.workspace).catch(()=>{});
    if(run===target){loadedWorkspace=null;paint();if(isRoute())render();}
  }
  function beforeRender(){if(run&&(!isRoute()||run.workspace!==state.pilotWorkspaceKey)){const old=run;run=null;terminate(old,'Session closed.');}}
  document.addEventListener('submit',event=>{
    if(event.target.id==='studio-reflection-form'){event.preventDefault();if(!run?.closed||run.workspace!==state.pilotWorkspaceKey||!run.messages.some(message=>message.role==='user'&&!message.failed)){toast('A rehearsal reflection needs an interview answer first.');return;}const note=document.getElementById('studio-reflection').value.trim();if(note.length<20)return;const p=window.PrepJourneyModel.profile(run.selection),task=window.PrepJourneyModel.curriculum(p).find(stage=>stage.id==='mastery').tasks.find(task=>task.round===run.selection.round);state.journeyReflections??={};state.journeyReflections[window.PrepJourneyModel.reflectionKey(p,task)]={note:note.slice(0,3000),reviewed:true,updatedAt:new Date().toISOString()};const saved=persist();event.target.querySelector('[data-studio-reflection-status]').textContent=saved?'Your rehearsal self-review is recorded in your track.':'Storage is unavailable. Copy your reflection before leaving.';}
    if(event.target.id==='studio-setup'){event.preventDefault();start(event.target);}
    if(event.target.id==='studio-answer-form'){event.preventDefault();const field=document.getElementById('studio-answer'),text=field.value.trim();if(text&&text.length<=6000&&send(text)){run.draft='';field.value='';}}
  });
  document.addEventListener('input',event=>{if(event.target.id==='studio-answer'&&run)run.draft=event.target.value.slice(0,6000);});
  document.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.matches('[data-studio-refresh]')){generation++;loading=false;loadedWorkspace=null;availability=null;await window.PrepPilotUI.ensureWorkspace(true);render();}
    if(button.matches('[data-studio-mic]'))await microphone();
    if(button.matches('[data-studio-sound]')&&run&&!run.closed){run.sound=!run.sound;if(run.sound)try{await run.audio.preparePlayback();}catch{run.sound=false;run.message='Spoken playback is unavailable. Continue with text.';}else run.audio.stopPlayback();paint();}
    if(button.matches('[data-studio-repeat]'))send('Please repeat your current question without giving the answer.');
    if(button.matches('[data-studio-finish]'))finish();
    if(button.matches('[data-studio-stop]'))terminate(run,'You ended the interview. Download the transcript before leaving this page.');
    if(button.matches('[data-studio-new]')){run=null;loadedWorkspace=null;render();}
    if(button.matches('[data-studio-download]')&&run){const transcript={title:'PrepSpace Interview Studio',provider:'Google Gemini',selection:{...run.selection,consent:undefined,requestId:undefined},note:'AI-generated practice conversation, not a verified grade or hiring prediction.',messages:run.messages};const blob=new Blob([JSON.stringify(transcript,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='prepspace-interview-transcript.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&run&&!run.closed){run.audio.stopPlayback();if(run.listening||run.capturePending){run.message='The microphone was paused when you left the tab.';stopVoice(run,false).catch(()=>{});}}});
  window.addEventListener('pagehide',()=>{if(run&&!run.closed){run.audio.close();try{run.live?.close();}catch{}}});
  return {page,mount,beforeRender,mergeText};
})();
