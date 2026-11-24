'use strict';
window.InterviewStudio=(()=>{
  let availability=null,loadedWorkspace=null,loading=false,loadError=false,generation=0,run=null,setupDraft=null,setupWorkspace=null;
  const isRoute=()=>['home','studio'].includes(route().path);
  const micIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg>';
  const options=(values,selected)=>values.map(([value,label])=>`<option value="${esc(value)}" ${value===selected?'selected':''}>${esc(label)}</option>`).join('');
  const catalogue=window.INTERVIEW_OPTIONS||{roles:roleConfig,domains};
  const normaliseDomain=value=>typeof value==='string'?(catalogue.legacyDomainAliases?.[value]??value):value;
  const interviewerName=catalogue.interviewer?.name||'Nova';
  const portrait=variant=>`<img class="nova-avatar ${variant}" src="/nova-digital-interviewer.jpg?v=navy-20261124" width="160" height="160" alt="${esc(interviewerName)}, your AI interviewer">`;

  function roleOptions(selected){return [...new Set(roleConfig.map(role=>role.group||'IT roles'))].map(group=>`<optgroup label="${esc(group)}">${options(roleConfig.filter(role=>(role.group||'IT roles')===group).map(role=>[role.id,role.name]),selected)}</optgroup>`).join('');}
  function domainOptions(selected){return catalogue.domainGroups?.length?catalogue.domainGroups.map(group=>`<optgroup label="${esc(group.name)}">${options(group.domains.map(domain=>[domain,domain]),selected)}</optgroup>`).join(''):options(domains.map(domain=>[domain,domain]),selected);}

  function defaults(){
    const old={...(state.studioSetup||{}),...(setupDraft||{})},journey=state.learningJourney||{};const requested=Object.fromEntries(route().query);if(!setupDraft)for(const key of ['role','round','domain','language','company','focus'])if(requested[key])old[key]=requested[key];
    old.domain=normaliseDomain(old.domain);const previousDomain=normaliseDomain(journey.domain);
    return {role:roleConfig.some(role=>role.id===old.role)?old.role:roleConfig.some(role=>role.id===journey.role)?journey.role:'software-engineer',round:roundConfig.some(round=>round.id===old.round)?old.round:'technical',domain:domains.includes(old.domain)?old.domain:domains.includes(previousDomain)?previousDomain:'General / Cross-industry',language:Object.hasOwn(languageConfig,old.language)?old.language:currentLanguage,level:['intermediate','senior','lead'].includes(old.level)?old.level:'senior',minutes:5,mode:old.mode==='voice'?'voice':'text',company:typeof (old.company??journey.company)==='string'?(old.company??journey.company).slice(0,120):'',focus:typeof old.focus==='string'?old.focus.slice(0,400):''};
  }
  function notice(){
    if(loadError)return {title:'Connection unavailable',text:'We could not check the interview service. Your practice materials are still available. Reload the page to try again.'};
    if(!availability)return {title:'Checking the connection',text:'Choose your interview settings while we check the AI interviewer.'};
    if(!availability.enabled)return {title:'Live interviews are not connected yet',text:'You can choose your interview settings. Starting a session becomes available once the site’s Gemini connection is enabled.'};
    if(!availability.eligible)return {title:'Sign in to start',text:'Sign in to your account, then reload this page. The free preview requires an account.'};
    if(!availability.capacityAvailable)return {title:'Interviews are temporarily unavailable',text:'Please try again later. You will not be charged to start the free session.'};
    if(availability.subscribed)return {title:'Your subscription is active',text:'Unlimited AI interview practice, with access to the learning and coding resources.'};
    if(availability.remaining===0)return {title:'Your five free questions are complete',text:'Unlock unlimited AI mock interviews with a monthly subscription.'};
    return {title:'Five AI interview questions, free',text:'Answer at your own pace. Repeats do not use another question. Subscribe only when you choose.'};
  }
  const canStart=()=>!!availability?.enabled&&availability.eligible&&availability.capacityAvailable&&(availability.subscribed||availability.remaining>0);
  function setupForm(){const p=defaults();return `<form id="studio-setup" class="studio-setup" aria-labelledby="studio-setup-heading"><h2 id="studio-setup-heading">Your interview setup</h2><input type="hidden" name="minutes" value="5"><div class="studio-fields"><label>Which role are you preparing for?<select name="role">${roleOptions(p.role)}</select></label><label>Business domain<select name="domain">${domainOptions(p.domain)}</select></label><label>Programming language<select name="language">${options(Object.entries(languageConfig).map(([id,value])=>[id,value.name]),p.language)}</select></label><div class="company-field"><label for="studio-company">Target company</label><input id="studio-company" name="company" maxlength="120" value="${esc(p.company)}" placeholder="Search or enter a company · optional" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="company-results" aria-describedby="company-search-status"><div id="company-results" class="company-results" role="listbox" aria-label="Company suggestions" hidden></div><span id="company-search-status" class="company-search-status" role="status"></span></div><label>Interview round<select name="round">${options(roundConfig.map(round=>[round.id,round.name]),p.round)}</select></label><label>Experience level<select name="level">${options([['intermediate','Intermediate'],['senior','Senior'],['lead','Lead / Director']],p.level)}</select></label></div><label class="studio-focus">Topic focus (optional)<input name="focus" maxlength="400" value="${esc(p.focus)}" placeholder="For example: collections, APIs or stakeholder decisions"></label><fieldset class="studio-mode"><legend>How would you like to answer?</legend><label><input type="radio" name="mode" value="text" ${p.mode==='text'?'checked':''}><span><strong>By text</strong><small>Read the questions and type your answers.</small></span></label><label><input type="radio" name="mode" value="voice" ${p.mode==='voice'?'checked':''}><span><strong>By voice</strong><small>Listen, then use push-to-talk to answer.</small></span></label></fieldset><label class="studio-consent"><input type="checkbox" name="consent" required ${setupDraft?.consent?'checked':''}><span>I agree to the processing of my answers, and audio when I choose to speak, as described on the <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy page</a>.</span></label><p class="studio-data-note">Your free AI mock includes five questions. No card needed. Your settings, question progress and latest feedback are saved privately so you can resume; submitted answers and audio are not stored. Avoid confidential information. <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy page</a></p></form>`;}
  function sessionActions(){
    if(availability?.subscribed)return `<button class="button primary large" type="submit" form="studio-setup" ${!canStart()?'disabled':''}>Start AI mock interview<span class="session-button-detail">Unlimited subscriber access</span></button>`;
    const used=availability?.remaining===0,resuming=availability?.started&&!used;
    return `<div class="session-options" aria-label="Choose your AI mock interview session"><section class="session-option session-option-free"><span class="session-option-label">FREE AI MOCK</span><h3>Try five questions.</h3><p>Practise with Nova at your own pace. No card needed.</p><button class="button primary session-start" type="submit" form="studio-setup" ${!canStart()?'disabled':''}>${used?'Free questions completed':resuming?'Resume free AI mock interview':'Start free AI mock interview'}<span class="session-button-detail">${used?'5 questions answered':resuming?availability.remaining+' questions remaining':'5 questions · £0'}</span></button></section><section class="session-option session-option-paid"><span class="session-option-label">PAID AI MOCKS</span><h3>Keep practising.</h3><p>Unlimited AI interviews and all learning and coding resources.</p><button class="button session-upgrade" type="button" data-studio-continue>Unlock unlimited AI mock interviews<span class="session-button-detail">£9.99 / month · Cancel anytime</span></button></section></div>`;
  }
  const answerCount=target=>target.messages.filter(message=>message.role==='user'&&message.kind==='answer'&&!message.failed&&message.text.trim()).length;
  const hasQuestion=target=>target.messages.some(message=>message.role==='assistant'&&message.kind!=='summary'&&message.text.trim());
  function reviewForm(){return `<section class="flow-end-step"><div class="flow-end-heading"><span class="studio-eyebrow">YOUR NEXT STEP</span><h3>Keep the conversation going?</h3><p>${run.subscribed?'Your subscription is active. Continue this conversation or start another interview.':run.preview&&run.questionsAnswered<5?'Your remaining free questions are saved. Resume your free mock or subscribe for unlimited AI interviews.':'Your five free questions are complete. Subscribe for £9.99/month for unlimited AI mock interviews and all resources.'}</p>${run.preview&&run.questionsAnswered<5?'<button class="button primary" data-studio-resume-free>Resume free AI mock interview</button>':''}<button class="button ${run.preview&&run.questionsAnswered<5?'':'primary'}" data-studio-continue>${run.subscribed?'Continue AI mock interview':'Unlock unlimited AI mock interviews'}</button><button class="button" data-studio-new>Choose another interview</button></div>${run.summaryText?`<details class="flow-feedback" open><summary>Your practice feedback</summary><p>${esc(run.summaryText)}</p></details>`:''}<label class="flow-reflection-label" for="flow-reflection">One thing you want to improve (optional)</label><textarea id="flow-reflection" rows="3" maxlength="3000" placeholder="Keep a short note for your next attempt…">${esc(run.reflection||'')}</textarea><p class="studio-data-note">Your note stays on this page. Download the transcript to keep a copy.</p></section>`;}
  function sessionPanel(){
    if(!run)return `<section class="studio-room studio-room-empty"><div class="studio-interviewer">${portrait('nova-avatar-hero')}<span>${esc(interviewerName)} · AI INTERVIEWER</span><h2>A conversation that starts with your role.</h2><p>Your interviewer asks the first question, listens to your answer and follows up. You can switch between text and voice during the session.</p></div><div class="studio-empty-steps"><p><strong>Choose your setting.</strong> Pick a role, round and level.</p><p><strong>Answer one question at a time.</strong> Clarify, think aloud and give a concrete example.</p><p><strong>Reflect at the end.</strong> Ask for an AI-generated practice summary and next steps.</p></div><p class="studio-feedback-note">Practice feedback is advisory. It does not certify readiness or predict a hiring decision.</p></section>`;
    const p=run.selection,role=roleConfig.find(role=>role.id===p.role),round=roundConfig.find(round=>round.id===p.round);
    return `<section class="studio-room studio-live-room"><header class="studio-session-heading"><div class="nova-session-identity">${portrait('nova-avatar-session')}<div><span class="studio-eyebrow">${esc(interviewerName.toUpperCase())} · AI INTERVIEWER</span><h2>${esc(role.name)}</h2><p>${esc(round.name)} · ${esc(p.domain)}${p.company?' · '+esc(p.company):''} · ${run.subscribed?'Unlimited subscriber session':'5-question free AI mock'}</p><output id="studio-time-output" class="flow-session-time" aria-label="Interview question progress"></output></div></div><span class="studio-session-badge" data-studio-status></span></header><p class="studio-session-message" data-studio-message role="status"></p><div class="studio-transcript" data-studio-transcript role="log" aria-label="Interview transcript" aria-relevant="additions text"></div><div class="studio-response"><div class="studio-response-tools"><button class="button small" data-studio-mic>${micIcon}<span>Start speaking</span></button><button class="button small" data-studio-sound>Spoken questions off</button><button class="button small" data-studio-repeat>Repeat question</button><button class="button small" data-studio-retry hidden>Retry voice answer</button></div>${voiceSignal(run)}<form id="studio-answer-form"><label for="studio-answer">Your answer</label><textarea id="studio-answer" rows="4" maxlength="6000" placeholder="Type your answer, or choose Start speaking…">${esc(run.draft||'')}</textarea><div class="studio-send-row"><small data-studio-answer-help>Take a moment to think. Send your answer when you’re ready.</small><button class="button primary" type="submit" data-studio-send>Send answer</button></div></form></div><footer class="studio-session-footer"><button class="button" data-studio-finish>${run.preview?'Pause free mock interview':'Finish & get feedback'}</button><button class="button quiet" data-studio-stop>End now</button><button class="button quiet" data-studio-download>Download transcript</button>${run.closed?'<button class="button primary" data-studio-new>Set up another interview</button>':''}</footer>${run.closed?reviewForm():''}<p class="studio-feedback-note">AI feedback may be incomplete or mistaken. It should refer to your actual answers; it is not an automated grade or hiring prediction.</p></section>`;
  }
  function page(){const status=notice(),showStatus=loadError||!availability?.enabled||!availability?.eligible||!availability?.capacityAvailable,step=!run?0:run.closed?2:1;return `<div class="interview-studio interview-flow"><nav class="flow-steps" aria-label="Interview steps">${['Set up','Conversation','Next step'].map((label,index)=>`<span ${index===step?'aria-current="step"':''} data-step="${index}" class="${index===step?'is-current':index<step?'is-done':''}"><b>${index<step?'✓':index+1}</b>${label}</span>`).join('')}</nav>${!run?`<header class="flow-intro"><div class="nova-introduction">${portrait('nova-avatar-mobile')}<span class="studio-eyebrow">INTERVIEW PRACTICE WITH ${esc(interviewerName.toUpperCase())}</span></div><h1>Let’s practise your<br><em>next interview.</em></h1><p>Tell us what you’re preparing for. ${esc(interviewerName)} will take it from there.</p><span class="flow-free-badge">${availability?.subscribed?'Unlimited subscriber access':'5 questions free · No card needed'}</span></header><div class="flow-setup-layout">${setupForm()}<aside class="flow-what-to-expect"><div class="nova-profile">${portrait('nova-avatar-hero')}<span class="nova-name">Meet ${esc(interviewerName)}.</span><span class="nova-role">Your AI interviewer</span></div><h2>Choose your AI mock.</h2><p>Questions tailored to your role. Answer by text or voice, then reflect on your feedback.</p>${sessionActions()}<small>Representative practice for your target company. Feedback is AI-generated, not a hiring decision.</small></aside></div>`:`<header class="flow-session-intro"><span class="studio-eyebrow">${run.closed?'INTERVIEW PAUSED':'YOUR INTERVIEW'}</span><h1>${run.closed?'Your next step.':'You’re in the conversation.'}</h1></header>${sessionPanel()}`}${showStatus||availability?.subscribed?`<section class="flow-service-notice">${showStatus?`<div role="status"><strong>${esc(status.title)}</strong><p>${esc(status.text)}</p></div>`:''}${availability?.subscribed?'<a class="button small" href="/library.html#/learning?language=java">Learning & coding resources ↗</a><a class="button small" href="#/checkout">Subscription</a>':''}</section>`:''}</div>`;}
  async function api(path,body,signal,workspace=state.pilotWorkspaceKey){
    const response=await fetch('/api/studio/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(workspace?{'X-PrepSpace-Workspace':workspace}:{})},...(body?{body:JSON.stringify(body)}:{}),signal,cache:'no-store'});
    const value=await response.json();if(!response.ok)throw new Error(value.error||'The interview service is unavailable.');return value;
  }
  async function mount(){
    if(!isRoute())return;
    await window.PrepPilotUI.ensureWorkspace();
    if(!isRoute())return;
    const key=state.pilotWorkspaceKey;if(setupWorkspace&&setupWorkspace!==key)setupDraft=null;setupWorkspace=key;
    if(loadedWorkspace===key||loading){paint();return;}
    const token=++generation;loading=true;loadError=false;loadedWorkspace=key;
    try{const result=await api('status');if(token===generation&&key===state.pilotWorkspaceKey)availability=result;}
    catch{if(token===generation){loadError=true;availability=null;}}
    finally{loading=false;if(token===generation&&isRoute())render();}
  }
  function transcriptHtml(){return run.messages.map(message=>`<article class="studio-message" data-speaker="${message.role}"><span>${message.role==='assistant'?esc(interviewerName)+' · AI interviewer':'You'}${message.interrupted?' · interrupted':''}${message.failed?' · not sent':''}</span><p>${esc(message.text)}</p></article>`).join('')||'<div class="studio-waiting">Connecting to your interviewer. The first question will appear here after Gemini responds.</div>';}
  function voiceSignal(target){return `<div class="studio-voice-signal" data-voice-signal ${!target.listening||target.capturePending||target.closed?'hidden':''}><div class="voice-signal-bars" data-voice-bars role="meter" aria-label="Microphone input level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${Array.from({length:9},()=>'<i aria-hidden="true"></i>').join('')}</div><span>Listening<span class="voice-signal-dots" aria-hidden="true">…</span></span></div>`;}
  function paintVoiceSignal(target){const signal=document.querySelector('[data-voice-signal]');if(!signal||run!==target)return;const visible=target.listening&&!target.capturePending&&!target.stoppingCapture&&!target.closed;signal.hidden=!visible;const level=visible?target.voiceLevel||0:0,bars=signal.querySelector('[data-voice-bars]');bars?.setAttribute('aria-valuenow',String(Math.round(level*100)));signal.dataset.speaking=String(level>.02);signal.querySelectorAll('i').forEach((bar,i)=>{bar.style.height=(4+level*[10,18,26,16,30,20,26,16,10][i])+'px';});}
  function paint(){
    if(!run)return;
    paintVoiceSignal(run);
    const root=document.querySelector('.studio-live-room');if(!root)return;
    const text=(selector,value)=>{const element=root.querySelector(selector);if(element)element.textContent=value;};
    text('[data-studio-status]',run.closed?'Session ended':run.listening?'Listening':run.finishRequested?'Wrapping up':run.ready?'Connected':'Connecting');
    text('[data-studio-message]',run.message||'');
    const transcript=root.querySelector('[data-studio-transcript]');
    if(transcript){const nearBottom=transcript.scrollHeight-transcript.scrollTop-transcript.clientHeight<80;transcript.innerHTML=transcriptHtml();if(nearBottom)transcript.scrollTop=transcript.scrollHeight;}
    const unavailable=!run.ready||run.closed||run.finishRequested;const retry=root.querySelector('[data-studio-retry]');if(retry){retry.hidden=!run.pendingVoice;retry.disabled=unavailable||run.awaitingTurn;}
    for(const selector of ['[data-studio-send]','[data-studio-repeat]']){const button=root.querySelector(selector);if(button)button.disabled=unavailable||run.awaitingTurn||run.listening||run.capturePending||run.stoppingCapture;}
    const microphone=root.querySelector('[data-studio-mic]');if(microphone){microphone.disabled=unavailable||run.awaitingTurn||run.capturePending||run.stoppingCapture;microphone.querySelector('span').textContent=run.listening?'Finish voice answer':run.capturePending?'Opening microphone…':'Start speaking';microphone.classList.toggle('is-listening',run.listening);microphone.setAttribute('aria-pressed',String(run.listening));}
    const sound=root.querySelector('[data-studio-sound]');if(sound){sound.textContent=run.sound?'Spoken questions on':'Spoken questions off';sound.setAttribute('aria-pressed',String(run.sound));sound.disabled=run.closed;}
    for(const selector of ['[data-studio-finish]','[data-studio-stop]']){const button=root.querySelector(selector);if(button)button.disabled=run.closed||(selector.includes('finish')&&unavailable);}
    text('[data-studio-answer-help]',run.closed?'The session has ended. Download the transcript before leaving.':run.awaitingTurn?'You can draft your answer while the interviewer finishes. Send it when the question is complete.':run.listening?'Finish your voice answer before sending a typed answer.':'Take a moment to think. Send your answer when you’re ready.');
  }
  function mergeText(previous,delta){return previous&&delta.startsWith(previous)?delta:previous+delta;}
  function appendReply(target,text,role){
    if(!text)return;
    const field=role==='assistant'?'reply':'voiceReply';
    target[field]??={role,kind:role==='user'?'answer':target.ending?'summary':'question',text:''};
    if(!target.messages.includes(target[field]))target.messages.push(target[field]);
    target[field].text=mergeText(target[field].text,String(text));
    if(role==='assistant'&&target.ending)target.summaryText=target[field].text;
    if(target.messages.reduce((n,item)=>n+item.text.length,0)>60000)terminate(target,'The transcript limit was reached. You can download the recorded conversation.');
  }
  function kickoff(target){
    if(target.closed||target.started||!target.live||!target.ready)return;
    target.started=true;target.awaitingTurn=true;target.message='Your AI interviewer is preparing the first question.';
    const history=target.messages.filter(m=>m.kind!=='request'&&!m.failed).slice(-12).map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.text.slice(-6000)}]}));const instruction=history.length?'Continue this practice interview from the preceding conversation. Do not reintroduce yourself or repeat answered questions. Ask one relevant follow-up, then wait for my answer.':'Start the selected practice interview now. Greet me briefly, ask your first relevant question, then wait for my answer.';try{target.live.sendClientContent({turns:[...history,{role:'user',parts:[{text:instruction}]}],turnComplete:true});}catch{terminate(target,'The interview connection closed before the first question.');}paint();
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
    if(transcript||content.modelTurn)target.message=target.ending?'Receiving your practice summary.':target.finishRequested?'Finishing the current reply before requesting your summary.':'Read or listen, then answer when you are ready.';
    if(content.generationComplete)target.generationComplete=true;
    if(content.turnComplete){
      target.awaitingTurn=false;target.reply=null;target.voiceReply=null;
      if(target.ending){target.summaryStatus=target.summaryText?.trim()?'complete':'not_received';terminate(target,target.summaryStatus==='complete'?'Interview finished. Review the AI practice summary and download your transcript.':'The interviewer ended without a written summary. You can still record your own reflection.');return;}
      if(target.finishRequested){requestSummary(target);return;}
    }
    paint();
  }
  async function start(form){
    if(run&&!run.closed)return;
    const data=Object.fromEntries(new FormData(form));data.minutes=5;data.consent=data.consent==='on';
    if(!canStart()){toast(notice().text);return;}
    state.studioSetup={...data};delete state.studioSetup.consent;persist();
    await startSelection(data);
  }
  async function startSelection(data,messages=[]){
    const target={selection:{...data,minutes:5},workspace:state.pilotWorkspaceKey,sessionId:crypto.randomUUID(),messages:messages.filter(m=>['user','assistant'].includes(m.role)&&typeof m.text==='string').slice(-20).map(m=>({...m})),draft:'',audio:new window.PrepStudioAudio(),sound:data.mode==='voice',ready:false,closed:false,ending:false,finishRequested:false,awaitingTurn:false,summaryStatus:'not_received',listening:false,capturePending:false,stoppingCapture:false,abort:new AbortController(),leaseEpoch:0,message:'Connecting to your AI interviewer…'};run=target;
    if(target.sound)try{await target.audio.preparePlayback();}catch{target.sound=false;}
    render();await connectLease(target);
  }
  async function connectLease(target){
    const epoch=++target.leaseEpoch;target.started=false;target.ready=false;target.awaitingTurn=false;target.reply=null;target.voiceReply=null;
    try{
      const details=await api('session',{...target.selection,requestId:target.sessionId},target.abort.signal,target.workspace);
      if(run!==target||target.closed){api('end',{sessionId:details.sessionId},undefined,target.workspace).catch(()=>{});return;}
      if(details.transport==='questions'){applyQuestionTurn(target,details);return;}
      target.subscribed=details.subscribed===true;target.expiresAt=Date.parse(details.expiresAt);if(run===target&&isRoute())render();
      target.expiry=setTimeout(()=>renew(target),Math.max(0,target.expiresAt-Date.now()-1000));
      target.handshake=setTimeout(()=>{if(!target.ready)terminate(target,'The interviewer could not finish connecting. Please try again.');},20000);
      const live=await window.PrepStudioTransport.connect(details,{onmessage:message=>{if(epoch===target.leaseEpoch)onMessage(target,message);},onerror:()=>{if(epoch===target.leaseEpoch)terminate(target,'The connection was interrupted. Your transcript is still on this page.');},onclose:()=>{if(epoch===target.leaseEpoch&&!target.closed)terminate(target,'The interview connection closed. Your transcript remains available to download.');}});
      if(target.closed||epoch!==target.leaseEpoch){live.close();return;}target.live=live;kickoff(target);paint();
    }catch(error){if(!target.closed)terminate(target,error.name==='AbortError'?'Interview cancelled.':'The AI interview could not connect. Your existing subscription or payment status has not been changed.');}
  }
  function speakQuestion(target,text){if(target.sound&&target.audio.speak&&!target.audio.speak(text))target.message+=' Spoken playback is unavailable; the written question is ready.';}
  function applyQuestionTurn(target,details){
    target.preview=true;target.subscribed=false;target.sessionId=details.sessionId;target.selection={...details.selection,consent:target.selection.consent};target.questionNumber=details.questionNumber;target.questionsAnswered=details.questionsAnswered;target.ready=true;target.awaitingTurn=false;
    if(details.completed){target.summaryText=details.summary||'Your five questions are complete.';target.summaryStatus='complete';target.messages.push({role:'assistant',kind:'summary',text:target.summaryText});terminate(target,'You answered all five free questions. Review your feedback, then choose whether to unlock unlimited AI mock interviews.');return;}
    if(target.messages.at(-1)?.text!==details.question)target.messages.push({role:'assistant',kind:'question',text:details.question,number:details.questionNumber});
    target.message=`Question ${details.questionNumber} of 5. Answer when you are ready.`;if(run===target&&isRoute())render();paint();speakQuestion(target,details.question);
  }
  async function sendQuestionAnswer(target,payload){
    if(target.closed||target.awaitingTurn)return;
    target.awaitingTurn=true;target.audio.stopPlayback();target.pendingVoice=payload.audio?payload:null;target.message='Nova is considering your answer…';paint();
    const text=payload.answer||'',number=target.questionNumber;
    try{
      const details=await api('preview/answer',{sessionId:target.sessionId,requestId:crypto.randomUUID(),questionNumber:number,history:target.messages.filter(m=>m.kind!=='request'&&!m.failed).slice(-20).map(m=>({role:m.role,text:m.text})),...payload},target.abort.signal,target.workspace);
      if(run!==target||target.closed)return;
      target.pendingVoice=null;target.messages.push({role:'user',kind:'answer',text:text||details.transcript||'Voice answer received; transcription unavailable after reconnection.',number});
      const field=document.getElementById('studio-answer');if(text&&field?.value===text){field.value='';target.draft='';}
      applyQuestionTurn(target,details);
    }catch(error){if(!target.closed){target.awaitingTurn=false;target.message=error.message||'Your answer could not be processed. Your allowance is unchanged; retry when ready.';paint();}}
  }
  async function renew(target){
    if(target.closed||target.finishRequested)return terminate(target,'This interview connection ended. You can continue with your active subscription.');
    target.message='Reconnecting your conversation. Your answers are kept.';target.ready=false;target.leaseEpoch++;paint();
    try{await stopVoice(target);}catch{}target.audio.stopPlayback();try{target.live?.close();}catch{}
    clearTimeout(target.handshake);clearTimeout(target.expiry);
    try{await api('end',{sessionId:target.sessionId},undefined,target.workspace);if(target.closed)return;target.sessionId=crypto.randomUUID();await connectLease(target);}catch{terminate(target,'The conversation could not reconnect. You can resume it with your subscription when the connection is available.');}
  }
  async function resume(context){
    try{await window.PrepPilotUI.ensureWorkspace();const status=await api('status');availability=status;if(!status.subscribed)throw new Error('A verified active subscription is required.');if(!context?.selection?.consent){run=null;render();return;}await startSelection({...context.selection,consent:true},context.messages||[]);}catch(error){toast(error.message||'The interview could not resume.');}
  }
  async function stopVoice(target,flush=true){
    if(target.stoppingCapture)return;
    target.stoppingCapture=true;paint();
    try{await target.audio.stopCapture(flush);clearTimeout(target.voiceDeadline);if(target.listening&&!target.closed){if(target.preview){target.listening=false;if(flush&&target.voiceChunks?.length)await sendQuestionAnswer(target,{audio:window.PrepStudioAudio.toWav(target.voiceChunks)});}else{target.awaitingTurn=true;target.live?.sendRealtimeInput({activityEnd:{}});}}}
    finally{target.listening=false;target.capturePending=false;target.stoppingCapture=false;paint();}
  }
  async function microphone(){
    const target=run;if(!target||!target.ready||target.closed||target.finishRequested||target.awaitingTurn)return;
    if(target.listening){try{await stopVoice(target);}catch{terminate(target,'The voice connection ended. Your transcript remains on this page.');}return;}
    target.capturePending=true;target.audio.stopPlayback();paint();
    try{
      if(!target.preview)target.live.sendRealtimeInput({activityStart:{}});target.listening=true;target.voiceChunks=[];target.voiceBytes=0;
      const opened=await target.audio.startCapture(data=>{if(!target.closed&&target.listening){if(target.preview){target.voiceChunks.push(data);target.voiceBytes+=atob(data).length;if(target.voiceBytes>=16000*2*90)stopVoice(target).catch(()=>{});}else target.live.sendRealtimeInput({audio:{data,mimeType:'audio/pcm;rate=16000'}});}},level=>{if(run===target&&!target.closed){target.voiceLevel=level;paintVoiceSignal(target);}});
      if(!opened||target.closed)return;
      if(target.preview)target.voiceDeadline=setTimeout(()=>stopVoice(target).catch(()=>{}),90000);
      target.message='Microphone on. Speak your answer, then choose Finish voice answer.'+(target.preview?' Voice answers can be up to 90 seconds.':'');
    }catch{target.listening=false;try{target.live?.sendRealtimeInput({activityEnd:{}});}catch{}target.message='Microphone access was denied or unavailable. You can type your answer instead.';}
    finally{target.capturePending=false;paint();}
  }
  function send(text,control=false){
    const target=run;if(!target||target.closed||!target.ready||target.finishRequested||target.awaitingTurn||target.listening||target.capturePending)return false;
    if(target.preview){if(control){target.message='Repeating the current question does not use another free question.';speakQuestion(target,target.messages.filter(m=>m.role==='assistant'&&m.kind==='question').at(-1)?.text||'');paint();}else sendQuestionAnswer(target,{answer:text});return false;}
    target.audio.stopPlayback();target.reply=null;target.voiceReply=null;const message={role:'user',kind:control?'request':'answer',text};target.messages.push(message);target.awaitingTurn=true;
    try{target.live.sendClientContent({turns:[{role:'user',parts:[{text}]}],turnComplete:true});target.message='Your interviewer is considering your answer.';paint();return true;}
    catch{message.failed=true;terminate(target,'Your answer could not be sent. The draft and transcript remain on this page.');return false;}
  }
  async function finish(target=run){
    if(!target||target.closed||target.finishRequested)return;
    if(!target.ready){terminate(target,'Interview ended before connecting.');return;}
    if(target.preview){if(target.awaitingTurn){target.message='Wait for the current answer to finish before pausing.';paint();return;}await stopVoice(target);if(!target.closed)terminate(target,'Your free mock interview is paused. Your question progress is saved, and you can resume your remaining questions.');return;}
    target.finishRequested=true;paint();
    try{await stopVoice(target);}catch{}if(target.closed)return;
    if(target.awaitingTurn){target.message='Finishing the current reply before requesting your summary.';target.finishWait=setTimeout(()=>terminate(target,'The interviewer did not finish its reply in time. The transcript remains available; you can record your own reflection.'),30000);paint();return;}
    requestSummary(target);
  }
  function requestSummary(target){
    if(target.closed||target.ending)return;
    clearTimeout(target.finishWait);target.ending=true;target.awaitingTurn=true;target.generationComplete=false;target.audio.stopPlayback();target.reply=null;target.summaryText='';
    try{target.live.sendClientContent({turns:[{role:'user',parts:[{text:'Finish this practice interview now. Do not ask another question. Give the brief evidence-based practice summary described in your instructions, and identify anything we did not cover. Keep the summary under 100 words.'}]}],turnComplete:true});}catch{terminate(target,'The connection ended before a summary could be requested. Download the available transcript.');return;}
    target.message='Your interviewer is preparing a practice summary.';target.finishTimeout=setTimeout(()=>terminate(target,'The session ended before the complete summary arrived. Download the available transcript.'),40000);paint();
  }
  function terminate(target,message){
    if(!target||target.closed)return;
    target.closed=true;target.ready=false;target.message=message;if(target.summaryStatus!=='complete'&&target.summaryText?.trim())target.summaryStatus='partial';target.abort?.abort();
    for(const name of ['deadline','expiry','handshake','finishTimeout','finishWait','voiceDeadline'])clearTimeout(target[name]);
    target.audio.close().catch(()=>{});try{target.live?.close();}catch{}
    api('end',{sessionId:target.sessionId},undefined,target.workspace).catch(()=>{});
    if(run===target){loadedWorkspace=null;paint();if(isRoute())render();}
  }
  function beforeRender(){if(setupWorkspace&&setupWorkspace!==state.pilotWorkspaceKey)setupDraft=null;if(run&&run.workspace!==state.pilotWorkspaceKey){const old=run;run=null;terminate(old,'Session closed.');}else if(run&&!isRoute()&&route().path!=='checkout'){const old=run;run=null;terminate(old,'Session closed.');}else if(run&&route().path==='checkout'&&!run.closed)terminate(run,'Interview paused while you review continuation options.');}
  document.addEventListener('submit',event=>{
    if(event.target.id==='studio-setup'){event.preventDefault();start(event.target);}
    if(event.target.id==='studio-answer-form'){event.preventDefault();const field=document.getElementById('studio-answer'),text=field.value.trim();if(text&&text.length<=6000&&send(text)){run.draft='';field.value='';}}
  });
  function captureSetup(event){if(!event.target.closest?.('#studio-setup'))return;const values=Object.fromEntries(new FormData(document.getElementById('studio-setup')));setupDraft={...values,consent:values.consent==='on',minutes:5};state.studioSetup={...setupDraft};delete state.studioSetup.consent;persist();}
  document.addEventListener('change',captureSetup);
  document.addEventListener('input',event=>{captureSetup(event);if(event.target.id==='studio-answer'&&run)run.draft=event.target.value.slice(0,6000);if(event.target.id==='flow-reflection'&&run)run.reflection=event.target.value.slice(0,3000);});
  document.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.matches('[data-studio-mic]'))await microphone();
    if(button.matches('[data-studio-sound]')&&run&&!run.closed){run.sound=!run.sound;if(run.sound)try{await run.audio.preparePlayback();}catch{run.sound=false;run.message='Spoken playback is unavailable. Continue with text.';}else run.audio.stopPlayback();paint();}
    if(button.matches('[data-studio-repeat]'))send('Please repeat your current question without giving the answer.',true);
    if(button.matches('[data-studio-retry]')&&run?.pendingVoice)await sendQuestionAnswer(run,run.pendingVoice);
    if(button.matches('[data-studio-resume-free]')&&run){const data={...run.selection},messages=run.messages.filter(m=>m.kind!=='summary');await startSelection(data,messages);}
    if(button.matches('[data-studio-finish]'))finish();
    if(button.matches('[data-studio-stop]'))terminate(run,'You ended the interview. Download the transcript before leaving this page.');
    if(button.matches('[data-studio-new]')){setupDraft=null;window.PrepCheckout?.discard();run=null;loadedWorkspace=null;render();}
    if(button.matches('[data-studio-continue]')){const form=document.getElementById('studio-setup');if(form){const selected=Object.fromEntries(new FormData(form));state.studioSetup={...selected,minutes:5};delete state.studioSetup.consent;persist();}window.PrepCheckout?.prepare(run);go('checkout');}
    if(button.matches('[data-studio-download]')&&run){const transcript={title:'PrepSpace Interview Studio',interviewer:interviewerName,provider:'Google Gemini',selection:{...run.selection,consent:undefined,requestId:undefined},note:'AI-generated practice conversation, not a verified grade or hiring prediction.',messages:run.messages,reflection:run.reflection||''};const blob=new Blob([JSON.stringify(transcript,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='prepspace-interview-transcript.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&run&&!run.closed){run.audio.stopPlayback();if(run.listening||run.capturePending){run.message='The microphone was paused when you left the tab.';stopVoice(run,false).catch(()=>{});}}});
  window.addEventListener('pagehide',()=>{if(run&&!run.closed){run.audio.close();try{run.live?.close();}catch{}}});
  setInterval(()=>{const output=document.getElementById('studio-time-output');if(!output||!run)return;if(run.subscribed){output.textContent='Unlimited subscriber access';return;}output.textContent=run.preview?`${run.questionsAnswered||0} of 5 answered${run.closed?'':' · Question '+run.questionNumber+' of 5'}`:'Connecting to your interviewer…';},500);
  return {page,mount,beforeRender,mergeText,resume};
})();
