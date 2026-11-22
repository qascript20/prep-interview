// Resample the microphone to 16 kHz signed PCM, explicitly little-endian.
class StudioRecorder extends AudioWorkletProcessor {
  constructor(){
    super();this.position=0;this.next=0;this.previous=0;this.count=0;this.resetFrame();
    this.port.onmessage=event=>{if(event.data==='flush'){this.flush();this.port.postMessage({flushed:true});}};
  }
  resetFrame(){this.bytes=new Uint8Array(2048);this.view=new DataView(this.bytes.buffer);}
  emit(value){
    const clipped=Math.max(-1,Math.min(1,value));
    this.view.setInt16(this.count*2,Math.round(clipped*(clipped<0?32768:32767)),true);
    if(++this.count===1024)this.flush();
  }
  flush(){if(!this.count)return;const audio=this.bytes.slice(0,this.count*2).buffer;this.port.postMessage({audio},[audio]);this.count=0;this.resetFrame();}
  process(inputs){
    const samples=inputs[0]?.[0];if(!samples)return true;
    const step=sampleRate/16000;
    for(const value of samples){
      while(this.next<=this.position){const fraction=this.next-(this.position-1);this.emit(this.position===0?value:this.previous+(value-this.previous)*fraction);this.next+=step;}
      this.previous=value;this.position++;
    }
    return true;
  }
}
registerProcessor('prepspace-studio-recorder',StudioRecorder);
