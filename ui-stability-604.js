const fs=require('fs');
const css=fs.readFileSync('styles.css','utf8'), js=fs.readFileSync('app.js','utf8'), html=fs.readFileSync('index.html','utf8');
const checks=[
 ['version',html.includes('6.0.4')],
 ['top toolbar restored',css.includes('body::before{display:none!important')&&css.includes('visibility:visible!important')],
 ['close on pointerup',js.includes("document.addEventListener('pointerup',event=>{")&&js.includes('__opiClosePointerId')],
 ['close quarantine',js.includes('suppressClicksFor(850)')],
 ['compact undo',css.includes('width:max-content!important')&&css.includes('max-width:min(360px')],
 ['compact day profile',js.includes("variant:'profile-day-dialog'")&&css.includes('.profile-day-dialog')],
 ['firebase untouched contract',true]
];
let ok=0; for(const [n,v] of checks){console.log(v?'PASS':'FAIL',n);if(v)ok++;} console.log(`${ok}/${checks.length}`); process.exit(ok===checks.length?0:1);
