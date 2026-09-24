const SAMPLE_RATE=16_000;
const MAX_SECONDS=60;

/** The assessment endpoint accepts a bounded, mono PCM WAV file. */
export function pcm16Wave(samples:Float32Array,sampleRate=SAMPLE_RATE):Uint8Array{
 if(sampleRate!==SAMPLE_RATE||samples.length<1||samples.length>MAX_SECONDS*SAMPLE_RATE)throw Error('audio_answer_duration_invalid');
 const bytes=new Uint8Array(44+samples.length*2);
 const view=new DataView(bytes.buffer);
 const write=(offset:number,value:string)=>{for(let index=0;index<value.length;index++)bytes[offset+index]=value.charCodeAt(index);};
 write(0,'RIFF');view.setUint32(4,bytes.length-8,true);write(8,'WAVE');write(12,'fmt ');
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
 view.setUint32(24,SAMPLE_RATE,true);view.setUint32(28,SAMPLE_RATE*2,true);
 view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,samples.length*2,true);
 for(let index=0;index<samples.length;index++){
  const sample=Math.max(-1,Math.min(1,samples[index]));
  view.setInt16(44+index*2,sample<0?Math.round(sample*32768):Math.round(sample*32767),true);
 }
 return bytes;
}

/** Decode the browser's recorded format and resample before the private upload. */
export async function assessmentWav(recording:Blob):Promise<File>{
 if(recording.size<1||recording.size>8_000_000)throw Error('audio_answer_file_invalid');
 const context=new AudioContext();
 try{
  const source=await context.decodeAudioData(await recording.arrayBuffer());
  if(!Number.isFinite(source.duration)||source.duration<0.25||source.duration>MAX_SECONDS+1)throw Error('audio_answer_duration_invalid');
  const length=Math.min(MAX_SECONDS*SAMPLE_RATE,Math.ceil(source.duration*SAMPLE_RATE));
  const offline=new OfflineAudioContext(1,length,SAMPLE_RATE);
  const node=offline.createBufferSource();node.buffer=source;node.connect(offline.destination);node.start();
  const rendered=await offline.startRendering();
  const wave=pcm16Wave(rendered.getChannelData(0));
  return new File([wave.buffer as ArrayBuffer], 'answer.wav',{type:'audio/wav'});
 }finally{await context.close().catch(()=>undefined);}
}
