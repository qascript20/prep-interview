'use strict';
window.PrepStudioAudio=class {
  constructor(){this.closed=false;this.generation=0;this.capture=null;this.output=null;this.sources=new Set();this.nextPlayback=0;}
  async preparePlayback(){
    if(this.closed)return;
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)throw new Error('Voice playback is unavailable in this browser. You can still use text.');
    this.output??=new Context();await this.output.resume();
  }
  async startCapture(send){
    if(this.closed||this.capture)throw new Error('The microphone is already in use.');
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone access is unavailable. Use text or a secure supported browser.');
    const epoch=++this.generation;
    const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    if(this.closed||epoch!==this.generation){stream.getTracks().forEach(track=>track.stop());return false;}
    const capture={stream,context:null,node:null,source:null,sink:null,flushed:null};this.capture=capture;
    try{
      const Context=window.AudioContext||window.webkitAudioContext;
      if(!Context)throw new Error('Live voice capture is unavailable. Use text instead.');
      const context=new Context({sampleRate:16000});capture.context=context;
      if(!context.audioWorklet)throw new Error('Live voice capture is unavailable. Use text instead.');
      await context.audioWorklet.addModule('studio-audio-worklet.js');
      if(this.closed||this.capture!==capture){stream.getTracks().forEach(track=>track.stop());await context.close();return false;}
      const node=new AudioWorkletNode(context,'prepspace-studio-recorder');capture.node=node;
      node.port.onmessage=event=>{
        if(event.data.flushed){capture.flushed?.();return;}
        if(!event.data.audio||this.closed||this.capture!==capture)return;
        const bytes=new Uint8Array(event.data.audio);
        send(btoa(String.fromCharCode(...bytes)));
      };
      capture.source=context.createMediaStreamSource(stream);capture.sink=context.createGain();capture.sink.gain.value=0;
      capture.source.connect(node);node.connect(capture.sink);capture.sink.connect(context.destination);
      await context.resume();return true;
    }catch(error){if(this.capture===capture)await this.stopCapture(false);throw error;}
  }
  async stopCapture(flush=true){
    const capture=this.capture;
    if(!capture){this.generation++;return;}
    if(flush&&capture.node)await Promise.race([new Promise(resolve=>{capture.flushed=resolve;capture.node.port.postMessage('flush');}),new Promise(resolve=>setTimeout(resolve,200))]);
    if(this.capture!==capture)return;
    this.capture=null;this.generation++;
    capture.stream.getTracks().forEach(track=>track.stop());
    for(const node of [capture.source,capture.node,capture.sink])try{node?.disconnect();}catch{}
    if(capture.context&&capture.context.state!=='closed')await capture.context.close();
  }
  play(base64,mime='audio/pcm;rate=24000'){
    if(this.closed||!this.output||this.output.state!=='running'||!mime.startsWith('audio/pcm'))return;
    const decoded=atob(base64);if(decoded.length>1048576||decoded.length%2)return;
    const bytes=Uint8Array.from(decoded,char=>char.charCodeAt(0)),view=new DataView(bytes.buffer);
    const rate=Number(/rate=(\d+)/.exec(mime)?.[1]||24000);if(rate<8000||rate>96000)return;
    if(this.nextPlayback-this.output.currentTime>20){this.stopPlayback();return;}
    const buffer=this.output.createBuffer(1,bytes.length/2,rate),channel=buffer.getChannelData(0);
    for(let i=0;i<channel.length;i++)channel[i]=view.getInt16(i*2,true)/32768;
    const source=this.output.createBufferSource();source.buffer=buffer;source.connect(this.output.destination);this.sources.add(source);
    source.onended=()=>{this.sources.delete(source);source.disconnect();};
    this.nextPlayback=Math.max(this.output.currentTime+.025,this.nextPlayback);source.start(this.nextPlayback);this.nextPlayback+=buffer.duration;
  }
  speak(text){
    if(this.closed||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return false;
    const voice=window.speechSynthesis.getVoices().find(v=>v.localService&&/^en\b/i.test(v.lang));
    if(!voice)return false;
    this.stopPlayback();const utterance=new window.SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.rate=.97;
    this.utterance=utterance;utterance.onend=()=>{if(this.utterance===utterance)this.utterance=null;};window.speechSynthesis.speak(utterance);return true;
  }
  static toWav(chunks){
    const pieces=chunks.map(chunk=>Uint8Array.from(atob(chunk),c=>c.charCodeAt(0))),length=Math.min(pieces.reduce((n,c)=>n+c.length,0),16000*2*90),bytes=new Uint8Array(44+length),view=new DataView(bytes.buffer);
    const text=(offset,value)=>{for(let i=0;i<value.length;i++)bytes[offset+i]=value.charCodeAt(i);};
    text(0,'RIFF');view.setUint32(4,36+length,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,length,true);
    let offset=44;for(const piece of pieces){const part=piece.subarray(0,bytes.length-offset);bytes.set(part,offset);offset+=part.length;if(offset===bytes.length)break;}
    const encoded=[];for(let i=0;i<bytes.length;i+=8192)encoded.push(String.fromCharCode(...bytes.subarray(i,i+8192)));
    return {mimeType:'audio/wav',data:btoa(encoded.join(''))};
  }
  stopPlayback(){if(this.utterance){window.speechSynthesis?.cancel();this.utterance=null;}for(const source of this.sources)try{source.stop();}catch{}this.sources.clear();this.nextPlayback=this.output?.currentTime||0;}
  async close(){this.closed=true;this.generation++;await this.stopCapture(false);this.stopPlayback();if(this.output&&this.output.state!=='closed')await this.output.close();}
};
