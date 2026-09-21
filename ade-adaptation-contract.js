'use strict';
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const core=fs.readFileSync('core.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const checks=[
 ['persistent day signals',/function getDaySignals\(/.test(app)&&/lowEnergyDate/.test(core)],
 ['dynamic learned capacity',/getHistoricalCapacityFactor\(\)/.test(app)&&/day-outcome/.test(app)],
 ['anomalous samples excluded',/!s\.anomalous/.test(app)&&/!x\.anomalous/.test(app)],
 ['actual execution date load',/toISO\(new Date\(t\.completedAt\)\)===date/.test(app)&&/executedMinutes/.test(app)],
 ['system replan separated',/adaptationType='systemReplanned'/.test(app)&&/adaptationType='userPostponed'/.test(app)],
 ['day close snapshot',/recordDayOutcomeSnapshot\(todayISO\(\)\)/.test(app)],
 ['absence signal',/setDaySignal\(today,'absence',true\)/.test(app)],
 ['work focus keeps home',/\['home','work'\]\.includes\(state\.route\)/.test(app)&&/data-route="home"/.test(css)],
 ['ghost click close guard',/blockClickThroughUntil=performance\.now\(\)\+520/.test(app)],
 ['compact undo',/Undo is a compact floating pill/.test(css)],
 ['compact desktop tasks',/Compact task rows/.test(css)],
 ['settings accordion',/function initCompactSettings\(/.test(app)&&/settings-collapse-head/.test(css)]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}console.log(`${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
