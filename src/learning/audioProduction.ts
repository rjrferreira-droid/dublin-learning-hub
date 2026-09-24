export type AudioVoice='marin'|'coral'|'onyx'|'echo';
export type AudioCue=
 | Readonly<{kind:'speech';speaker:string;voice:AudioVoice;text:string}>
 | Readonly<{kind:'silence';durationMs:number}>;

const VOICES:Readonly<Record<string,AudioVoice>>={
 host:'marin',narrator:'marin',Nora:'coral',Sam:'onyx',
 NIAMH:'coral',RAFAEL:'onyx',THEO:'echo',CIARA:'coral',VIVIANE:'onyx',
};

function speech(speaker:string,text:string):AudioCue{
 const clean=text.replace(/\s*\[Pause\s+\d+\s+seconds?\.\]/gi,'').trim();
 if(!clean||/^(?:HOST:|pause\s+\d+\s+seconds?)/i.test(clean))throw Error('audio_production_direction_in_speech');
 if(Array.from(clean).length>4096)throw Error('audio_speech_cue_too_long');
 return {kind:'speech',speaker,voice:VOICES[speaker]??'marin',text:clean};
}

/** Retains the cast and real pauses without sending labels or timing instructions to TTS. */
export function structuredAudioCues(segments:readonly {lines:readonly {voice:string;text:string;pauseMs?:number}[]}[]):readonly AudioCue[]{
 const cues:AudioCue[]=[];
 for(const segment of segments)for(const line of segment.lines){
  cues.push(speech(line.voice,line.text));
  if(line.pauseMs){if(!Number.isSafeInteger(line.pauseMs)||line.pauseMs<0||line.pauseMs>15000)throw Error('audio_pause_invalid');cues.push({kind:'silence',durationMs:line.pauseMs});}
 }
 return cues;
}

/** Older English units author a dialogue as one paragraph of SPEAKER: turns. */
export function labelledDialogueCues(script:string,speakers:readonly string[]):readonly AudioCue[]{
 const labels=[...script.matchAll(/\b([A-Z][A-Z]+):\s*/g)].filter(match=>speakers.includes(match[1]));
 if(!labels.length)throw Error('audio_dialogue_speakers_missing');
 const cues:AudioCue[]=[];
 for(let index=0;index<labels.length;index++){
  const label=labels[index],start=label.index!+label[0].length,end=labels[index+1]?.index??script.length;
  cues.push(speech(label[1],script.slice(start,end)));
 }
 return cues;
}

export function narratedCue(text:string):AudioCue{return speech('narrator',text);}
