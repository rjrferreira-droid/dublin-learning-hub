import {silentMp3} from './silent-mp3.ts';

export type Mp3CuePart=Readonly<{kind:'speech';bytes:Uint8Array}|{kind:'silence';durationMs:number}>;

type Format=Readonly<{sampleRate:number;channels:number;mpegVersion:number}>;
type Parsed=Readonly<{frames:readonly Uint8Array[];format:Format}>;

const BITRATES_MPEG1=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320];
const BITRATES_MPEG2=[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
const RATES=[44100,48000,32000];

/** MP3 speech responses are independent files. Remove per-file tags and Xing
 * seek tables before joining complete frames into one decodable stream. */
function parseMp3(bytes:Uint8Array):Parsed{
 if(bytes.length<4)throw Error('audio_mp3_invalid');
 let offset=0;
 while(bytes[offset]===0x49&&bytes[offset+1]===0x44&&bytes[offset+2]===0x33){
  if(offset+10>bytes.length||bytes[offset+3]<2||bytes[offset+3]>4
    ||[6,7,8,9].some(index=>(bytes[offset+index]&0x80)!==0))throw Error('audio_mp3_invalid');
  const size=(bytes[offset+6]<<21)|(bytes[offset+7]<<14)|(bytes[offset+8]<<7)|bytes[offset+9];
  offset+=10+size+((bytes[offset+5]&0x10)!==0?10:0);
  if(offset>=bytes.length)throw Error('audio_mp3_invalid');
 }
 let format:Format|undefined;
 const frames:Uint8Array[]=[];
 while(offset<bytes.length){
  // Some encoders append a 128-byte ID3v1 tag. It is metadata, not audio.
  if(bytes.length-offset===128&&bytes[offset]===0x54&&bytes[offset+1]===0x41&&bytes[offset+2]===0x47)break;
  if(offset+4>bytes.length||bytes[offset]!==0xff||(bytes[offset+1]&0xe0)!==0xe0)throw Error('audio_mp3_invalid');
  const version=(bytes[offset+1]>>3)&3,layer=(bytes[offset+1]>>1)&3;
  const bitrateIndex=bytes[offset+2]>>4,sampleIndex=(bytes[offset+2]>>2)&3;
  if(version===1||layer!==1||bitrateIndex===0||bitrateIndex===15||sampleIndex===3)throw Error('audio_mp3_invalid');
  const sampleRate=RATES[sampleIndex]/(version===3?1:version===2?2:4);
  const channels=(bytes[offset+3]&0xc0)===0xc0?1:2;
  const bitrate=(version===3?BITRATES_MPEG1:BITRATES_MPEG2)[bitrateIndex];
  const size=Math.floor((version===3?144:72)*bitrate*1000/sampleRate)+((bytes[offset+2]>>1)&1);
  if(size<24||offset+size>bytes.length)throw Error('audio_mp3_invalid');
  const next={sampleRate,channels,mpegVersion:version};
  if(format&&(next.sampleRate!==format.sampleRate||next.channels!==format.channels||next.mpegVersion!==format.mpegVersion))
    throw Error('audio_mp3_format_mismatch');
  format=next;
  const frame=bytes.slice(offset,offset+size);
  let isSeekTable=false;
  if(frames.length===0){
   const sideInfo=version===3?(channels===1?17:32):(channels===1?9:17);
   const xingAt=4+((frame[1]&1)===0?2:0)+sideInfo;
   const marker=String.fromCharCode(...frame.subarray(xingAt,xingAt+4));
   // A standalone Xing/Info frame contains duration and seek data for only
   // one response; dropping the entire metadata frame avoids a small gap or
   // stray data at every dialogue boundary.
   if(marker==='Xing'||marker==='Info')isSeekTable=true;
   const vbriAt=4+32;
   if(String.fromCharCode(...frame.subarray(vbriAt,vbriAt+4))==='VBRI')isSeekTable=true;
  }
  if(!isSeekTable)frames.push(frame);
  offset+=size;
 }
 if(!format||frames.length<2)throw Error('audio_mp3_invalid');
 return {frames,format};
}

/** Reject an incompatible paid response immediately, before dispatching the
 * remaining turns. The authored silence is 24 kHz mono MPEG-2 Layer III. */
export function validateEpisodeSpeechMp3(bytes:Uint8Array):void{
 const format=parseMp3(bytes).format;
 if(format.sampleRate!==24000||format.channels!==1||format.mpegVersion!==2)
  throw Error('audio_mp3_format_mismatch');
}

/** Compose only matching MPEG Layer III frames; never concatenate MP3 files
 * with their repeated ID3 and duration tables in the middle of the episode. */
export function composeMp3Cues(parts:readonly Mp3CuePart[],maxBytes:number):Uint8Array{
 if(!parts.length)throw Error('audio_mp3_invalid');
 let outputFormat:Format|undefined,total=0;
 const frames:Uint8Array[]=[];
 for(const part of parts){
  const decoded=parseMp3(part.kind==='speech'?part.bytes:silentMp3(part.durationMs));
  const format=decoded.format;
  if(outputFormat&&(format.sampleRate!==outputFormat.sampleRate||format.channels!==outputFormat.channels
    ||format.mpegVersion!==outputFormat.mpegVersion))throw Error('audio_mp3_format_mismatch');
  outputFormat=format;
  for(const frame of decoded.frames){
   total+=frame.length;if(total>maxBytes)throw Error('audio_mp3_too_large');
   frames.push(frame);
  }
 }
 const result=new Uint8Array(total);let offset=0;
 for(const frame of frames){result.set(frame,offset);offset+=frame.length;}
 return result;
}
