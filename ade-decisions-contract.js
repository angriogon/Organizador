'use strict';
const fs=require('fs');
const app=fs.readFileSync(require('path').join(__dirname,'..','app.js'),'utf8');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const css=fs.readFileSync(require('path').join(__dirname,'..','styles.css'),'utf8');
const checks=[
 ['ADE decision entrypoint',/function getADEDecision\(/],
 ['stable focus hysteresis',/taskScore\(task\)>taskScore\(lowest\)\+10/],
 ['large task protection',/protege una tarea de trabajo profundo/],
 ['context continuity',/mantiene el contexto actual/],
 ['real gaps',/function getUsableGaps\(/],
 ['minimal intervention',/getMoveSuggestions\(todayISO\(\),85\)/],
 ['decision reasons',/recommendation-reason/],
 ['keyboard lock',/keyboardShortcutsLocked/],
 ['zoom lock',/user-scalable=no/],
 ['iOS visual viewport',/syncIOSVisualViewport/],
 ['relative calendar labels',/Pasado mañana/],
 ['organized settings',/settings-organized/]
];
let pass=0; for(const [name,re] of checks){const hay=re.test(app)||re.test(html)||re.test(css); console.log(`${hay?'PASS':'FAIL'} ${name}`);if(hay)pass++;}
console.log(`${pass}/${checks.length}`);process.exitCode=pass===checks.length?0:1;
