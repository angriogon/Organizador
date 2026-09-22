const fs=require('fs');
const core=fs.readFileSync('core.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const checks=[
 ['Firebase SDK is published 12.19.0', /FIREBASE_SDK_VERSION\s*=\s*'12\.19\.0'/.test(core)],
 ['Firebase config detection remains', /function isCloudConfigured\(\)/.test(app)],
 ['Auth unavailable message no longer falsely says unconfigured', /Firebase aún no está disponible/.test(app)],
 ['Service worker version 6.0.6', /opi-v6\.0\.6/.test(sw)]
];
for(const [name,ok] of checks){if(!ok)throw new Error(name);console.log('PASS',name)}
console.log(`${checks.length}/${checks.length}`);
