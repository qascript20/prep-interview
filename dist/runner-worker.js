'use strict';
const nativeSend=self.postMessage.bind(self),nativeSetTimeout=self.setTimeout.bind(self),nativeClearTimeout=self.clearTimeout.bind(self),nativeSetInterval=self.setInterval.bind(self),nativeClearInterval=self.clearInterval.bind(self);
const maxOutput=65536;
let outputSize=0,timers=new Set(),timerError=null;
// No nested workers or cross-tab channels. The enclosing opaque frame's CSP also blocks all network requests.
for(const name of ['Worker','SharedWorker','BroadcastChannel']){try{Object.defineProperty(self,name,{value:undefined,writable:false,configurable:false});}catch{}}
function send(value){nativeSend(value);}
function format(value){if(typeof value==='string')return value;if(typeof value==='bigint')return value.toString()+'n';if(value instanceof Error)return value.name+': '+value.message;if(value===undefined)return 'undefined';const seen=new WeakSet();try{return JSON.stringify(value,(_key,item)=>{if(typeof item==='bigint')return item.toString()+'n';if(item instanceof Map)return Object.fromEntries(item);if(item instanceof Set)return [...item];if(item&&typeof item==='object'){if(seen.has(item))return '[Circular]';seen.add(item);}return item;});}catch{return String(value);}}
function emit(stream,text){text=String(text);if(outputSize+text.length>maxOutput){const rest=maxOutput-outputSize;if(rest>0)send({type:'output',stream,text:text.slice(0,rest)});outputSize=maxOutput;const error=new Error('Output limit exceeded.');error.outputLimit=true;throw error;}outputSize+=text.length;send({type:'output',stream,text});}
self.console={log:(...args)=>emit('stdout',args.map(format).join(' ')+'\n'),info:(...args)=>emit('stdout',args.map(format).join(' ')+'\n'),warn:(...args)=>emit('stderr',args.map(format).join(' ')+'\n'),error:(...args)=>emit('stderr',args.map(format).join(' ')+'\n'),debug:(...args)=>emit('stdout',args.map(format).join(' ')+'\n'),assert:(condition,...args)=>{if(!condition)emit('stderr','Assertion failed: '+args.map(format).join(' ')+'\n');}};
self.setTimeout=(callback,delay,...args)=>{let id=nativeSetTimeout(()=>{try{callback(...args);}catch(error){timerError=error;}finally{timers.delete(id);}},Math.max(0,Number(delay)||0));timers.add(id);return id;};
self.clearTimeout=id=>{timers.delete(id);nativeClearTimeout(id);};
self.setInterval=(callback,delay,...args)=>{const id=nativeSetInterval(()=>{try{callback(...args);}catch(error){timerError=error;}},Math.max(1,Number(delay)||1));timers.add(id);return id;};
self.clearInterval=id=>{timers.delete(id);nativeClearInterval(id);};
self.addEventListener('unhandledrejection',event=>{timerError=event.reason instanceof Error?event.reason:new Error(String(event.reason));event.preventDefault();});
function compileTypeScript(source){
 const runtime=`declare function readAll(): string;\ndeclare function readLine(): string | undefined;\ndeclare function require(name: string): {readFileSync(path: number | string, encoding?: string): string};\ndeclare const process: {stdout: {write(value: string): void}; stderr: {write(value: string): void}; exit(code?: number): never};\ndeclare const exports: Record<string, unknown>;\ndeclare const module: {exports: Record<string, unknown>};\ndeclare module "fs" { export function readFileSync(path: number | string, encoding?: string): string; }\n`;
 const files={'main.ts':source,'runtime.d.ts':runtime,...self.TS_LIBS};let emitted='';
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true,noEmitOnError:true,skipLibCheck:true,esModuleInterop:true,lib:['lib.es2022.d.ts','lib.webworker.d.ts']};
 const basename=name=>name.replace(/\\/g,'/').split('/').pop();
 const host={getSourceFile:(name,version)=>{const text=files[basename(name)];return text===undefined?undefined:ts.createSourceFile(name,text,version,true);},getDefaultLibFileName:()=>'/lib.es2022.d.ts',getDefaultLibLocation:()=>'/',writeFile:(name,text)=>{if(name.endsWith('main.js'))emitted=text;},getCurrentDirectory:()=>'/',getDirectories:()=>[],fileExists:name=>Object.hasOwn(files,basename(name)),readFile:name=>files[basename(name)],directoryExists:()=>true,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=>'\n'};
 const program=ts.createProgram(['/main.ts','/runtime.d.ts'],options,host);const diagnostics=ts.getPreEmitDiagnostics(program);const errors=diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error);
 if(errors.length){return {errors:errors.slice(0,30).map(d=>{const position=d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start):null;return `${d.file?basename(d.file.fileName):'TypeScript'}${position?':'+(position.line+1)+':'+(position.character+1):''} TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText,'\n')}`;})};}
 const result=program.emit();return result.emitSkipped?{errors:['TypeScript could not emit this program.']}:{code:emitted};
}
self.onmessage=async event=>{const {language,code,input}=event.data;const started=performance.now();let source=code;try{
 if(language==='typescript'){send({type:'phase',phase:'compiling'});const compiled=compileTypeScript(code);if(compiled.errors){send({type:'result',status:'compile_error',stderr:compiled.errors.join('\n'),durationMs:Math.round(performance.now()-started)});return;}source=compiled.code;}
 const lines=String(input).replace(/\r\n/g,'\n').split('\n');if(lines.at(-1)==='')lines.pop();let position=0;
 self.readAll=()=>String(input);self.readLine=()=>position<lines.length?lines[position++]:undefined;
 self.require=name=>{if(name!=='fs'&&name!=='node:fs')throw new Error('External packages are not available in the browser runner.');return {readFileSync:(path,_encoding)=>{if(path!==0&&path!=='/dev/stdin')throw new Error('Only standard input is available.');return String(input);}};};
 self.exports={};self.module={exports:self.exports};self.process={stdout:{write:value=>emit('stdout',value)},stderr:{write:value=>emit('stderr',value)},exit:code=>{const error=new Error('Process exited with code '+(code||0));error.exitCode=code||0;throw error;}};
 send({type:'phase',phase:'running'});
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 let program;try{program=new AsyncFunction('"use strict";\n'+source);}catch(error){error.compilation=true;throw error;}
 await program();
 await new Promise(resolve=>nativeSetTimeout(resolve,25));
 while(timers.size){if(timerError)throw timerError;await new Promise(resolve=>nativeSetTimeout(resolve,20));}
 if(timerError)throw timerError;
 send({type:'result',status:'completed',exitCode:0,durationMs:Math.round(performance.now()-started)});
 }catch(error){send({type:'result',status:error.outputLimit?'output_limit':error.compilation?'compile_error':error.exitCode===0?'completed':'runtime_error',stderr:error.exitCode===0?'':error.name+': '+error.message,exitCode:error.exitCode??1,durationMs:Math.round(performance.now()-started)});}};
