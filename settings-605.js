const fs=require('fs');
const app=fs.readFileSync('app.js','utf8'), css=fs.readFileSync('styles.css','utf8'), html=fs.readFileSync('index.html','utf8');
const checks=[
 ['version',html.includes('6.0.5')],
 ['native index',app.includes("className='settings-index'" )],
 ['six groups',['Tu día','Apariencia','Sincronización','Privacidad y seguridad','Datos y copias','Aplicación'].every(x=>app.includes(x))],
 ['detail navigation',app.includes('settings-detail')&&app.includes('settings-back')],
 ['existing save preserved',app.includes("els.settingsForm.addEventListener('submit'")],
 ['minimal css',css.includes('Settings proposal A')&&css.includes('.settings-index-row')]
];
checks.forEach(([n,ok])=>{if(!ok)throw new Error(n);console.log('PASS',n)});console.log(`${checks.length}/${checks.length}`);
