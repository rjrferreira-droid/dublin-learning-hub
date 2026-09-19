import fs from 'node:fs';
if(process.env.GITHUB_REF_NAME!=='feat/professor-experience-2026-09-13')throw new Error('wrong_branch');
const app='src/App.tsx';let s=fs.readFileSync(app,'utf8');
const start=s.indexOf('function InlineProfessorPanel('),end=s.indexOf('function Signal(',start);
if(start>=0){if(end<start)throw new Error('inline_panel_boundary_missing');s=s.slice(0,start)+s.slice(end);fs.writeFileSync(app,s);}
const workspace='src/components/LessonProfessorWorkspace.tsx';s=fs.readFileSync(workspace,'utf8');s=s.replace('The microphone and usage continue until you mute or end it.','Switching tabs does not pause usage. Muting affects only the microphone; End session disconnects.');fs.writeFileSync(workspace,s);
console.log('Removed the duplicate unused inline panel and clarified mute-versus-usage language.');
