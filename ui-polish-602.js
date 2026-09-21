const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const checks=[
 ['same-route navigation is silent',app.includes('if(nextRoute===state.route){return;}')],
 ['calendar touch selector',app.includes('selectCalendarDateFromControl')&&app.includes('calendarWeekStrip,els.weekCapacityStrip,els.calendarGrid')],
 ['quick capture centered',css.includes('.modal-layer:has(.task-sheet){align-items:center!important')],
 ['quick capture expands progressively',css.includes('.task-sheet:has(.advanced-open)')&&app.includes("classList.toggle('advanced-open'")],
 ['settings start collapsed',app.includes('const open=false;section.classList.toggle')],
 ['crisp standalone header',css.includes('.topbar::before')&&css.includes('backdrop-filter:none!important')],
 ['compact mobile task rows',css.includes('min-height:48px!important')&&css.includes('font-size:12.5px!important')],
 ['version 6.0.2',html.includes('6.0.2')&&app.includes("sw.js?v=6.0.2")]
];
let ok=0;for(const [n,v] of checks){console.log(v?'PASS':'FAIL',n);if(v)ok++;}console.log(`${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
