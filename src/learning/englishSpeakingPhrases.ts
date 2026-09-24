import {ENGLISH_E1_MODEL_ID,ENGLISH_P1_MODEL_ID} from './localEnglishLessonRegistry.ts';
import {VIVIANE_ENGLISH_IDENTITIES} from './vivianeEnglishLessonRegistry.ts';

export type SpeakingPhrase={text:string;focus:string};
const story:readonly SpeakingPhrase[]=[
 ['Nora got off the bus at Riverside.','Clear final consonants'],['She was looking for the community centre.','Linking: was looking'],
 ['The rain was getting heavier.','Stress: rain, heavier'],['Sam asked if she needed help.','Linking: asked if'],
 ['Nora had chosen the wrong Riverside.','Reduced had'],['The talk had already started.','Stress: already started'],
 ['She walked past a row of houses.','Final sounds'],['When she checked the street name, she understood.','Thought groups'],
 ['Sam showed her the correct route.','Stress: correct route'],['She reached the venue after the talk began.','Sentence rhythm'],
 ['The organiser opened the side door.','Linking: opened the'],['Nora explained what had happened.','Reduced had'],
 ['The event page needed a clearer landmark.','Stress: clearer landmark'],['In the end, they improved the directions.','Thought groups'],
 ['How did Nora find the correct place?','Question rhythm'],['Did Sam come to the exhibition later?','Weak did'],
 ['What happened while she was waiting?','Linking: while she'],['Why had she selected that location?','Reduced had'],
 ['I was checking the address when he called.','Contrast: background and event'],['I had saved the wrong address before I left.','Contrast: earlier event'],
].map(([text,focus])=>({text,focus}));
const meeting:readonly SpeakingPhrase[]=[
 ['Could we confirm which report you are using?','Question rhythm'],['Could you walk me through the final upload?','Linking: walk me'],
 ['Do we know whether the mapping changed?','Stress: mapping changed'],['Could you confirm when the file was approved?','Embedded question rhythm'],
 ['The two reports used different cut-off times.','Stress: different cut-off'],['The journal may have caused the difference.','Reduced may have'],
 ['The cause is still being checked.','Stress: still'],['I will reconcile the two sources.','Linking: reconcile the'],
 ['I will return with the evidence by three.','Stress: evidence, three'],['Just to check, I will send the exceptions today.','Thought groups'],
 ['Have I captured the next step correctly?','Question rhythm'],['Which period does the figure cover?','Final consonants'],
 ['The variance starts in May.','Stress: May'],['We should check the source before deciding.','Reduced should'],
 ['I have confirmed the cut-off time.','Stress: confirmed'],['The mapping file also changed.','Linking: file also'],
 ['Would you check the approval time?','Polite request rhythm'],['We will decide after Theo validates the mapping.','Thought groups'],
 ['This is a timing difference, not a confirmed error.','Contrastive stress'],['The owner, evidence and deadline are now clear.','List rhythm'],
].map(([text,focus])=>({text,focus}));
const plans:readonly SpeakingPhrase[]=[
 ['It has turned chilly, hasn’t it?','Tag question rhythm'],['Are you still going to the market?','Question rhythm'],
 ['We are meeting by the canal at two.','Stress: canal, two'],['I am going to bring a coat.','Reduced going to'],
 ['Those clouds look heavy.','Stress: clouds, heavy'],['The forecast says there may be showers.','Weak there may be'],
 ['If it stays light, we will walk.','Conditional thought groups'],['If it gets worse, we could go inside.','Contrastive stress'],
 ['Shall we meet inside the station?','Linking: shall we'],['I will check the forecast at one.','Stress: one'],
 ['The bus arrives at one forty-five.','Number rhythm'],['If it is delayed, I will message you.','Conditional thought groups'],
 ['I might arrive a few minutes early.','Reduced might'],['The indoor market is our backup plan.','Stress: backup plan'],
 ['Are we still meeting at two?','Question rhythm'],['We could wait until the showers stop.','Linking: wait until'],
 ['I was going to walk, but I may take the bus.','Contrastive stress'],['That sounds good to me.','Linking: good to'],
 ['Inside the station at two, then.','Confirmation rhythm'],['If the weather changes, we will decide together.','Thought groups'],
].map(([text,focus])=>({text,focus}));

export function englishSpeakingPhrasesFor(lessonId:string):readonly SpeakingPhrase[]{
 if(lessonId===ENGLISH_E1_MODEL_ID||lessonId===VIVIANE_ENGLISH_IDENTITIES.VE1.id)return story;
 if(lessonId===ENGLISH_P1_MODEL_ID)return meeting;
 if(lessonId===VIVIANE_ENGLISH_IDENTITIES.VE2.id)return plans;
 return [];
}
