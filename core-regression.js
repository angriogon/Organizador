'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync(require('path').join(__dirname,'..','core.js'),'utf8');
const context = { console, Intl, Date, Math, JSON, Number, String, Object, Array, RegExp, Infinity, crypto:{randomUUID:()=> 'test-id'} };
vm.createContext(context); vm.runInContext(source, context);
const run = code => vm.runInContext(code, context);
const cases = [
 ['2024-01-29',1,'2024-02-29'],['2024-01-30',1,'2024-02-29'],['2024-01-31',1,'2024-02-29'],
 ['2025-01-29',1,'2025-02-28'],['2025-01-30',1,'2025-02-28'],['2025-01-31',1,'2025-02-28'],
 ['2026-03-31',1,'2026-04-30'],['2026-05-31',1,'2026-06-30'],['2026-08-31',1,'2026-09-30'],
 ['2026-12-31',1,'2027-01-31'],['2026-03-31',-1,'2026-02-28']
];
for(const [iso,n,expected] of cases) assert.strictEqual(run(`addMonths('${iso}',${n})`),expected,`${iso} + ${n}m`);
assert.strictEqual(run("formatMinutes(null)"),'Sin estimar');
assert.strictEqual(run("formatMinutes(90)"),'1 h 30 min');
assert.strictEqual(run("parseTimeMinutes('09:30')"),570);
assert.strictEqual(run("minutesToTime(570)"),'09:30');
assert.strictEqual(run("addDays('2026-12-31',1)"),'2027-01-01');
console.log(`OPI core regression: ${cases.length + 5} checks OK`);
