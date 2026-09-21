const fs=require('fs');
const css=fs.readFileSync('styles.css','utf8');
const js=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const checks=[
 ['version',html.includes('6.0.3')&&js.includes('sw.js?v=6.0.3')],
 ['opaque ios chrome',css.includes('completely opaque top chrome')&&css.includes('background-image:none!important')],
 ['closing absorbs taps',css.includes('.modal-layer.is-closing,.now-mode.is-closing{opacity:0!important;pointer-events:auto!important}')],
 ['close quarantine',js.includes('state.blockClickThroughUntil=performance.now()+700')&&js.includes('Global post-close quarantine')],
 ['quick capture content sized',css.includes('.task-sheet:not(:has(.advanced-open)){height:auto!important')],
 ['settings quiet index',css.includes('Settings v6.0.3: quiet index')&&css.includes('.settings-sheet .settings-intro{display:none!important}')],
];
let ok=0;for(const [n,v] of checks){console.log(`${v?'PASS':'FAIL'} ${n}`);if(v)ok++;}console.log(`${ok}/${checks.length}`);process.exit(ok===checks.length?0:1);
