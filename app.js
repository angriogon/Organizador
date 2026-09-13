'use strict';

const STORAGE_KEY = 'opi_tasks_v2';
const LEGACY_STORAGE_KEY = 'opi_tasks_v1';
const SETTINGS_KEY = 'opi_settings_v2';
const EXTERNAL_EVENTS_KEY = 'opi_external_events_v2';
const UI_KEY = 'opi_ui_v3';
const CACHE_VERSION = '5.0.2';
const SYNC_META_KEY = 'opi_sync_meta_v41';
const CLOUD_BACKUP_PREFIX = 'opi_prefirebase_backup_v41_';
const CLOUD_SCHEMA_VERSION = 5;
const DATA_SCHEMA_VERSION = 5;
const DATA_SCHEMA_KEY = 'opi_schema_version';
const LEARNING_KEY = 'opi_learning_v50';
const SECURITY_KEY = 'opi_security_v50';
const FIREBASE_SDK_VERSION = '12.18.0';

const DEFAULT_SETTINGS = { name: 'Angel', dailyCapacity: 450, haptics: true, weekendMode: true, theme: 'neutral', defaultProfile: 'normal', privacyMode: false, intelligentMode: true, bufferPercent: 15, maxHighPerDay: 2, workFreeWeekend: false, appearance: 'system' };
const DEFAULT_UI = { focus: { date: '', ids: [] }, gestureUses: 0, celebratedDate: '', reminderNotified: {}, tightDayDate: '', dayProfileDate: '', dayProfile: 'normal', activeNowTaskId: '', activeNowStartedAt: '', lastOpenedDate: '', lastOpenedAt: '', recoveryPendingDays: 0, commandKnown: false, planningWeekStart: '', smartList: '', advancedTaskOpen: false, onboardingLevel: 0, lastAutoBackupAt: '' };
const DEFAULT_LEARNING = { durationSamples: [], decisions: [], completionHours: {}, lastInsightAt: '', categoryHints: {}, contextStats: {}, weeklySnapshots: [], pauseReasons: {}, taskTemplates: {}, correctionHints: {}, actualSessions: [] };
const DEFAULT_SECURITY = { enabled: false, pinHash: '', biometricCredentialId: '' };
const CATEGORY_LABELS = { work: 'Trabajo', personal: 'Vida personal / vivienda', study: 'Estudios' };
const CATEGORY_SHORT = { work: 'Trabajo', personal: 'Personal', study: 'Estudios' };
const PRIORITY_LABELS = { low: 'Baja', medium: 'Media', high: 'Alta' };
const ENERGY_LABELS = { low: 'Baja', normal: 'Normal', high: 'Alta' };
const ICON = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;

function loadSyncMeta() {
  try {
    const raw = JSON.parse(localStorage.getItem(SYNC_META_KEY) || '{}');
    const deviceId = raw.deviceId || (crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const value = { deviceId, userId: raw.userId || '', revision: Number(raw.revision || 0), lastSyncAt: raw.lastSyncAt || '' };
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(value));
    return value;
  } catch (_) {
    return { deviceId: `device-${Date.now()}-${Math.random().toString(16).slice(2)}`, userId: '', revision: 0, lastSyncAt: '' };
  }
}
function saveSyncMeta(meta) {
  try { localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta)); } catch (_) {}
}
function loadLearning(){ try{return {...DEFAULT_LEARNING,...JSON.parse(localStorage.getItem(LEARNING_KEY)||'{}')};}catch(_){return deepClone(DEFAULT_LEARNING);} }
function saveLearning(){ try{localStorage.setItem(LEARNING_KEY,JSON.stringify(state.learning));}catch(_){} }
function loadSecurity(){ try{return {...DEFAULT_SECURITY,...JSON.parse(localStorage.getItem(SECURITY_KEY)||'{}')};}catch(_){return {...DEFAULT_SECURITY};} }
function saveSecurity(){ try{localStorage.setItem(SECURITY_KEY,JSON.stringify(state.security));}catch(_){} }
function maybePersistDailyBackup(){
  try{if(typeof state==='undefined'||!state.tasks)return;const key='opi_auto_backup_v50',today=new Date().toISOString().slice(0,10),existing=JSON.parse(localStorage.getItem(key)||'{}');if(existing.date===today)return;localStorage.setItem(key,JSON.stringify({date:today,schemaVersion:DATA_SCHEMA_VERSION,tasks:state.tasks,settings:state.settings}));state.ui.lastAutoBackupAt=new Date().toISOString();}catch(_){}
}
function migrateSchema(){
  const current=Number(localStorage.getItem(DATA_SCHEMA_KEY)||1);
  if(current<2){ /* versiones históricas ya se normalizan en loadTasks */ }
  localStorage.setItem(DATA_SCHEMA_KEY,String(DATA_SCHEMA_VERSION));
}
migrateSchema();
const INITIAL_SYNC_META = loadSyncMeta();

const state = {
  route: 'home',
  taskFilter: 'open',
  tasks: loadTasks(),
  settings: loadSettings(),
  ui: loadUI(),
  learning: loadLearning(),
  security: loadSecurity(),
  externalEvents: loadExternalEvents(),
  calendarCursor: startOfMonth(new Date()),
  calendarSelectedDate: todayISO(),
  googleAccessToken: null,
  quickMode: null,
  lowEnergyMode: false,
  nowTaskId: null,
  nowQueue: [],
  sequenceCandidateIds: [],
  pendingSnoozeReason: 'time',
  undo: null,
  undoStack: [],
  conflicts: [],
  simulation: null,
  planningSelection: new Set(),
  speech: null,
  installPrompt: null,
  pendingSpaceSuggestions: [],
  suppressClickUntil: 0,
  blockClickThroughUntil: 0,
  fabLongPressed: false,
  sync: {
    firebase: null, app: null, auth: null, db: null, user: null, status: 'off', detail: '',
    deviceId: INITIAL_SYNC_META.deviceId, applyingRemote: false, initialized: false, connecting: false,
    syncTimer: null, activeUserId: '', unsubTasks: null, unsubMeta: null,
    baselineTasks: new Map(), baselineMeta: '', syncInFlight: false, forceRetry: false
  }
};

const ids = [
  'currentDate','pageTitle','capacityRing','homeView','tasksView','calendarView','planningView','planningInsight','planningWeekBoard','riskList','smartLists','outcomeList','premiumInsight','yearHeatmap','planningBalanceBtn','planningCleanBtn','newOutcomeBtn','homeCard','greeting','adaptiveLine','loadEmoji','loadPercent','loadStatus','capacityContext','dayProfileBtn','dayProfileLabel','loadBar','focusHeadingText','focusProgress','topThreeList','startNextBtn','lowEnergyBtn','tightDayBtn','smartRecommendation','miniAgendaText','miniAgendaOpen','gapChips','gestureHint','smartResults','smartResultsTitle','contextGroupSummary','smartTaskList','sequenceStartBtn','categoryTitle','categoryTaskList','categoryEmpty','calendarMonthTitle','calendarGrid','calendarWeekStrip','weekCapacityStrip','dayAgendaTitle','dayAgendaLoad','dayAgendaList','contextIsland','fab','fabMenu','taskSheet','taskForm','taskSheetKicker','taskSheetTitle','taskEditId','taskTitle','taskCategory','taskDuration','taskScheduledDate','taskScheduledTime','taskDeadline','taskRecurrence','taskPriority','taskEnergy','taskTodayPriority','taskNonNegotiable','taskProject','taskOutcome','taskDependsOn','taskContext','taskAdvancedToggle','taskAdvancedFields','taskDateCycle','taskPriorityCycle','taskVoiceBtn','quickVoiceBtn','taskHistoryBtn','taskCapacityPreview','quickSheet','quickForm','quickTaskInput','reminderSheet','reminderForm','reminderTitle','reminderDate','reminderTime','reminderCategory','actionSheet','actionSheetContent','settingsSheet','settingsForm','settingsName','settingsCapacity','settingsHaptics','settingsWeekendMode','settingsTheme','settingsDefaultProfile','settingsPrivacyMode','settingsIntelligentMode','settingsBuffer','settingsMaxHigh','settingsWorkFreeWeekend','settingsAppearance','openTrashBtn','exportCsvBtn','autoBackupBtn','syncIssueBadge','syncStateDot','syncAccountStatus','syncDeviceStatus','syncAuthPanel','syncEmail','syncPassword','syncSignInBtn','syncCreateBtn','syncResetBtn','syncSignedPanel','syncNowBtn','syncSignOutBtn','googleSyncStatus','icsFileInput','installAppBtn','installAppStatus','localLockBtn','localLockStatus','biometricSetupBtn','biometricStatus','localBiometricBtn','exportBackupBtn','importBackupBtn','backupFileInput','resetAppBtn','nowMode','nowTaskTitle','nowTaskMeta','nowCompleteBtn','nowPauseBtn','nowSnoozeBtn','nowNextBtn','nowMoreBtn','privacyCurtain','localLockScreen','localLockPin','localUnlockBtn','localLockError','undoBar','undoText','undoBtn','toast'
];
const els = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch (_) { return { ...DEFAULT_SETTINGS }; }
}
function loadUI() {
  try {
    const raw = JSON.parse(localStorage.getItem(UI_KEY) || '{}');
    return { ...DEFAULT_UI, ...raw, focus: { ...DEFAULT_UI.focus, ...(raw.focus || {}) }, reminderNotified: raw.reminderNotified || {} };
  } catch (_) { return deepClone(DEFAULT_UI); }
}
function loadExternalEvents() {
  try { const data = JSON.parse(localStorage.getItem(EXTERNAL_EVENTS_KEY)); return Array.isArray(data) ? data : []; }
  catch (_) { return []; }
}
function loadTasks() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(current)) return current.map(normalizeTask);
  } catch (_) {}
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (Array.isArray(legacy) && legacy.length) {
      const migrated = legacy.map(task => normalizeTask({
        ...task,
        scheduledDate: task.dueDate || '',
        deadline: task.dueDate || '',
        duration: ({1:15,2:30,3:60})[Number(task.effort)] || 30,
        energy: 'normal', snoozeCount: 0
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (_) {}
  const today = todayISO();
  return [
    createTask({ title: 'Revisar prioridades del día', category: 'work', priority: 'high', scheduledDate: today, deadline: today, duration: 20, energy: 'normal', recurrence: 'daily' }),
    createTask({ title: 'Estudiar 30 minutos sin distracciones', category: 'study', priority: 'medium', scheduledDate: today, duration: 30, energy: 'high', recurrence: 'daily' }),
    createTask({ title: 'Comprar lo necesario para casa', category: 'personal', priority: 'medium', scheduledDate: addDays(today, 1), duration: 25, energy: 'low', recurrence: 'none' })
  ];
}
function normalizeTask(task) {
  return {
    id: task.id || uid(),
    title: String(task.title || 'Tarea').trim(),
    category: ['work','personal','study'].includes(task.category) ? task.category : 'personal',
    priority: ['low','medium','high'].includes(task.priority) ? task.priority : 'medium',
    scheduledDate: task.scheduledDate || task.dueDate || '',
    scheduledTime: task.scheduledTime || '',
    deadline: task.deadline || '',
    duration: Math.max(5, Number(task.duration || 30)),
    energy: ['low','normal','high'].includes(task.energy) ? task.energy : 'normal',
    recurrence: ['none','daily','weekly','flex-weekly','monthly'].includes(task.recurrence) ? task.recurrence : 'none',
    snoozeCount: Number(task.snoozeCount || 0),
    postponeAlertedAtCount: Number(task.postponeAlertedAtCount || 0),
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completedAt || null,
    archivedAt: task.archivedAt || null,
    parentId: task.parentId || null,
    googleEventId: task.googleEventId || null,
    kind: task.kind === 'reminder' ? 'reminder' : 'task',
    inbox: Boolean(task.inbox),
    todayPriorityUntil: task.todayPriorityUntil || '',
    nonNegotiableDate: task.nonNegotiableDate || '',
    startedAt: task.startedAt || '',
    actualDuration: Number(task.actualDuration || 0),
    modifiedAt: task.modifiedAt || task.createdAt || new Date().toISOString(),
    lastDecisionReason: task.lastDecisionReason || '',
    lastDeviceId: task.lastDeviceId || task.deviceId || '',
    deletedAt: task.deletedAt || null,
    project: String(task.project || '').trim(),
    outcome: String(task.outcome || '').trim(),
    dependsOnId: task.dependsOnId || '',
    context: ['focus','admin','home','out',''].includes(task.context) ? task.context : '',
    flexibleWeeklyCount: Math.max(1, Number(task.flexibleWeeklyCount || 3)),
    history: Array.isArray(task.history) ? task.history.slice(-20) : [],
    sessions: Array.isArray(task.sessions) ? task.sessions.slice(-30) : [],
    pausedAt: task.pausedAt || '',
    restoredAt: task.restoredAt || '',
    subtasks: Array.isArray(task.subtasks) ? task.subtasks.map(s => ({ id: s.id || uid(), title: String(s.title || '').trim(), completedAt: s.completedAt || null })).filter(s => s.title) : []
  };
}
function createTask(data) {
  return normalizeTask({ id: uid(), createdAt: new Date().toISOString(), completedAt: null, archivedAt: null, snoozeCount: 0, postponeAlertedAtCount: 0, subtasks: [], ...data });
}
function saveAll({ skipSync = false } = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  localStorage.setItem(EXTERNAL_EVENTS_KEY, JSON.stringify(state.externalEvents));
  localStorage.setItem(UI_KEY, JSON.stringify(state.ui));
  localStorage.setItem(DATA_SCHEMA_KEY, String(DATA_SCHEMA_VERSION));
  saveLearning();
  saveSecurity();
  maybePersistDailyBackup();
  if (!skipSync && !state.sync.applyingRemote) scheduleCloudPush();
}
function saveUI() { localStorage.setItem(UI_KEY, JSON.stringify(state.ui)); }

function todayISO() { return toISO(new Date()); }
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function parseISODate(iso) { if (!iso) return null; const [y,m,d] = iso.split('-').map(Number); return new Date(y,m-1,d); }
function addDays(iso,n) { const d = parseISODate(iso || todayISO()); d.setDate(d.getDate()+n); return toISO(d); }
function addMonths(iso,n) { const d = parseISODate(iso || todayISO()); d.setMonth(d.getMonth()+n); return toISO(d); }
function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function formatMinutes(minutes) {
  const m = Math.max(0,Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m/60), r = m%60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
function formatDate(iso, long = false) {
  if (!iso) return 'Sin fecha';
  if (iso === todayISO()) return 'Hoy';
  if (iso === addDays(todayISO(),1)) return 'Mañana';
  return new Intl.DateTimeFormat('es-ES', long ? {weekday:'short',day:'numeric',month:'short'} : {day:'numeric',month:'short'}).format(parseISODate(iso));
}
function weekdayName(iso) { return new Intl.DateTimeFormat('es-ES',{weekday:'long'}).format(parseISODate(iso)).replace(/^./,c=>c.toUpperCase()); }
function dayDistance(iso) { if (!iso) return Infinity; return Math.round((parseISODate(iso)-parseISODate(todayISO()))/86400000); }
function isOverdueDeadline(task) { return Boolean(task.deadline && task.deadline < todayISO()); }
function activeTasks() { return state.tasks.filter(t => !t.completedAt && !t.archivedAt && !t.deletedAt); }
function tasksOn(date) { return activeTasks().filter(t => t.scheduledDate === date); }
function completedToday() { return state.tasks.filter(t => t.completedAt && toISO(new Date(t.completedAt)) === todayISO()); }
function parseTimeMinutes(time) { if (!time || !/^\d{2}:\d{2}$/.test(time)) return null; const [h,m]=time.split(':').map(Number); return h*60+m; }
function minutesToTime(value) { const n=Math.max(0,Math.min(1439,Math.round(value))); return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; }
function isMobile() { return matchMedia('(max-width: 760px)').matches; }
function reduceMotion() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

function getBusyMinutes(date) {
  const intervals=[]; let fallback=0;
  state.externalEvents.filter(e=>e.date===date&&Number(e.duration||0)>0).forEach(e=>{
    const start=externalStartMinutes(e),duration=Number(e.duration||0);
    if(start===null) fallback+=duration; else intervals.push([Math.max(0,start),Math.min(1440,start+duration)]);
  });
  intervals.sort((a,b)=>a[0]-b[0]); const merged=[];
  for(const interval of intervals){const last=merged.at(-1);if(!last||interval[0]>last[1])merged.push([...interval]);else last[1]=Math.max(last[1],interval[1]);}
  return fallback+merged.reduce((sum,[a,b])=>sum+Math.max(0,b-a),0);
}
function profileMultiplier(date){
  const profile=(state.ui.dayProfileDate===date?state.ui.dayProfile:state.settings.defaultProfile)||'normal';
  return {normal:1,intense:1.15,light:.78,rest:.52}[profile]||1;
}
function isWeekendDate(date){const d=parseISODate(date);return d&&[0,6].includes(d.getDay());}
function getDayCapacity(date) {
  let base=Math.max(60, Number(state.settings.dailyCapacity||450)-getBusyMinutes(date));
  base*=profileMultiplier(date);
  if(state.ui.tightDayDate===date)base*=.65;
  if(state.settings.weekendMode&&isWeekendDate(date))base*=.88;
  const buffer=Math.max(0,Math.min(35,Number(state.settings.bufferPercent||0)))/100;
  if(state.settings.intelligentMode)base*=1-buffer;
  return Math.max(45,Math.round(base));
}
function getDurationRatio(category){
  const samples=(state.learning.durationSamples||[]).filter(s=>s.category===category&&Number(s.estimated)>0&&Number(s.actual)>0).slice(-18);
  if(samples.length<3)return 1;
  const ratios=samples.map(s=>Math.max(.5,Math.min(2.2,s.actual/s.estimated))).sort((a,b)=>a-b);
  const core=ratios.length>6?ratios.slice(1,-1):ratios;
  return Math.max(.75,Math.min(1.75,core.reduce((a,b)=>a+b,0)/core.length));
}
function predictedDuration(task){return Math.max(5,Math.round(Number(task.duration||30)*getDurationRatio(task.category)));}
function effectiveTaskLoadMinutes(task){
  const energy={low:.82,normal:1,high:1.24}[task.energy]||1;
  const priority={low:.92,medium:1,high:1.12}[task.priority]||1;
  const protectedToday=(task.nonNegotiableDate===todayISO()||task.todayPriorityUntil===todayISO())?1.04:1;
  return Math.round(predictedDuration(task)*energy*priority*protectedToday);
}
function getDayLoad(date, extraMinutes=0, excludeTaskId=null) {
  const dayTasks=tasksOn(date).filter(t=>t.id!==excludeTaskId);
  const planned=dayTasks.reduce((sum,t)=>sum+Number(t.duration||0),0)+extraMinutes;
  const mental=dayTasks.reduce((sum,t)=>sum+effectiveTaskLoadMinutes(t),0)+extraMinutes;
  const capacity=getDayCapacity(date);
  return { planned, mental, capacity, percent: Math.round((mental/capacity)*100), busy:getBusyMinutes(date) };
}
function loadStatus(percent) {
  if (percent <= 35) return {label:'Día ligero',short:'Ligero',emoji:'😌',level:'light'};
  if (percent <= 70) return {label:'Equilibrado',short:'Equilibrado',emoji:'🙂',level:'balanced'};
  if (percent <= 100) return {label:'Cargado',short:'Cargado',emoji:'😅',level:'busy'};
  return {label:'Sobrecargado',short:'Sobrecargado',emoji:'🫠',level:'over'};
}

function isTaskBlocked(task){
  if(!task?.dependsOnId)return false;
  const dep=state.tasks.find(t=>t.id===task.dependsOnId);
  return Boolean(dep && !dep.completedAt && !dep.deletedAt && !dep.archivedAt);
}
function taskScore(task) {
  let score = {high:42,medium:22,low:7}[task.priority] || 0;
  const today=todayISO(),hour=new Date().getHours();
  if(isTaskBlocked(task))score-=250;
  if(task.todayPriorityUntil===today)score+=55;
  if(task.nonNegotiableDate===today)score+=70;
  if(task.inbox)score-=18;
  if(task.kind==='reminder')score+=8;
  if(task.deadline){const days=dayDistance(task.deadline);if(days<0)score+=120+Math.min(30,Math.abs(days)*5);else if(days===0)score+=75;else if(days===1)score+=42;else if(days<=7)score+=Math.max(8,30-days*3);}
  if(task.scheduledDate){const days=dayDistance(task.scheduledDate);if(days<0)score+=48;else if(days===0)score+=58;else if(days===1)score+=19;}
  if(task.scheduledDate===today&&task.scheduledTime){const now=hour*60+new Date().getMinutes(),diff=parseTimeMinutes(task.scheduledTime)-now;if(diff>=-30&&diff<=120)score+=24;}
  score+=Math.min(40,task.snoozeCount*8);
  if(predictedDuration(task)<=30)score+=6;
  if(task.recurrence!=='none')score+=2;
  const success=(state.learning.completionHours||{})[task.category];
  if(Array.isArray(success)&&success.length>=3){const avg=success.slice(-12).reduce((a,b)=>a+b,0)/Math.min(12,success.length);if(Math.abs(hour-avg)<=2)score+=8;}
  if(state.settings.weekendMode&&isWeekendDate(today)){if(task.category==='personal')score+=14;if(task.category==='work')score-=12;}
  if(state.settings.workFreeWeekend&&isWeekendDate(today)&&task.category==='work'&&!task.deadline)score-=55;
  if(state.lowEnergyMode){if(task.energy==='low')score+=24;else if(task.energy==='high')score-=22;}
  if(task.lastDecisionReason==='energy'&&hour>=19)score-=10;
  const preferred=contextFromTask(task); if(preferred==='focus'&&hour>=8&&hour<=12)score+=5;
  return score;
}
function getTopCandidates() { return activeTasks().filter(t=>!t.inbox).slice().sort((a,b)=>taskScore(b)-taskScore(a)||(a.deadline||'9999').localeCompare(b.deadline||'9999')); }
function ensureDailyFocus() {
  const today = todayISO();
  if (state.ui.focus.date !== today) state.ui.focus = { date: today, ids: getTopCandidates().slice(0,3).map(t=>t.id) };
  state.ui.focus.ids = state.ui.focus.ids.filter(id => state.tasks.some(t=>t.id===id && !t.archivedAt && !t.deletedAt));
  const currentSet = new Set(state.ui.focus.ids);
  for (const task of getTopCandidates()) {
    if (state.ui.focus.ids.length >= 3) break;
    if (!currentSet.has(task.id)) { state.ui.focus.ids.push(task.id); currentSet.add(task.id); }
  }
  saveUI();
}
function getFocusTasks() { ensureDailyFocus(); return state.ui.focus.ids.map(id=>state.tasks.find(t=>t.id===id)).filter(Boolean); }
function considerTaskForFocus(task) {
  if(!task||task.archivedAt||task.deletedAt||task.completedAt||task.inbox||isTaskBlocked(task))return;
  ensureDailyFocus();
  if(state.ui.focus.ids.includes(task.id))return;
  const focus=getFocusTasks();
  if(focus.length<3){state.ui.focus.ids.push(task.id);saveUI();return;}
  const replaceable=focus.filter(t=>!t.completedAt).sort((a,b)=>taskScore(a)-taskScore(b));
  const lowest=replaceable[0];
  if(lowest&&taskScore(task)>taskScore(lowest)+10){state.ui.focus.ids=state.ui.focus.ids.map(id=>id===lowest.id?task.id:id);saveUI();}
}
function focusDoneCount() { return getFocusTasks().filter(t=>t.completedAt).length; }
function getImportantTasks() { return activeTasks().filter(t=>isOverdueDeadline(t)||t.deadline===todayISO()).sort((a,b)=>taskScore(b)-taskScore(a)); }

function findNextGap(task,startDate=addDays(todayISO(),1)) {
  for(let i=0;i<28;i++){
    const date=addDays(startDate,i),load=getDayLoad(date,effectiveTaskLoadMinutes(task),task.id),next=getDayLoad(addDays(date,1));
    if(load.percent<=82 && next.percent<=108)return date;
  }
  return addDays(startDate,28);
}
function movableScore(task,date=todayISO()) {
  let score=0;
  if(task.nonNegotiableDate===date)return 9999;
  if(task.todayPriorityUntil===date)score+=95;
  if (task.priority==='high') score+=60; else if(task.priority==='medium') score+=25;
  if (task.deadline===date || (task.deadline && task.deadline<date)) score+=100;
  if (task.deadline===addDays(date,1)) score+=45;
  score+=task.snoozeCount*7;
  return score;
}
function getMoveSuggestions(date=todayISO(),targetPercent=85) {
  const current=getDayLoad(date); if(current.percent<=100) return [];
  const candidates=tasksOn(date).filter(t=>t.nonNegotiableDate!==date && !(t.deadline && t.deadline<=date)).slice().sort((a,b)=>movableScore(a,date)-movableScore(b,date));
  const selected=[]; let remaining=current.mental;
  for(const task of candidates){
    if(Math.round((remaining/current.capacity)*100)<=targetPercent) break;
    selected.push({task,targetDate:findNextGap(task,addDays(date,1))}); remaining-=effectiveTaskLoadMinutes(task);
  }
  return selected;
}

function externalStartMinutes(event) {
  const raw = typeof event.start === 'object' ? event.start?.dateTime : event.start;
  if (!raw || (typeof event.start === 'object' && event.start?.date)) return null;
  const d = new Date(raw); if (Number.isNaN(d.getTime())) return null;
  return d.getHours()*60+d.getMinutes();
}
function getBusyIntervals(date) {
  const intervals=[];
  state.externalEvents.filter(e=>e.date===date && Number(e.duration||0)>0).forEach(e=>{
    const start=externalStartMinutes(e); if(start!==null) intervals.push([start,start+Number(e.duration||0)]);
  });
  tasksOn(date).filter(t=>t.scheduledTime).forEach(t=>{ const start=parseTimeMinutes(t.scheduledTime); if(start!==null) intervals.push([start,start+t.duration]); });
  return intervals.sort((a,b)=>a[0]-b[0]);
}
function getFreeGaps(date) {
  const workStart=8*60, workEnd=21*60;
  let start=workStart;
  if(date===todayISO()) { const now=new Date(); start=Math.max(start,Math.ceil((now.getHours()*60+now.getMinutes())/5)*5); }
  if(start>=workEnd) return [];
  const intervals=getBusyIntervals(date).map(([a,b])=>[Math.max(a,start),Math.min(b,workEnd)]).filter(([a,b])=>b>a);
  const merged=[];
  for(const interval of intervals){ const last=merged.at(-1); if(!last||interval[0]>last[1]) merged.push([...interval]); else last[1]=Math.max(last[1],interval[1]); }
  const gaps=[]; let cursor=start;
  for(const [a,b] of merged){ if(a-cursor>=15) gaps.push({start:cursor,end:a,duration:a-cursor}); cursor=Math.max(cursor,b); }
  if(workEnd-cursor>=15) gaps.push({start:cursor,end:workEnd,duration:workEnd-cursor});
  return gaps;
}
function getUsableGaps(date) {
  const load=getDayLoad(date), remaining=Math.max(0,load.capacity-load.mental);
  if(remaining<15) return [];
  return getFreeGaps(date).map(g=>({...g,duration:Math.min(g.duration,remaining)})).filter(g=>g.duration>=15);
}
function getAgendaItems(date) {
  const tasks=state.tasks.filter(t=>!t.archivedAt && !t.deletedAt && t.scheduledDate===date && t.scheduledTime).map(t=>({id:t.id,type:'task',title:t.title,category:t.category,time:t.scheduledTime,minutes:parseTimeMinutes(t.scheduledTime),completed:Boolean(t.completedAt),kind:t.kind}));
  const events=state.externalEvents.filter(e=>e.date===date).map(e=>{ const m=externalStartMinutes(e); return {id:e.id,type:'external',title:e.title,category:'external',time:m===null?'Todo el día':minutesToTime(m),minutes:m===null?9999:m,completed:false}; });
  return [...tasks,...events].sort((a,b)=>a.minutes-b.minutes||a.title.localeCompare(b.title));
}
function getMiniAgendaText() {
  const items=getAgendaItems(todayISO());
  const now=new Date().getHours()*60+new Date().getMinutes();
  const upcoming=items.filter(i=>i.minutes===9999 || i.minutes>=now-10).slice(0,2);
  if(!upcoming.length) return state.externalEvents.length || items.length ? 'Agenda despejada' : 'Sin eventos conectados';
  return upcoming.map(i=>`${i.time} ${i.title}`).join(' · ');
}
function getNextBestAction() {
  let candidates=getFocusTasks().filter(t=>!t.completedAt&&!t.archivedAt&&!t.deletedAt&&!t.inbox&&!isTaskBlocked(t));
  if(!candidates.length)candidates=getTopCandidates().filter(t=>!t.inbox&&!isTaskBlocked(t)).slice(0,10);
  const gap=getUsableGaps(todayISO())[0],available=gap?.duration||Math.max(15,getDayCapacity(todayISO())-getDayLoad(todayISO()).mental);
  const nowMinutes=new Date().getHours()*60+new Date().getMinutes();
  return candidates.slice().sort((a,b)=>{
    const adjusted=t=>{
      let s=taskScore(t),dur=predictedDuration(t);
      if(dur<=available)s+=20;else s-=Math.min(60,(dur-available)*1.2);
      if(t.scheduledTime){const diff=parseTimeMinutes(t.scheduledTime)-nowMinutes;if(diff>=0&&diff<=90)s+=20;if(diff>180)s-=8;}
      if(state.lowEnergyMode)s+=(t.energy==='low'?30:t.energy==='normal'&&dur<=25?15:-20);
      return s;
    };
    return adjusted(b)-adjusted(a);
  })[0]||null;
}
function getRecoverySummary(){
  const overdue=activeTasks().filter(t=>t.scheduledDate&&t.scheduledDate<todayISO());
  const important=overdue.filter(t=>t.priority==='high'||t.deadline&&t.deadline<=addDays(todayISO(),2)).sort((a,b)=>taskScore(b)-taskScore(a)).slice(0,3);
  const importantIds=new Set(important.map(t=>t.id));
  const stale=overdue.filter(t=>!importantIds.has(t.id)&&(t.snoozeCount>=4||dayDistance(t.createdAt?.slice(0,10))<=-30));
  const movable=overdue.filter(t=>!importantIds.has(t.id)&&!stale.includes(t));
  return {important,movable,stale};
}
function getStaleTasks(){return activeTasks().filter(t=>{const age=Math.max(0,-dayDistance((t.createdAt||'').slice(0,10)));return (age>=14&&t.snoozeCount>=3)||age>=35;}).sort((a,b)=>b.snoozeCount-a.snoozeCount);}
function getWeeklyPlanningInsight(){
  let mental=0,capacity=0,overDays=0;for(let i=0;i<7;i++){const l=getDayLoad(addDays(todayISO(),i));mental+=l.mental;capacity+=l.capacity;if(l.percent>100)overDays++;}
  const over=capacity?Math.round((mental/capacity-1)*100):0;return {over,overDays};
}
function getRecommendation() {
  const today=getDayLoad(todayISO());
  if(today.percent>100){const moves=getMoveSuggestions(todayISO());const current=today.percent;let after=current;if(moves.length){const moved=moves.reduce((s,x)=>s+effectiveTaskLoadMinutes(x.task),0);after=Math.max(0,Math.round(((today.mental-moved)/today.capacity)*100));}return {type:'space',className:'danger',text:`😅 ${moves.length?`Mover ${moves.length} → ${after}%`:'Vas justo hoy'}`,action:'Hazme hueco'};}
  if(state.ui.recoveryPendingDays>=3){const r=getRecoverySummary();if(r.important.length||r.movable.length||r.stale.length)return {type:'recovery',className:'warning',text:`Volver sin agobios · ${r.important.length} importantes`,action:'Ordenar'};}
  const inbox=activeTasks().filter(t=>t.inbox);if(inbox.length>=3)return {type:'inbox',className:'',text:`${inbox.length} cosas por colocar`,action:'Ordenar'};
  const important=getImportantTasks(),overdue=important.filter(isOverdueDeadline);if(overdue.length)return {type:'overdue',className:'warning',text:`⏰ ${overdue.length} ${overdue.length===1?'tarea vencida':'tareas vencidas'}`,action:'Revisar'};
  const stale=getStaleTasks();if(stale.length)return {type:'stale',className:'',text:'¿Sigue teniendo sentido?',action:`Revisar ${Math.min(stale.length,4)}`};
  const tomorrow=getDayLoad(addDays(todayISO(),1));if(tomorrow.percent>110)return {type:'tomorrow',className:'warning',text:`😅 Mañana viene al ${tomorrow.percent}%`,action:'Revisar'};
  const weekly=getWeeklyPlanningInsight();if(weekly.overDays>=3)return {type:'life',className:'warning',text:`${weekly.overDays} días cargados esta semana`,action:'Simplificar'};
  if(weekly.over>=12)return {type:'performance',className:'',text:`Semana +${weekly.over}% sobre capacidad`,action:'Ver'};
  const attention=getAttentionReminders();if(attention.length)return {type:'attention',className:'',text:`🔔 ${attention.length} ${attention.length===1?'recordatorio pendiente':'recordatorios pendientes'}`,action:'Ver'};
  if(state.ui.activeNowTaskId&&state.tasks.some(t=>t.id===state.ui.activeNowTaskId&&!t.completedAt&&!t.archivedAt))return {type:'continue',className:'',text:`Continuar · ${state.tasks.find(t=>t.id===state.ui.activeNowTaskId)?.title||'tarea'}`,action:'Abrir'};
  return null;
}



/* --------------------------------------------------------------------------
   v5.0 · capa premium local-first
   Inteligencia heurística local, Planning Studio, riesgo, papelera, voz y
   aprendizaje personal. Nada de esto bloquea las acciones básicas ni requiere IA.
---------------------------------------------------------------------------- */
function appendTaskHistory(task,type,before=null){
  if(!task)return;task.history=[...(task.history||[]),{type,at:new Date().toISOString(),deviceId:state.sync?.deviceId||'',before:before?{title:before.title,scheduledDate:before.scheduledDate,priority:before.priority,category:before.category}:undefined}].slice(-20);
}
function findFlexibleRecurrenceDate(task,base){
  const start=addDays(base,1);let best=start,bestLoad=Infinity;
  for(let i=0;i<7;i++){const date=addDays(start,i);if(state.settings.workFreeWeekend&&task.category==='work'&&isWeekendDate(date))continue;const l=getDayLoad(date,effectiveTaskLoadMinutes(task),task.id);if(l.percent<bestLoad){bestLoad=l.percent;best=date;}if(l.percent<=72)break;}
  return best;
}
function getTaskRisk(task){
  if(!task||task.completedAt||task.deletedAt||task.archivedAt)return {level:'none',score:0,label:'Sin riesgo'};
  let score=0;const dur=predictedDuration(task);
  if(task.deadline){const days=dayDistance(task.deadline);if(days<0)score+=100;else if(days===0)score+=75;else if(days===1)score+=48;else if(days<=3)score+=28;const capacity=Array.from({length:Math.max(1,Math.min(7,days+1))},(_,i)=>Math.max(0,getDayCapacity(addDays(todayISO(),i))-getDayLoad(addDays(todayISO(),i)).mental)).reduce((a,b)=>a+b,0);if(capacity<dur)score+=38;}
  score+=Math.min(35,task.snoozeCount*7);if(isTaskBlocked(task))score+=38;if(task.energy==='high')score+=6;
  return score>=80?{level:'high',score,label:'En riesgo'}:score>=45?{level:'medium',score,label:'Va justo'}:{level:'low',score,label:'Con margen'};
}
function getPersonalBufferInsight(){
  const samples=(state.learning.durationSamples||[]).slice(-30);if(samples.length<4)return null;
  const est=samples.reduce((a,b)=>a+Number(b.estimated||0),0),actual=samples.reduce((a,b)=>a+Number(b.actual||0),0);if(!est)return null;
  const diff=Math.round((actual/est-1)*100);return diff>8?`Tus tareas suelen necesitar ~${diff}% más tiempo del previsto.`:diff<-10?`Sueles terminar ~${Math.abs(diff)}% antes de lo previsto.`:'Tus estimaciones están bastante afinadas.';
}
function getContextSwitchScore(date=todayISO()){
  const list=tasksOn(date).filter(t=>!t.completedAt).sort((a,b)=>(a.scheduledTime||'99:99').localeCompare(b.scheduledTime||'99:99'));let changes=0,prev='';for(const t of list){const c=contextFromTask(t);if(prev&&c!==prev)changes++;prev=c;}return changes;
}
function getBurnoutSignal(){
  const loads=Array.from({length:5},(_,i)=>getDayLoad(addDays(todayISO(),i)).percent);const hard=loads.filter(x=>x>95).length;return hard>=4?{level:'high',text:'Demasiados días exigentes seguidos. Conviene quitar, no recolocar.'}:hard>=3?{level:'medium',text:'La semana va muy justa. Deja más margen.'}:null;
}
function learnCategoryCorrection(task){
  if(!task?.title)return;const tokens=task.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/\W+/).filter(x=>x.length>=4).slice(0,5);state.learning.categoryHints=state.learning.categoryHints||{};for(const token of tokens){const row=state.learning.categoryHints[token]||{work:0,personal:0,study:0};row[task.category]=(row[task.category]||0)+1;state.learning.categoryHints[token]=row;}saveLearning();
}
function suggestCategoryForTitle(title){
  const hints=state.learning.categoryHints||{},scores={work:0,personal:0,study:0};for(const token of String(title||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/\W+/)){const row=hints[token];if(row)for(const k of Object.keys(scores))scores[k]+=Number(row[k]||0);}
  const best=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];return best&&best[1]>=2?best[0]:null;
}
function applyCategorySuggestion(){
  if(!els.taskTitle||els.taskEditId?.value)return;const suggested=suggestCategoryForTitle(els.taskTitle.value);if(suggested&&els.taskCategory.value!==suggested){els.taskCategory.value=suggested;els.taskCategory.dataset.suggested='1';}
}
function getPlanningWeekStart(){
  const base=state.ui.planningWeekStart||todayISO(),d=parseISODate(base),offset=(d.getDay()+6)%7;return addDays(base,-offset);
}
function getWeekDates(start=getPlanningWeekStart()){return Array.from({length:7},(_,i)=>addDays(start,i));}
function getWeekBalancePlan(){
  const dates=getWeekDates(),moves=[];const virtual=new Map(dates.map(d=>[d,getDayLoad(d).mental]));const caps=new Map(dates.map(d=>[d,getDayCapacity(d)]));
  for(const date of dates){let pct=Math.round((virtual.get(date)/caps.get(date))*100);if(pct<=90)continue;const candidates=tasksOn(date).filter(t=>!t.nonNegotiableDate&&!t.completedAt&&!isTaskBlocked(t)&&!(t.deadline&&t.deadline<=date)).sort((a,b)=>movableScore(a,date)-movableScore(b,date));for(const task of candidates){if(pct<=85)break;let target=null,best=999;for(const d of dates){if(d<=date)continue;if(task.deadline&&d>task.deadline)continue;if(state.settings.workFreeWeekend&&task.category==='work'&&isWeekendDate(d))continue;const n=virtual.get(d)+effectiveTaskLoadMinutes(task),p=Math.round(n/caps.get(d)*100);if(p<best&&p<=88){best=p;target=d;}}if(target){virtual.set(date,Math.max(0,virtual.get(date)-effectiveTaskLoadMinutes(task)));virtual.set(target,virtual.get(target)+effectiveTaskLoadMinutes(task));moves.push({id:task.id,from:date,to:target});pct=Math.round(virtual.get(date)/caps.get(date)*100);}}
  }
  return moves;
}
function applyWeekBalance(){const moves=getWeekBalancePlan();if(!moves.length){toast('La semana ya está razonablemente equilibrada.');return;}mutateWithUndo('Semana reequilibrada',()=>{for(const m of moves){const t=state.tasks.find(x=>x.id===m.id);if(t){appendTaskHistory(t,'rebalanced');t.scheduledDate=m.to;t.snoozeCount+=1;t.lastDecisionReason='capacity';}}});renderPlanning();toast(`${moves.length} ${moves.length===1?'tarea movida':'tareas movidas'} con margen.`);}
function getSmartLists(){
  const all=activeTasks();return [
    {key:'short',label:'Cortas',count:all.filter(t=>predictedDuration(t)<=15).length,filter:t=>predictedDuration(t)<=15},
    {key:'deep',label:'Concentración',count:all.filter(t=>contextFromTask(t)==='focus').length,filter:t=>contextFromTask(t)==='focus'},
    {key:'risk',label:'En riesgo',count:all.filter(t=>getTaskRisk(t).level==='high').length,filter:t=>getTaskRisk(t).level==='high'},
    {key:'snoozed',label:'Aplazadas',count:all.filter(t=>t.snoozeCount>=3).length,filter:t=>t.snoozeCount>=3},
    {key:'blocked',label:'Bloqueadas',count:all.filter(isTaskBlocked).length,filter:isTaskBlocked},
    {key:'inbox',label:'Inbox',count:all.filter(t=>t.inbox).length,filter:t=>t.inbox}
  ];
}
function renderPlanning(){
  if(state.route!=='planning'||!els.planningView)return;const dates=getWeekDates(),plan=getWeekBalancePlan(),burnout=getBurnoutSignal();
  els.planningInsight.textContent=burnout?.text||plan.length?`${plan.length} ${plan.length===1?'movimiento puede':'movimientos pueden'} equilibrar tu semana.`:(getPersonalBufferInsight()||'Tu semana tiene margen razonable.');
  els.planningWeekBoard.innerHTML=dates.map(date=>{const l=getDayLoad(date),tasks=tasksOn(date).filter(t=>!t.completedAt);return `<article class="plan-day ${l.percent>100?'over':''}" data-plan-date="${date}"><header><span>${new Intl.DateTimeFormat('es-ES',{weekday:'short'}).format(parseISODate(date)).replace('.','')}</span><strong>${parseISODate(date).getDate()}</strong><em>${l.percent}%</em></header><div class="plan-load"><i style="width:${Math.min(100,l.percent)}%"></i></div><div class="plan-items">${tasks.slice(0,4).map(t=>`<button data-open-task="${t.id}" title="${escapeHTML(t.title)}"><span>${escapeHTML(t.title)}</span><small>${formatMinutes(predictedDuration(t))}</small></button>`).join('')}${tasks.length>4?`<small>+${tasks.length-4}</small>`:''}</div></article>`;}).join('');
  const risk=activeTasks().map(t=>({t,r:getTaskRisk(t)})).filter(x=>x.r.level==='high'||x.r.level==='medium').sort((a,b)=>b.r.score-a.r.score).slice(0,5);els.riskList.innerHTML=risk.length?risk.map(({t,r})=>`<button class="premium-row" data-open-task="${t.id}"><span><strong>${escapeHTML(t.title)}</strong><small>${r.label}${t.deadline?` · ${formatDate(t.deadline)}`:''}</small></span><em>${r.level==='high'?'!':'·'}</em></button>`).join(''):'<div class="premium-empty">Nada en riesgo ahora mismo.</div>';
  els.smartLists.innerHTML=getSmartLists().map(x=>`<button data-smart-list="${x.key}"><strong>${x.count}</strong><span>${x.label}</span></button>`).join('');
  const projects=new Map();for(const t of activeTasks().filter(t=>t.project||t.outcome)){const key=t.project||t.outcome,row=projects.get(key)||{name:key,total:0,done:0,minutes:0};row.total++;row.minutes+=predictedDuration(t);projects.set(key,row);}els.outcomeList.innerHTML=projects.size?[...projects.values()].slice(0,6).map(p=>`<div class="premium-row static"><span><strong>${escapeHTML(p.name)}</strong><small>${p.total} tareas · ${formatMinutes(p.minutes)}</small></span><em>${p.total}</em></div>`).join(''):'<div class="premium-empty">Añade un proyecto a una tarea cuando necesites agrupar un resultado.</div>';
  const switches=getContextSwitchScore();const insight=getPersonalBufferInsight()||`${switches} cambios de contexto previstos hoy.`;els.premiumInsight.innerHTML=`<strong>${escapeHTML(insight)}</strong><span>${burnout?.text?'Prioriza descanso y no añadas más carga.':'La app usa esto para ordenar, no para juzgar.'}</span>`;
  const heat=Array.from({length:28},(_,i)=>{const d=addDays(todayISO(),i-27),p=getDayLoad(d).percent;return `<i title="${d} · ${p}%" style="--heat:${Math.min(1,p/120)}"></i>`;}).join('');els.yearHeatmap.innerHTML=heat;
}
function openSmartList(key){const def=getSmartLists().find(x=>x.key===key);if(!def)return;const tasks=activeTasks().filter(def.filter).sort((a,b)=>taskScore(b)-taskScore(a));showActionSheet(`${sheetHeader('Smart list',def.label)}<div class="task-list">${tasks.map(renderTaskItem).join('')||'<div class="premium-empty">Nada aquí.</div>'}</div>`);}
function openTrash(){const items=state.tasks.filter(t=>t.deletedAt).sort((a,b)=>String(b.deletedAt).localeCompare(String(a.deletedAt)));showActionSheet(`${sheetHeader('Papelera',items.length?'Puedes recuperar lo que necesites':'Está vacía')}<div class="action-list">${items.slice(0,30).map(t=>actionOption({icon:'restore',title:t.title,sub:formatDate((t.deletedAt||'').slice(0,10),true),attrs:`data-trash-restore="${t.id}"` })).join('')||'<div class="premium-empty">No hay tareas eliminadas.</div>'}</div>${items.length?'<div class="sheet-actions"><button class="ghost-btn" data-close-action>Cerrar</button><button class="danger-btn" data-trash-empty>Vaciar papelera</button></div>':''}`);}
function restoreTrashTask(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;mutateWithUndo('Tarea restaurada',()=>{t.deletedAt=null;t.restoredAt=new Date().toISOString();appendTaskHistory(t,'restored');});openTrash();}
function emptyTrash(){const before=deepClone(state.tasks);state.tasks=state.tasks.filter(t=>!t.deletedAt);saveAll();render();pushUndo('Papelera vaciada',before);closeActionSheet();}
function downloadText(filename,text,type='text/plain;charset=utf-8'){const blob=new Blob([text],{type}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();const url=a.href;a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);}
function exportCSV(){const rows=[['title','category','scheduledDate','deadline','duration','priority','energy','project','completedAt']];for(const t of state.tasks.filter(t=>!t.deletedAt))rows.push([t.title,t.category,t.scheduledDate,t.deadline,t.duration,t.priority,t.energy,t.project,t.completedAt||'']);const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');downloadText(`organizador-${todayISO()}.csv`,csv,'text/csv;charset=utf-8');toast('CSV exportado.');}
function makeAutoBackup(){exportBackup();state.ui.lastAutoBackupAt=new Date().toISOString();saveUI();}
function getWeeklyPerformanceSentence(){
  const dates=Array.from({length:7},(_,i)=>addDays(todayISO(),-i)),planned=dates.reduce((s,d)=>s+state.tasks.filter(t=>!t.deletedAt&&t.scheduledDate===d).reduce((a,t)=>a+Number(t.duration||0),0),0),done=dates.reduce((s,d)=>s+state.tasks.filter(t=>t.completedAt&&toISO(new Date(t.completedAt))===d).reduce((a,t)=>a+Number(t.actualDuration||t.duration||0),0),0);if(!planned)return 'Aún no hay suficiente semana para comparar.';const diff=Math.round((planned-done)/planned*100);return diff>15?`Esta semana planificaste ~${diff}% más de lo que terminó entrando.`:'Tu carga semanal está bastante cerca de la realidad.';
}
function getProcrastinationStep(task){const age=Math.max(0,-dayDistance((task.createdAt||'').slice(0,10)));if(task.snoozeCount>=4||age>=20)return task.duration>=60?'Reducirla a una primera acción de 10 min.':task.lastDecisionReason==='blocked'?'Aclara qué falta para desbloquearla.':'Ponle un hueco real o deja de tratarla como obligación.';return '';}
function proposeTinyFirstStep(task){if(!task)return;const templates={work:['Abrir material y definir siguiente paso','Hacer un borrador mínimo','Revisar y cerrar'],study:['Preparar material','Estudiar el primer bloque','Repasar lo esencial'],personal:['Preparar lo necesario','Hacer la primera gestión','Cerrar y guardar']};mutateWithUndo('Tarea dividida',()=>{task.subtasks=(templates[task.category]||templates.personal).map(title=>({id:uid(),title,completedAt:null}));appendTaskHistory(task,'auto-split');});}
function recordPauseReason(task,reason){state.learning.pauseReasons=state.learning.pauseReasons||{};state.learning.pauseReasons[task.id]=[...(state.learning.pauseReasons[task.id]||[]),{reason,at:new Date().toISOString()}].slice(-10);saveLearning();}
function compactTaskBatch(tasks){const groups=new Map();for(const t of tasks){const key=contextLabelForTask(t),g=groups.get(key)||{label:key,tasks:[],minutes:0};g.tasks.push(t);g.minutes+=predictedDuration(t);groups.set(key,g);}return [...groups.values()].sort((a,b)=>b.tasks.length-a.tasks.length);}
function openNewOutcome(){showActionSheet(`${sheetHeader('Nuevo resultado','Agrupa sin crear complejidad')}<label class="field"><span>Nombre</span><input id="newOutcomeName" placeholder="Ej. Preparar mudanza"></label><div class="sheet-actions"><button class="ghost-btn" data-close-action>Cancelar</button><button class="primary-btn" data-create-outcome>Crear</button></div>`);}
function createOutcomeFromSheet(){const name=document.getElementById('newOutcomeName')?.value.trim();if(!name)return;closeActionSheet();setTimeout(()=>{openTaskSheet();els.taskProject.value=name;setTaskAdvanced(true);},40);}
function startSpeechCapture(target){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('El dictado web no está disponible en este navegador. Usa el micrófono del teclado.');target?.focus();return;}
  try{const rec=new SR();rec.lang='es-ES';rec.interimResults=false;rec.maxAlternatives=1;state.speech=rec;target?.closest('.quick-task-line,.quick-input-wrap')?.classList.add('listening');rec.onresult=e=>{const text=e.results?.[0]?.[0]?.transcript||'';if(text){target.value=(target.value?target.value+' ':'')+text;target.dispatchEvent(new Event('input',{bubbles:true}));}};rec.onend=()=>{target?.closest('.quick-task-line,.quick-input-wrap')?.classList.remove('listening');state.speech=null;};rec.onerror=()=>{target?.closest('.quick-task-line,.quick-input-wrap')?.classList.remove('listening');state.speech=null;};rec.start();}catch(_){toast('No se pudo iniciar el dictado.');}
}
function processShareTarget(){const u=new URL(location.href),text=[u.searchParams.get('title'),u.searchParams.get('text'),u.searchParams.get('url')].filter(Boolean).join(' ').trim();if(!text)return;history.replaceState({},'',location.pathname+location.hash);setTimeout(()=>{openQuickSheet();els.quickTaskInput.value=text;},400);}
function applyAppearance(){const mode=state.settings.appearance||'system',dark=mode==='dark'||(mode==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.appearance=dark?'dark':'light';const theme=document.querySelector('meta[name="theme-color"]');if(theme)theme.setAttribute('content',dark?'#101316':'#f7f8fa');}
function cycleCompactDate(){const t=todayISO(),m=addDays(t,1),cur=els.taskScheduledDate.value;els.taskScheduledDate.value=cur===t?m:cur===m?'':t;syncCompactTaskMeta();updateCapacityPreview();}
function cycleCompactPriority(){const order=['medium','high','low'],i=order.indexOf(els.taskPriority.value);setChoice('priority',order[(i+1)%order.length]);}
function getSuggestedCategoryFromText(){const parsed=parseNaturalTask(els.taskTitle.value);return parsed.category||suggestCategoryForTitle(els.taskTitle.value);}
function cleanupOldTrash(){const cutoff=Date.now()-30*86400000;const before=state.tasks.length;state.tasks=state.tasks.filter(t=>!t.deletedAt||new Date(t.deletedAt).getTime()>cutoff);if(state.tasks.length!==before)saveAll();}
function createWeeklySnapshot(){const key=new Date().toISOString().slice(0,10),list=state.learning.weeklySnapshots||[];if(list.at(-1)?.date===key)return;list.push({date:key,planned:Array.from({length:7},(_,i)=>getDayLoad(addDays(todayISO(),i)).percent),active:activeTasks().length});state.learning.weeklySnapshots=list.slice(-26);saveLearning();}
function openTaskHistory(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;const rows=(t.history||[]).slice().reverse();showActionSheet(`${sheetHeader('Historial',t.title)}<div class="history-list">${rows.map(h=>`<div><strong>${escapeHTML(({created:'Creada',edited:'Editada',completed:'Completada',deleted:'Papelera',restored:'Restaurada',paused:'Pausada','auto-split':'Dividida','rebalanced':'Reequilibrada'})[h.type]||h.type)}</strong><span>${new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(h.at))}</span></div>`).join('')||'<div class="premium-empty">Sin historial todavía.</div>'}</div>`);}
function showProcrastinationWizard(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;showActionSheet(`${sheetHeader('Desbloquear',t.title)}<div class="action-summary">${escapeHTML(getProcrastinationStep(t)||'Elige lo que más se parece a lo que ocurre.')}</div><div class="action-list">${actionOption({icon:'split',title:'Demasiado grande',sub:'Crear una primera acción mínima.',attrs:`data-procrastination="split" data-id="${id}"`})}${actionOption({icon:'spark',title:'Poco claro',sub:'Convertirla en un siguiente paso.',attrs:`data-procrastination="clarify" data-id="${id}"`})}${actionOption({icon:'bolt',title:'Sin energía',sub:'Buscar otro hueco mejor.',attrs:`data-procrastination="energy" data-id="${id}"`})}</div>`);}
function handleProcrastination(id,type){const t=state.tasks.find(x=>x.id===id);if(!t)return;if(type==='split'){proposeTinyFirstStep(t);closeActionSheet();}else if(type==='clarify'){mutateWithUndo('Tarea aclarada',()=>{if(!/^Siguiente:/.test(t.title))t.title=`Siguiente: ${t.title}`;t.duration=Math.min(15,t.duration);appendTaskHistory(t,'edited');});closeActionSheet();}else{recordPauseReason(t,'energy');applySnooze(id,findNextGap(t));}}
function mergeConflictFields(local,remote){const merged=normalizeTask({...remote});const ltime=new Date(local.modifiedAt||0).getTime(),rtime=new Date(remote.modifiedAt||0).getTime();if(ltime>=rtime){for(const key of ['title','priority','energy','project','outcome','context'])if(local[key]!==undefined)merged[key]=local[key];}merged.history=[...(remote.history||[]),...(local.history||[])].sort((a,b)=>String(a.at).localeCompare(String(b.at))).slice(-20);return merged;}
/* --------------------------------------------------------------------------
   v4.1 · Sincronización multidispositivo con Firebase
   - Firebase Authentication: email + contraseña, sin SMTP ni dominio propio.
   - Cloud Firestore: una colección de tareas por usuario + un documento meta.
   - onSnapshot replica cambios en tiempo real entre iPhone y Windows.
   - Persistencia IndexedDB de Firestore mantiene la experiencia local-first.
---------------------------------------------------------------------------- */
function isCloudConfigured() {
  const config = window.OPI_CONFIG?.firebase || {};
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}
function loadScriptOnce(src, marker) {
  if (document.querySelector(`script[data-opi-sdk="${marker}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.opiSdk = marker;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`No se pudo cargar ${marker}`));
    document.head.appendChild(script);
  });
}
async function loadFirebaseLibraries() {
  if (window.firebase?.apps && window.firebase.auth && window.firebase.firestore) return window.firebase;
  if (window.__opiFirebaseLoader) return window.__opiFirebaseLoader;
  window.__opiFirebaseLoader = (async () => {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
    await loadScriptOnce(`${base}/firebase-app-compat.js`, 'firebase-app');
    await loadScriptOnce(`${base}/firebase-auth-compat.js`, 'firebase-auth');
    await loadScriptOnce(`${base}/firebase-firestore-compat.js`, 'firebase-firestore');
    if (!window.firebase?.initializeApp || !window.firebase?.auth || !window.firebase?.firestore) throw new Error('Firebase no se inició correctamente.');
    return window.firebase;
  })();
  return window.__opiFirebaseLoader;
}
function setSyncStatus(status, detail = '') {
  state.sync.status = status;
  state.sync.detail = detail;
  updateSyncUI();
}
function syncStatusText() {
  const email = state.sync.user?.email || '';
  if (!isCloudConfigured()) return ['Sin configurar', 'Copia la configuración Web de Firebase en config.js.'];
  if (!state.sync.auth || !state.sync.db) return ['Firebase preparado', state.sync.detail || 'La app local sigue funcionando.'];
  if (!state.sync.user) return ['Sin conectar', state.sync.detail || 'Entra con la misma cuenta en iPhone y Windows.'];
  if (!navigator.onLine) return [email || 'Cuenta conectada', 'Sin conexión · Firestore guardará los cambios y los enviará al volver Internet.'];
  if (state.sync.status === 'busy') return [email || 'Cuenta conectada', state.sync.detail || 'Sincronizando…'];
  if (state.sync.status === 'error') return [email || 'Cuenta conectada', state.sync.detail || 'No se pudo sincronizar.'];
  return [email || 'Cuenta conectada', state.sync.detail || 'Sincronización en tiempo real activa.'];
}
function updateSyncUI() {
  if (!els.syncAccountStatus) return;
  const [title, detail] = syncStatusText();
  els.syncAccountStatus.textContent = title;
  els.syncDeviceStatus.textContent = detail;
  let dot = 'off';
  if (state.sync.user && navigator.onLine && state.sync.status === 'live') dot = 'live';
  else if (state.sync.user && state.sync.status === 'busy') dot = 'busy';
  else if (state.sync.status === 'error') dot = 'error';
  else if (state.sync.user && !navigator.onLine) dot = 'offline';
  els.syncStateDot.dataset.state = dot;
  const signed = Boolean(state.sync.user);
  els.syncAuthPanel.hidden = signed;
  els.syncSignedPanel.hidden = !signed;
  if (signed && els.syncEmail) els.syncEmail.value = state.sync.user.email || '';
  if(els.syncIssueBadge){const problem=state.sync.status==='error'||state.sync.status==='busy'||(signed&&!navigator.onLine);els.syncIssueBadge.hidden=!problem;els.syncIssueBadge.title=detail;}
}
function backupLocalBeforeCloud(userId) {
  try {
    const key = `${CLOUD_BACKUP_PREFIX}${userId}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify({
        createdAt: new Date().toISOString(),
        tasks: state.tasks,
        settings: state.settings,
        externalEvents: state.externalEvents
      }));
    }
  } catch (_) {}
}
function taskForCloud(task) { return normalizeTask(task); }
function taskFingerprint(task) { return JSON.stringify(taskForCloud(task)); }
function metaForCloud() {
  return {
    schemaVersion: CLOUD_SCHEMA_VERSION,
    settings: state.settings,
    externalEvents: state.externalEvents,
    appVersion: CACHE_VERSION
  };
}
function metaFingerprint(meta = metaForCloud()) {
  return JSON.stringify({
    schemaVersion: Number(meta.schemaVersion || CLOUD_SCHEMA_VERSION),
    settings: { ...DEFAULT_SETTINGS, ...(meta.settings || {}) },
    externalEvents: Array.isArray(meta.externalEvents) ? meta.externalEvents : []
  });
}
function setTaskBaseline(tasks = state.tasks) {
  state.sync.baselineTasks = new Map(tasks.map(task => [task.id, taskFingerprint(task)]));
}
function setMetaBaseline(meta = metaForCloud()) { state.sync.baselineMeta = metaFingerprint(meta); }
function userRefs() {
  if (!state.sync.db || !state.sync.user) return null;
  const userRef = state.sync.db.collection('users').doc(state.sync.user.uid);
  return { userRef, tasks: userRef.collection('tasks'), meta: userRef.collection('meta').doc('main') };
}
function remoteTaskFromDoc(doc) { const data=doc.data();return normalizeTask({ id: doc.id, ...data, lastDeviceId:data.deviceId||data.lastDeviceId||'' }); }
function applyRemoteTasks(tasks, { silent = true } = {}) {
  const preserve=detectRemoteConflicts(tasks);
  const localMap=new Map(state.tasks.map(t=>[t.id,t]));
  state.sync.applyingRemote = true;
  state.tasks = tasks.map(t=>preserve.has(t.id)?localMap.get(t.id):normalizeTask(t));
  setTaskBaseline(state.tasks);
  saveAll({ skipSync: true });
  state.sync.applyingRemote = false;
  ensureDailyFocus();
  render();
  if (!silent) toast('Tareas actualizadas desde otro dispositivo.');
}
function applyRemoteMeta(data, { silent = true } = {}) {
  if (!data) return;
  state.sync.applyingRemote = true;
  state.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  state.externalEvents = Array.isArray(data.externalEvents) ? data.externalEvents : [];
  setMetaBaseline({ schemaVersion: data.schemaVersion || CLOUD_SCHEMA_VERSION, settings: state.settings, externalEvents: state.externalEvents });
  saveAll({ skipSync: true });
  state.sync.applyingRemote = false;
  render();
  if (!silent) toast('Ajustes actualizados desde otro dispositivo.');
}
function scheduleCloudPush() {
  if (state.sync.applyingRemote) return;
  if (!state.sync.user || !state.sync.db || !state.sync.initialized) return;
  clearTimeout(state.sync.syncTimer);
  state.sync.syncTimer = setTimeout(() => syncLocalToFirebase().catch(error => {
    console.warn('Firebase sync:', error);
    state.sync.forceRetry = true;
    setSyncStatus('error', firebaseErrorText(error));
  }), 40);
}
async function syncLocalToFirebase({ force = false, waitForServer = false } = {}) {
  if (!state.sync.user || !state.sync.db || !state.sync.initialized || state.sync.syncInFlight) return false;
  const refs = userRefs();
  if (!refs) return false;
  state.sync.syncInFlight = true;
  const fieldValue = state.sync.firebase.firestore.FieldValue;
  const currentMap = new Map(state.tasks.map(task => [task.id, taskFingerprint(task)]));
  const writes = [];
  const previous = state.sync.baselineTasks || new Map();
  const full = force || state.sync.forceRetry;

  for (const task of state.tasks) {
    const fingerprint = currentMap.get(task.id);
    if (full || previous.get(task.id) !== fingerprint) {
      const cloudTask = taskForCloud(task);
      if(!cloudTask.modifiedAt)cloudTask.modifiedAt=new Date().toISOString();
      writes.push(refs.tasks.doc(task.id).set({
        ...cloudTask,
        updatedAtCloud: fieldValue.serverTimestamp(),
        deviceId: state.sync.deviceId
      }, { merge: false }));
    }
  }
  for (const id of previous.keys()) {
    if (!currentMap.has(id)) writes.push(refs.tasks.doc(id).delete());
  }

  const meta = metaForCloud();
  const metaFp = metaFingerprint(meta);
  if (full || state.sync.baselineMeta !== metaFp) {
    writes.push(refs.meta.set({
      ...meta,
      initialized: true,
      updatedAtCloud: fieldValue.serverTimestamp(),
      deviceId: state.sync.deviceId
    }, { merge: false }));
  }

  setTaskBaseline(state.tasks);
  setMetaBaseline(meta);
  state.sync.forceRetry = false;

  if (!writes.length) {
    state.sync.syncInFlight = false;
    if (state.sync.user) setSyncStatus(navigator.onLine ? 'live' : 'offline', navigator.onLine ? 'Todo sincronizado.' : 'Sin conexión · cambios guardados localmente.');
    return true;
  }

  setSyncStatus(navigator.onLine ? 'busy' : 'offline', navigator.onLine ? 'Guardando cambios…' : 'Sin conexión · Firestore los enviará al volver Internet.');
  // Firestore aplica primero las escrituras a su caché local. No esperamos cuando estamos
  // offline porque la Promise se resolverá únicamente al confirmar el servidor.
  const settled = Promise.allSettled(writes).then(results => {
    const rejected = results.find(result => result.status === 'rejected');
    state.sync.syncInFlight = false;
    if (rejected) {
      state.sync.forceRetry = true;
      setSyncStatus('error', firebaseErrorText(rejected.reason));
      return false;
    }
    setSyncStatus(navigator.onLine ? 'live' : 'offline', navigator.onLine ? 'Todo sincronizado.' : 'Cambios pendientes de red.');
    return true;
  });
  if (waitForServer && navigator.onLine) return settled;
  settled.catch(() => {});
  if (!navigator.onLine) state.sync.syncInFlight = false;
  return true;
}
function stopFirebaseListeners() {
  if (typeof state.sync.unsubTasks === 'function') { try { state.sync.unsubTasks(); } catch (_) {} }
  if (typeof state.sync.unsubMeta === 'function') { try { state.sync.unsubMeta(); } catch (_) {} }
  state.sync.unsubTasks = null;
  state.sync.unsubMeta = null;
}
function subscribeFirebaseRealtime() {
  stopFirebaseListeners();
  const refs = userRefs();
  if (!refs) return;
  state.sync.unsubTasks = refs.tasks.onSnapshot({ includeMetadataChanges: true }, snapshot => {
    const tasks = snapshot.docs.map(remoteTaskFromDoc);
    applyRemoteTasks(tasks, { silent: true });
    if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) setSyncStatus('live', 'Sincronización en tiempo real activa.');
  }, error => setSyncStatus('error', firebaseErrorText(error)));
  state.sync.unsubMeta = refs.meta.onSnapshot({ includeMetadataChanges: true }, snapshot => {
    if (snapshot.exists) applyRemoteMeta(snapshot.data(), { silent: true });
    if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) setSyncStatus('live', 'Sincronización en tiempo real activa.');
  }, error => setSyncStatus('error', firebaseErrorText(error)));
}
async function initializeCloudFromLocal(refs) {
  setSyncStatus('busy', 'Creando tu copia segura en Firebase…');
  const fieldValue = state.sync.firebase.firestore.FieldValue;
  const batch = state.sync.db.batch();
  for (const task of state.tasks) {
    batch.set(refs.tasks.doc(task.id), { ...taskForCloud(task), updatedAtCloud: fieldValue.serverTimestamp(), deviceId: state.sync.deviceId });
  }
  batch.set(refs.meta, { ...metaForCloud(), initialized: true, createdAtCloud: fieldValue.serverTimestamp(), updatedAtCloud: fieldValue.serverTimestamp(), deviceId: state.sync.deviceId });
  await batch.commit();
  setTaskBaseline(state.tasks);
  setMetaBaseline();
}
async function connectFirebaseUser(user) {
  if (!user || !state.sync.db) return;
  if (state.sync.activeUserId === user.uid && (state.sync.initialized || state.sync.connecting)) return;
  stopFirebaseListeners();
  state.sync.connecting = true;
  state.sync.initialized = false;
  state.sync.user = user;
  state.sync.activeUserId = user.uid;
  updateSyncUI();
  setSyncStatus('busy', 'Preparando tus datos…');
  const refs = userRefs();
  try {
    const [tasksSnap, metaSnap] = await Promise.all([refs.tasks.get(), refs.meta.get()]);
    const cloudInitialized = metaSnap.exists || !tasksSnap.empty;
    if (cloudInitialized) {
      backupLocalBeforeCloud(user.uid);
      applyRemoteTasks(tasksSnap.docs.map(remoteTaskFromDoc), { silent: true });
      if (metaSnap.exists) applyRemoteMeta(metaSnap.data(), { silent: true });
      else {
        setMetaBaseline();
        await refs.meta.set({ ...metaForCloud(), initialized: true, updatedAtCloud: state.sync.firebase.firestore.FieldValue.serverTimestamp(), deviceId: state.sync.deviceId });
      }
    } else {
      await initializeCloudFromLocal(refs);
    }
    state.sync.initialized = true;
    state.sync.connecting = false;
    const meta = loadSyncMeta();
    meta.userId = user.uid;
    meta.lastSyncAt = new Date().toISOString();
    saveSyncMeta(meta);
    subscribeFirebaseRealtime();
    setSyncStatus(navigator.onLine ? 'live' : 'offline', navigator.onLine ? 'Todo sincronizado.' : 'Modo offline activo.');
    updateSyncUI();
  } catch (error) {
    state.sync.connecting = false;
    state.sync.initialized = false;
    setSyncStatus('error', firebaseErrorText(error));
    throw error;
  }
}
async function disconnectCloudSession() {
  stopFirebaseListeners();
  state.sync.user = null;
  state.sync.activeUserId = '';
  state.sync.initialized = false;
  state.sync.connecting = false;
  state.sync.baselineTasks = new Map();
  state.sync.baselineMeta = '';
  setSyncStatus('off', 'Cuenta desconectada. Tus datos locales se conservan.');
  updateSyncUI();
}
function syncCredentials() {
  const email = (els.syncEmail?.value || '').trim().toLowerCase();
  const password = els.syncPassword?.value || '';
  if (!email || !email.includes('@')) throw new Error('Escribe un email válido.');
  if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  return { email, password };
}
function firebaseErrorText(error) {
  const code = error?.code || '';
  const map = {
    'auth/invalid-email': 'El email no es válido.',
    'auth/invalid-credential': 'Email o contraseña incorrectos.',
    'auth/user-not-found': 'No existe una cuenta con ese email.',
    'auth/wrong-password': 'Email o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
    'auth/weak-password': 'La contraseña es demasiado sencilla.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
    'auth/network-request-failed': 'No hay conexión con Firebase.',
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase Authentication.',
    'permission-denied': 'Firestore ha rechazado el acceso. Revisa las reglas de seguridad.',
    'firestore/permission-denied': 'Firestore ha rechazado el acceso. Revisa las reglas de seguridad.'
  };
  return map[code] || error?.message || 'No se pudo completar la sincronización.';
}
async function signInSyncAccount() {
  if (!state.sync.auth) { toast('Configura Firebase primero.'); return; }
  let credentials;
  try { credentials = syncCredentials(); } catch (error) { toast(error.message); return; }
  setSyncStatus('busy', 'Entrando…');
  try {
    await state.sync.auth.signInWithEmailAndPassword(credentials.email, credentials.password);
    if (els.syncPassword) els.syncPassword.value = '';
    toast('Cuenta conectada.');
  } catch (error) {
    setSyncStatus('error', firebaseErrorText(error));
    toast(firebaseErrorText(error));
  }
}
async function createSyncAccount() {
  if (!state.sync.auth) { toast('Configura Firebase primero.'); return; }
  let credentials;
  try { credentials = syncCredentials(); } catch (error) { toast(error.message); return; }
  setSyncStatus('busy', 'Creando cuenta…');
  try {
    await state.sync.auth.createUserWithEmailAndPassword(credentials.email, credentials.password);
    if (els.syncPassword) els.syncPassword.value = '';
    toast('Cuenta creada. Tus datos se están sincronizando.');
  } catch (error) {
    setSyncStatus('error', firebaseErrorText(error));
    toast(firebaseErrorText(error));
  }
}
async function resetSyncPassword() {
  if (!state.sync.auth) { toast('Configura Firebase primero.'); return; }
  const email = (els.syncEmail?.value || '').trim().toLowerCase();
  if (!email || !email.includes('@')) { toast('Escribe primero tu email.'); return; }
  try {
    await state.sync.auth.sendPasswordResetEmail(email);
    toast('Firebase ha enviado el correo para cambiar la contraseña.');
  } catch (error) {
    toast(firebaseErrorText(error));
  }
}
async function signOutCloud() {
  if (!state.sync.auth) return;
  setSyncStatus('busy', 'Desconectando…');
  await state.sync.auth.signOut();
  await disconnectCloudSession();
  toast('Cuenta desconectada. Tus datos locales siguen aquí.');
}
async function pullCloudNow({ silent = false } = {}) {
  if (!state.sync.user || !state.sync.db) return false;
  if (!navigator.onLine) {
    setSyncStatus('offline', 'Sin conexión · Firestore sincronizará automáticamente al volver Internet.');
    if (!silent) toast('Ahora mismo estás sin conexión.');
    return false;
  }
  setSyncStatus('busy', 'Comprobando Firebase…');
  await syncLocalToFirebase({ waitForServer: true });
  const refs = userRefs();
  try {
    const [tasksSnap, metaSnap] = await Promise.all([
      refs.tasks.get({ source: 'server' }),
      refs.meta.get({ source: 'server' })
    ]);
    applyRemoteTasks(tasksSnap.docs.map(remoteTaskFromDoc), { silent: true });
    if (metaSnap.exists) applyRemoteMeta(metaSnap.data(), { silent: true });
    setSyncStatus('live', 'Todo sincronizado.');
    if (!silent) toast('Firebase está al día.');
    return true;
  } catch (error) {
    setSyncStatus('error', firebaseErrorText(error));
    if (!silent) toast(firebaseErrorText(error));
    return false;
  }
}
async function initCloudSync() {
  updateSyncUI();
  if (!isCloudConfigured()) {
    setSyncStatus('off', 'Añade los datos de tu Web App de Firebase en config.js.');
    return;
  }
  try { await loadFirebaseLibraries(); }
  catch (error) {
    console.warn(error);
    setSyncStatus('error', 'No se pudo cargar Firebase. La app local sigue funcionando.');
    return;
  }
  try {
    const cfg = window.OPI_CONFIG.firebase;
    state.sync.firebase = window.firebase;
    state.sync.app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(cfg);
    state.sync.auth = window.firebase.auth();
    state.sync.db = window.firebase.firestore();
    try {
      await state.sync.db.enablePersistence({ synchronizeTabs: true });
    } catch (error) {
      if (!['failed-precondition', 'unimplemented'].includes(error?.code)) console.warn('Firestore persistence:', error);
    }
    try { await state.sync.auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL); }
    catch (error) { console.warn('Auth persistence:', error); }
    state.sync.auth.onAuthStateChanged(user => {
      if (!user) { disconnectCloudSession(); return; }
      connectFirebaseUser(user).catch(error => console.error('Firebase user sync:', error));
    });
    setSyncStatus('off', 'Inicia sesión con la misma cuenta en tus dispositivos.');
  } catch (error) {
    console.error('Firebase init:', error);
    setSyncStatus('error', firebaseErrorText(error));
  }
}

function render() {
  document.documentElement.dataset.theme=state.settings.theme||'neutral';
  renderHeader(); renderRoute(); renderHome(); renderCategory(); renderCalendar(); renderPlanning(); renderContextIsland(); updateInstallStatus(); updateSyncUI(); applyAppearance();
  requestAnimationFrame(()=>setupRenderedState());
}
function renderHeader() {
  const now=new Date();
  els.currentDate.textContent=new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(now);
  const hour=now.getHours(); const part=hour<13?'Buenos días':hour<20?'Buenas tardes':'Buenas noches';
  els.greeting.textContent=`${part}, ${state.settings.name||'Angel'} 👋`;
}
function renderRoute() {
  document.body.classList.toggle('home-route', state.route==='home');
  document.body.dataset.route = state.route;
  if(state.route!=='home') document.body.classList.remove('home-results-open');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===state.route));
  if(state.route==='home'){els.homeView.classList.add('active');els.pageTitle.textContent='Inicio';}
  else if(state.route==='calendar'){els.calendarView.classList.add('active');els.pageTitle.textContent='Calendario';}
  else if(state.route==='planning'){els.planningView.classList.add('active');els.pageTitle.textContent='Planificar';}
  else {els.tasksView.classList.add('active');els.pageTitle.textContent=CATEGORY_SHORT[state.route];}
}
function renderHome() {
  const today=todayISO(),hour=new Date().getHours(),load=getDayLoad(today),status=loadStatus(load.percent),focus=getFocusTasks();
  els.homeCard.dataset.loadLevel=status.level;els.loadEmoji.textContent=status.emoji;els.loadStatus.textContent=status.short;els.capacityContext.textContent=`${formatMinutes(load.mental)} / ${formatMinutes(load.capacity)}`;
  const profile=(state.ui.dayProfileDate===today?state.ui.dayProfile:state.settings.defaultProfile)||'normal';
  els.dayProfileLabel.textContent={normal:'Normal',intense:'Intenso',light:'Ligero',rest:'Descanso'}[profile]||'Normal';
  els.tightDayBtn.classList.toggle('active',state.ui.tightDayDate===today);
  if(hour<12){els.adaptiveLine.textContent='Solo lo que importa.';els.focusHeadingText.textContent='Lo imprescindible';}
  else if(hour<18){els.adaptiveLine.textContent=`${focusDoneCount()} de ${Math.max(1,focus.length)} importantes hechas.`;els.focusHeadingText.textContent='Lo que queda';}
  else {const tomorrow=getDayLoad(addDays(today,1));els.adaptiveLine.textContent=`Mañana: ${tasksOn(addDays(today,1)).length} tareas · ${tomorrow.percent}%`;els.focusHeadingText.textContent='Antes de cerrar';}
  els.greeting.textContent=`${hour<12?'Buenos días':hour<20?'Buenas tardes':'Buenas noches'}, ${state.settings.name} 👋`;
  animateLoadPercent(load.percent);els.capacityRing.style.setProperty('--ring-angle',`${Math.min(360,load.percent*3.6)}deg`);els.loadBar.style.width=`${Math.min(100,load.percent)}%`;
  const pendingFocus=focus.filter(t=>!t.completedAt);
  els.topThreeList.innerHTML=pendingFocus.length?pendingFocus.map((task,index)=>renderFocusItem(task,index)).join(''):(focus.length?'<div class="focus-empty focus-done-all">Tus 3 importantes están hechas ✓</div>':'<div class="focus-empty">Nada imprescindible ahora mismo.</div>');
  els.focusProgress.innerHTML=[0,1,2].map(i=>`<span class="progress-dot ${focus[i]?.completedAt?'done':''}"></span>`).join('');
  const next=getNextBestAction();els.startNextBtn.disabled=!next;els.startNextBtn.querySelector('span').textContent=state.ui.activeNowTaskId?'Continuar':'Empezar';
  els.lowEnergyBtn.classList.toggle('active',state.lowEnergyMode);
  const recommendation=getRecommendation();els.smartRecommendation.hidden=!recommendation;if(recommendation){els.smartRecommendation.className=`smart-recommendation ${recommendation.className||''}`;els.smartRecommendation.dataset.recommendation=recommendation.type;els.smartRecommendation.innerHTML=`<span>${escapeHTML(recommendation.text)}</span><strong>${escapeHTML(recommendation.action)} →</strong>`;}
  els.miniAgendaText.textContent=getMiniAgendaText();renderGapChips();els.gestureHint.hidden=state.ui.gestureUses>=3 || !focus.some(t=>!t.completedAt);
  applyHomeCompactness();
}
function applyHomeCompactness(){
  if(!isMobile())return;const short=window.innerHeight<760;document.body.classList.toggle('very-short-home',short&&state.route==='home');
}
function renderFocusItem(task,index) {
  const done=Boolean(task.completedAt);
  return `<article class="focus-row swipe-row ${done?'is-done':''}" data-task-id="${task.id}" style="--delay:${index*55}ms">
    ${done?'':swipeUnder(task.id)}
    <div class="swipe-content" data-open-task="${task.id}">
      <span class="focus-number">${done?ICON('check'):index+1}</span>
      <div class="focus-title-wrap">${task.priority==='high'?'<i class="priority-mark" title="Prioridad alta"></i>':''}<span class="focus-title">${escapeHTML(task.title)}</span></div>
      <span class="focus-duration">${formatMinutes(task.duration)}</span>
    </div>
  </article>`;
}
function renderGapChips() {
  const gaps=getUsableGaps(todayISO()).slice(0,3);
  if(!gaps.length){els.gapChips.innerHTML='<span class="gaps-label">Sin huecos claros</span>';return;}
  els.gapChips.innerHTML=gaps.map(g=>`<button class="gap-chip" data-gap-minutes="${Math.min(g.duration,180)}" title="${minutesToTime(g.start)}–${minutesToTime(g.end)}">${formatMinutes(g.duration)}</button>`).join('');
}
function animateLoadPercent(target) {
  if(reduceMotion()){els.loadPercent.textContent=`${target}%`;els.capacityRing.style.setProperty('--ring-angle', `${Math.min(100,target)*3.6}deg`);return;}
  els.capacityRing.style.setProperty('--ring-angle','0deg');
  const start=performance.now(),duration=360;
  els.loadEmoji.classList.remove('breathe-in'); void els.loadEmoji.offsetWidth; els.loadEmoji.classList.add('breathe-in');
  const step=now=>{const p=Math.min(1,(now-start)/duration);const eased=1-Math.pow(1-p,3);els.loadPercent.textContent=`${Math.round(target*eased)}%`;els.capacityRing.style.setProperty('--ring-angle', `${Math.min(100,target)*3.6*eased}deg`);if(p<1)requestAnimationFrame(step);};
  requestAnimationFrame(step);
}
function renderCategory() {
  if(!['work','personal','study'].includes(state.route)) return;
  els.categoryTitle.textContent=CATEGORY_LABELS[state.route];
  let tasks=state.tasks.filter(t=>t.category===state.route&&!t.archivedAt&&!t.deletedAt);
  if(state.taskFilter==='open') tasks=tasks.filter(t=>!t.completedAt);
  if(state.taskFilter==='today') tasks=tasks.filter(t=>!t.completedAt&&(t.scheduledDate===todayISO()||t.deadline===todayISO()||isOverdueDeadline(t)));
  tasks.sort((a,b)=>Number(Boolean(a.completedAt))-Number(Boolean(b.completedAt))||taskScore(b)-taskScore(a));
  els.categoryTaskList.innerHTML=tasks.map(renderTaskItem).join('');
  els.categoryEmpty.hidden=tasks.length>0;
}
function swipeUnder(id) {
  return `<div class="swipe-under complete"><button data-swipe-complete="${id}">${ICON('check')} Hecho</button></div><div class="swipe-under snooze"><button data-swipe-snooze="${id}">${ICON('snooze')} Aplazar</button></div>`;
}
function getSubtaskProgress(task) { const total=task.subtasks?.length||0; return {total,done:total?task.subtasks.filter(s=>s.completedAt).length:0}; }
function renderTaskItem(task) {
  const done=Boolean(task.completedAt), sub=getSubtaskProgress(task), badges=[];
  if(isOverdueDeadline(task)) badges.push(`<span class="exception-badge due">Vencida · ${formatDate(task.deadline)}</span>`);
  else if(task.deadline===todayISO()) badges.push('<span class="exception-badge due">Vence hoy</span>');
  if(task.snoozeCount>=4) badges.push(`<span class="exception-badge snoozed">${ICON('snooze')} ${task.snoozeCount}</span>`);
  if(sub.total) badges.push(`<span class="exception-badge">${sub.done}/${sub.total} pasos</span>`);
  if(task.kind==='reminder'&&task.scheduledTime) badges.push(`<span class="exception-badge">${ICON('bell')} ${task.scheduledTime}</span>`);
  if(isTaskBlocked(task)) badges.push(`<span class="exception-badge blocked">Bloqueada</span>`);
  if(task.project) badges.push(`<span class="exception-badge project">${escapeHTML(task.project)}</span>`);
  const risk=getTaskRisk(task);if(risk.level==='high'&&!done)badges.push(`<span class="exception-badge risk">En riesgo</span>`);
  return `<article class="task-item swipe-row ${done?'is-done':''} ${isTaskBlocked(task)?'is-blocked':''}" data-task-id="${task.id}">
    ${done?'':swipeUnder(task.id)}
    <div class="swipe-content" data-open-task="${task.id}">
      <button class="task-check" data-action="complete" data-id="${task.id}" aria-label="${done?'Completada':'Completar'}">${ICON('check')}</button>
      <div class="task-main"><div class="task-title-line">${task.priority==='high'?'<i class="priority-mark" title="Prioridad alta"></i>':''}<h3 class="task-title">${escapeHTML(task.title)}</h3></div><div class="exception-row">${badges.join('')}</div></div>
      <div class="task-title-line"><span class="task-duration">${formatMinutes(predictedDuration(task))}</span><button class="row-more" data-open-task="${task.id}" aria-label="Acciones">${ICON('more')}</button></div>
    </div>
  </article>`;
}
function renderSmartList(tasks) { els.smartTaskList.innerHTML=tasks.length?tasks.map(renderTaskItem).join(''):'<div class="focus-empty">No encuentro una tarea que encaje bien ahora mismo.</div>'; }

function renderCalendar() {
  if(state.route!=='calendar') return;
  const cursor=state.calendarCursor;
  els.calendarMonthTitle.textContent=new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(cursor).replace(/^./,c=>c.toUpperCase());
  const first=new Date(cursor.getFullYear(),cursor.getMonth(),1),last=new Date(cursor.getFullYear(),cursor.getMonth()+1,0),offset=(first.getDay()+6)%7,total=Math.ceil((offset+last.getDate())/7)*7,start=new Date(first);start.setDate(first.getDate()-offset);
  const cells=[];
  for(let i=0;i<total;i++){
    const date=new Date(start);date.setDate(start.getDate()+i);const iso=toISO(date),inMonth=date.getMonth()===cursor.getMonth();
    const items=getCalendarItems(iso);
    cells.push(`<div class="calendar-day ${inMonth?'':'outside'} ${iso===todayISO()?'today':''} ${iso===state.calendarSelectedDate?'selected':''}" data-calendar-date="${iso}"><button class="day-number" data-calendar-date="${iso}">${date.getDate()}</button><div class="calendar-events">${items.slice(0,3).map(i=>`<button class="calendar-event ${i.category} ${i.completed?'completed':''}" ${i.type==='task'?`data-open-task="${i.id}"`:''} title="${escapeHTML(i.title)}">${escapeHTML(i.title)}</button>`).join('')}${items.length>3?`<span class="more-events">+${items.length-3}</span>`:''}</div></div>`);
  }
  els.calendarGrid.innerHTML=cells.join('');
  renderCalendarWeekStrip();renderWeekCapacity();renderDayAgenda();
}
function getCalendarItems(date) {
  return [
    ...state.tasks.filter(t=>!t.archivedAt&&!t.deletedAt&&t.scheduledDate===date).map(t=>({type:'task',id:t.id,title:t.title,category:t.category,time:t.scheduledTime||'',completed:Boolean(t.completedAt)})),
    ...state.externalEvents.filter(e=>e.date===date).map(e=>({type:'external',id:e.id,title:e.title,category:'external',time:externalStartMinutes(e)===null?'':minutesToTime(externalStartMinutes(e)),completed:false}))
  ].sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
}
function renderCalendarWeekStrip() {
  const selected=parseISODate(state.calendarSelectedDate);const monday=new Date(selected);monday.setDate(selected.getDate()-((selected.getDay()+6)%7));
  const days=[];
  for(let i=0;i<7;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);const iso=toISO(d),has=getCalendarItems(iso).length>0;days.push(`<button class="week-day ${iso===todayISO()?'today':''} ${iso===state.calendarSelectedDate?'selected':''} ${has?'has-items':''}" data-calendar-date="${iso}"><span>${new Intl.DateTimeFormat('es-ES',{weekday:'short'}).format(d).replace('.','')}</span><strong>${d.getDate()}</strong></button>`);}
  els.calendarWeekStrip.innerHTML=days.join('');
}
function renderWeekCapacity(){
  if(!els.weekCapacityStrip)return;const base=state.calendarSelectedDate||todayISO();const d=parseISODate(base);const day=(d.getDay()+6)%7;const monday=addDays(base,-day);
  els.weekCapacityStrip.innerHTML=Array.from({length:7},(_,i)=>{const date=addDays(monday,i),l=getDayLoad(date),letter=['L','M','X','J','V','S','D'][i];return `<button class="${l.percent>100?'over':''} ${date===state.calendarSelectedDate?'selected':''}" data-calendar-date="${date}"><b>${letter}</b><span>${l.percent}%</span><i style="--p:${Math.min(100,l.percent)}%"></i></button>`;}).join('');
}
function renderDayAgenda() {
  const date=state.calendarSelectedDate, items=getAgendaItems(date), untimed=state.tasks.filter(t=>!t.archivedAt&&!t.deletedAt&&t.scheduledDate===date&&!t.scheduledTime).map(t=>({id:t.id,type:'task',title:t.title,category:t.category,time:'—',minutes:9998,completed:Boolean(t.completedAt)}));
  const all=[...items,...untimed].sort((a,b)=>a.minutes-b.minutes);
  els.dayAgendaTitle.textContent=date===todayISO()?'Hoy':formatDate(date,true);
  const load=getDayLoad(date);els.dayAgendaLoad.textContent=`${load.percent}% · ${formatMinutes(load.planned)}`;
  els.dayAgendaList.innerHTML=all.length?all.map(i=>`<div class="agenda-item ${i.completed?'completed':''}" ${i.type==='task'?`data-open-task="${i.id}"`:''}><span class="agenda-time">${i.time}</span><i class="agenda-color ${i.category}"></i><span class="agenda-title">${escapeHTML(i.title)}</span></div>`).join(''):'<div class="agenda-empty">Nada agendado para este día.</div>';
}
function renderContextIsland() {
  let icon='plus',label='Añadir tarea',action='add';
  if(state.route==='home'){
    const load=getDayLoad(todayISO()),hour=new Date().getHours();
    if(load.percent>100){icon='spark';label='Hazme hueco';action='space';}
    else if(hour>=18){icon='check';label='Cerrar el día';action='close-day';}
    else {const usable=getUsableGaps(todayISO());const gap=usable.find(g=>g.duration>=15&&g.duration<=90)||usable[0];if(gap){icon='clock';label=`Tengo ${formatMinutes(Math.min(gap.duration,90))}`;action='gap';els.contextIsland.dataset.minutes=String(Math.min(gap.duration,90));}}
  }
  if(['work','personal','study'].includes(state.route)){icon='plus';label=`Añadir a ${CATEGORY_SHORT[state.route]}`;action='add';}
  if(state.route==='calendar'){icon='plus';label='Añadir tarea';action='add';}
  if(state.route==='planning'){icon='spark';label='Reequilibrar semana';action='balance-week';}
  els.contextIsland.dataset.islandAction=action;els.contextIsland.innerHTML=`${ICON(icon)}<span>${label}</span>`;
}
function setupRenderedState() {
  if(state.route==='home'&&!reduceMotion()) document.querySelectorAll('.focus-row').forEach(row=>row.classList.add('focus-enter'));
}

function syncModalLock() {
  const anyOpen = Boolean(document.querySelector('.modal-layer.is-open, .now-mode.is-open'));
  document.documentElement.classList.toggle('modal-open', anyOpen);
  document.body.classList.toggle('modal-open', anyOpen);
}
function openSheet(el) {
  if (!el) return;
  // v3.1.3: capas propias en lugar de <dialog>. Así evitamos los estados de foco/
  // puntero que Safari iOS puede dejar bloqueados al combinar showModal + long press.
  cancelActiveGesture();
  releaseSuppressedClicks();
  document.querySelectorAll('.modal-layer.is-open, .now-mode.is-open').forEach(other => {
    if (other !== el) {
      other.classList.remove('is-open');
      other.hidden = true;
      other.setAttribute('aria-hidden', 'true');
    }
  });
  el.hidden = false;
  el.setAttribute('aria-hidden', 'false');
  // Forzamos layout antes de la clase para conservar la microanimación de entrada.
  void el.offsetWidth;
  el.classList.add('is-open');
  syncModalLock();
}
function closeSheet(el) {
  if (!el) return;
  el.classList.remove('is-open');
  el.hidden = true;
  el.setAttribute('aria-hidden', 'true');
  releaseSuppressedClicks();
  cancelActiveGesture();
  syncModalLock();
}
function closeActionSheet(){
  closeSheet(els.actionSheet);
  state.blockClickThroughUntil = performance.now() + 180;
}
function syncCompactTaskMeta(){
  if(!els.taskDateCycle||!els.taskPriorityCycle)return;
  const date=els.taskScheduledDate.value,today=todayISO(),tomorrow=addDays(today,1);
  const dateLabel=date===today?'Hoy':date===tomorrow?'Mañana':date?formatDate(date):'Sin fecha';
  els.taskDateCycle.querySelector('strong').textContent=dateLabel;
  els.taskPriorityCycle.querySelector('strong').textContent=PRIORITY_LABELS[els.taskPriority.value]||'Media';
}
function setTaskAdvanced(open){
  state.ui.advancedTaskOpen=Boolean(open); if(els.taskAdvancedFields)els.taskAdvancedFields.hidden=!open;
  if(els.taskAdvancedToggle){els.taskAdvancedToggle.classList.toggle('open',open);els.taskAdvancedToggle.querySelector('span').textContent=open?'Menos opciones':'Más opciones';}
}
function populateDependencyOptions(currentId=''){
  if(!els.taskDependsOn)return;const current=els.taskDependsOn.value;
  els.taskDependsOn.innerHTML='<option value="">Ninguna</option>'+activeTasks().filter(t=>t.id!==currentId).slice(0,40).map(t=>`<option value="${escapeHTML(t.id)}">${escapeHTML(t.title.slice(0,52))}</option>`).join('');
  if([...els.taskDependsOn.options].some(o=>o.value===current))els.taskDependsOn.value=current;
}
function resetTaskForm() {
  els.taskForm.reset();els.taskEditId.value='';els.taskScheduledDate.value=todayISO();els.taskCategory.value=['work','personal','study'].includes(state.route)?state.route:'personal';els.taskDuration.value='30';els.taskScheduledTime.value='';els.taskDeadline.value='';els.taskRecurrence.value='none';
  if(els.taskProject)els.taskProject.value='';if(els.taskOutcome)els.taskOutcome.value='';if(els.taskContext)els.taskContext.value='';if(els.taskDependsOn)els.taskDependsOn.value='';
  setChoice('priority','medium');setChoice('energy','normal');els.taskTodayPriority.checked=false;els.taskNonNegotiable.checked=false;populateDependencyOptions();setTaskAdvanced(false);syncCompactTaskMeta();updateCapacityPreview();
}
function openTaskSheet(prefill={}) {
  resetTaskForm();
  const task=prefill.editId?state.tasks.find(t=>t.id===prefill.editId):null;
  if(task){
    els.taskEditId.value=task.id;els.taskTitle.value=task.title;els.taskCategory.value=task.category;ensureSelectOption(els.taskDuration,task.duration);els.taskDuration.value=String(task.duration);els.taskScheduledDate.value=task.scheduledDate;els.taskScheduledTime.value=task.scheduledTime;els.taskDeadline.value=task.deadline;els.taskRecurrence.value=task.recurrence;setChoice('priority',task.priority);setChoice('energy',task.energy);els.taskTodayPriority.checked=task.todayPriorityUntil===todayISO();els.taskNonNegotiable.checked=task.nonNegotiableDate===todayISO();
    if(els.taskProject)els.taskProject.value=task.project||'';if(els.taskOutcome)els.taskOutcome.value=task.outcome||'';if(els.taskContext)els.taskContext.value=task.context||'';populateDependencyOptions(task.id);if(els.taskDependsOn)els.taskDependsOn.value=task.dependsOnId||'';
    els.taskSheetKicker.textContent='Editar tarea';els.taskSheetTitle.textContent='Solo lo necesario';if(els.taskHistoryBtn)els.taskHistoryBtn.hidden=false;setTaskAdvanced(true);
  } else { if(prefill.category)els.taskCategory.value=prefill.category;if(prefill.date)els.taskScheduledDate.value=prefill.date;els.taskSheetKicker.textContent='Nueva tarea';els.taskSheetTitle.textContent='Captura rápida';if(els.taskHistoryBtn)els.taskHistoryBtn.hidden=true;setTaskAdvanced(false); }
  applyCategorySuggestion();syncCompactTaskMeta();updateCapacityPreview();openSheet(els.taskSheet);setTimeout(()=>els.taskTitle.focus(),80);
}
function setChoice(group,value) {
  const hidden=group==='priority'?els.taskPriority:els.taskEnergy;hidden.value=value;
  document.querySelectorAll(`[data-choice-group="${group}"] button`).forEach(b=>b.classList.toggle('selected',b.dataset.value===value));
  syncCompactTaskMeta();
}
function ensureSelectOption(select,value) { if(![...select.options].some(o=>Number(o.value)===Number(value))){const o=document.createElement('option');o.value=String(value);o.textContent=formatMinutes(value);select.appendChild(o);} }
function updateCapacityPreview() {
  const date=els.taskScheduledDate.value;if(!date){els.taskCapacityPreview.textContent='Sin día: no afecta a la carga.';els.taskCapacityPreview.classList.remove('warning');return;}
  const duration=Number(els.taskDuration.value||30),exclude=els.taskEditId.value||null,load=getDayLoad(date,duration,exclude);
  els.taskCapacityPreview.textContent=load.percent>100?`⚠️ Ese día quedaría al ${load.percent}%.`:`Ese día quedaría al ${load.percent}%.`;
  els.taskCapacityPreview.classList.toggle('warning',load.percent>100);
}
function openQuickSheet(){els.quickTaskInput.value='';openSheet(els.quickSheet);setTimeout(()=>els.quickTaskInput.focus(),80);}
function openReminderSheet(){els.reminderForm.reset();els.reminderDate.value=todayISO();els.reminderCategory.value=['work','personal','study'].includes(state.route)?state.route:'personal';openSheet(els.reminderSheet);setTimeout(()=>els.reminderTitle.focus(),80);}

function sheetHeader(kicker,title){return `<div class="sheet-handle"></div><div class="sheet-header"><div><span class="section-kicker">${escapeHTML(kicker)}</span><h2 class="action-title">${escapeHTML(title)}</h2></div><button type="button" class="icon-btn subtle" data-close-action>${ICON('close')}</button></div>`;}
function actionOption({icon,title,sub='',end='',attrs='',className=''}){return `<button class="action-option ${className}" ${attrs}><span class="action-icon">${ICON(icon)}</span><span><strong>${escapeHTML(title)}</strong>${sub?`<small>${escapeHTML(sub)}</small>`:''}</span>${end?`<span class="action-end">${escapeHTML(end)}</span>`:'<span></span>'}</button>`;}
function showActionSheet(html){els.actionSheetContent.innerHTML=html;openSheet(els.actionSheet);}

function openWhatsNew(){
  showActionSheet(`${sheetHeader('Novedades','Cambios recientes')}
    <div class="release-notes">
      <section><strong>5.0.2</strong><span>Accesos del botón + corregidos en pulsación larga · panel de novedades.</span></section>
      <section><strong>5.0.1</strong><span>Modo oscuro y PWA pulidos · Ajustes y tarjetas con mejor contraste.</span></section>
      <section><strong>5.0</strong><span>Planning Studio · inteligencia premium · creación de tareas compacta.</span></section>
      <section><strong>4.2</strong><span>Plan resiliente · predicción personal · backups, perfiles y modo Ahora.</span></section>
    </div>
    <div class="sheet-actions"><button class="primary-btn" data-close-action>Entendido</button></div>`);
}

function runFabAction(action){
  els.fabMenu.hidden=true;
  els.fab.setAttribute('aria-expanded','false');
  state.fabLongPressed=false;
  if(action==='task')openTaskSheet();
  else if(action==='quick')openQuickSheet();
  else if(action==='reminder')openReminderSheet();
}
function openTaskActions(id) {
  const task=state.tasks.find(t=>t.id===id);if(!task)return;
  showActionSheet(`${sheetHeader('Tarea',task.title)}<p class="action-meta">${CATEGORY_SHORT[task.category]} · ${formatMinutes(task.duration)}${task.snoozeCount?` · ${task.snoozeCount} aplazamientos`:''}</p><div class="action-list">
    ${actionOption({icon:'edit',title:'Editar',sub:'Detalles, prioridad y protección.',attrs:`data-action="edit" data-id="${task.id}"`})}
    ${actionOption({icon:'move',title:'Mover',sub:'Cambiar de área.',attrs:`data-action="move" data-id="${task.id}"`})}
    ${actionOption({icon:'split',title:'Dividir',sub:'Crear entre 2 y 4 pasos.',attrs:`data-action="split" data-id="${task.id}"`})}
    ${actionOption({icon:'trash',title:'Eliminar',sub:'Puedes deshacer después.',attrs:`data-action="delete" data-id="${task.id}"`,className:'danger-option'})}
  </div>`);
}
function openSnooze(id) {
  const task=state.tasks.find(t=>t.id===id);if(!task)return;const gap=findNextGap(task),tomorrow=addDays(todayISO(),1),tomorrowLoad=getDayLoad(tomorrow,effectiveTaskLoadMinutes(task),task.id);
  state.pendingSnoozeReason=state.lowEnergyMode?'energy':'time';
  showActionSheet(`${sheetHeader('Aplazar',task.title)}<span class="choice-title">Motivo <small>opcional</small></span><div class="choice-row traits-row"><button class="selected" data-snooze-reason="time">Tiempo</button><button data-snooze-reason="energy">Energía</button><button data-snooze-reason="blocked">Bloqueo</button></div><div class="action-list">
    ${actionOption({icon:'snooze',title:`Mañana · ${tomorrowLoad.percent}%`,sub:tomorrowLoad.percent>100?'No resuelve la sobrecarga':formatDate(tomorrow,true),attrs:`data-snooze-choice="tomorrow" data-id="${id}"`})}
    ${actionOption({icon:'spark',title:'Próximo hueco',sub:`${formatDate(gap,true)} · con margen`,attrs:`data-snooze-choice="gap" data-id="${id}"`})}
    ${actionOption({icon:'calendar',title:'Elegir fecha',sub:'Decidirlo manualmente.',attrs:`data-snooze-choice="date" data-id="${id}"`})}
  </div>`);
  setTimeout(()=>els.actionSheetContent.querySelectorAll('[data-snooze-reason]').forEach(b=>b.classList.toggle('selected',b.dataset.snoozeReason===state.pendingSnoozeReason)),0);
}
function showDatePickerForSnooze(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;showActionSheet(`${sheetHeader('Elegir fecha','¿Cuándo encaja mejor?')}<label class="field"><span>Nueva fecha planificada</span><input id="customSnoozeDate" type="date" value="${task.scheduledDate||addDays(todayISO(),1)}" min="${todayISO()}" /></label><div class="sheet-actions"><button class="ghost-btn" data-close-action>Cancelar</button><button class="primary-btn" data-confirm-custom-snooze="${id}">Mover</button></div>`);}
function openTraits(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;showActionSheet(`${sheetHeader('Ajustes rápidos',task.title)}<span class="choice-title">Prioridad</span><div class="choice-row traits-row">${['low','medium','high'].map(v=>`<button class="${task.priority===v?'selected':''}" data-set-priority="${v}" data-id="${id}">${v==='low'?'Baja':v==='medium'?'Media':'● Alta'}</button>`).join('')}</div><span class="choice-title" style="margin-top:14px">Energía</span><div class="choice-row traits-row">${['low','normal','high'].map(v=>`<button class="${task.energy===v?'selected':''}" data-set-energy="${v}" data-id="${id}">${v==='low'?'○ Baja':v==='normal'?'◐ Normal':'● Alta'}</button>`).join('')}</div>`);}
function openMove(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;showActionSheet(`${sheetHeader('Mover de área',task.title)}<div class="action-list">${actionOption({icon:'briefcase',title:'Trabajo',attrs:`data-move-category="work" data-id="${id}"`})}${actionOption({icon:'heart-home',title:'Vida personal / vivienda',attrs:`data-move-category="personal" data-id="${id}"`})}${actionOption({icon:'book',title:'Estudios',attrs:`data-move-category="study" data-id="${id}"`})}</div>`);}
function openSplit(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;showActionSheet(`${sheetHeader('Dividir tarea',task.title)}<p class="action-meta">Entre 2 y 4 pasos. La duración total de la tarea no cambia.</p><div class="split-inputs"><input class="split-part" placeholder="Paso 1"><input class="split-part" placeholder="Paso 2"><input class="split-part" placeholder="Paso 3 (opcional)"><input class="split-part" placeholder="Paso 4 (opcional)"></div><div class="sheet-actions"><button class="ghost-btn" data-close-action>Cancelar</button><button class="primary-btn" data-confirm-split="${id}">Crear pasos</button></div>`);}
function openPostponeHelp(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;showActionSheet(`${sheetHeader('Una señal útil',`Aplazada ${task.snoozeCount} veces`)}<p class="action-meta">En vez de seguir empujándola, quizá convenga cambiar cómo está planteada.</p><div class="action-list">${actionOption({icon:'split',title:'Dividirla',sub:'Convertirla en pasos pequeños.',attrs:`data-action="split" data-id="${id}"`})}${actionOption({icon:'arrow-right',title:'Bajar prioridad',sub:'Dejar de tratarla como urgente.',attrs:`data-lower-priority="${id}"`})}${actionOption({icon:'calendar',title:'Programarla de verdad',sub:'Elegir una fecha concreta.',attrs:`data-snooze-choice="date" data-id="${id}"`})}${actionOption({icon:'archive',title:'Descartarla / archivar',attrs:`data-action="archive" data-id="${id}"`})}${actionOption({icon:'trash',title:'Eliminar definitivamente',sub:'Con opción Deshacer durante unos segundos.',attrs:`data-action="delete" data-id="${id}"`,className:'danger-option'})}</div>`);}
function openMakeSpace(date=todayISO()) {
  const suggestions=getMoveSuggestions(date),current=getDayLoad(date);if(!suggestions.length){
    if(current.percent>100) showActionSheet(`${sheetHeader('Hazme hueco','No movería nada automáticamente')}<div class="action-summary">El día está al <strong>${current.percent}%</strong>, pero lo que queda tiene fecha límite o demasiada prioridad para moverlo sin preguntarte. Mejor revisarlo manualmente.</div><div class="sheet-actions"><button class="ghost-btn" data-close-action>Ahora no</button><button class="primary-btn" data-review-date="${date}">Revisar día</button></div>`);
    else toast('No hace falta liberar espacio ahora mismo.');
    return;
  }
  const moved=suggestions.reduce((s,x)=>s+effectiveTaskLoadMinutes(x.task),0),after=Math.round(((current.mental-moved)/current.capacity)*100);state.pendingSpaceSuggestions=suggestions.map(s=>({id:s.task.id,date:s.targetDate}));
  showActionSheet(`${sheetHeader('Hazme hueco','Más aire, sin tocar fechas límite')}<div class="space-visual"><div class="space-load"><span>Hoy</span><strong>${current.percent}%</strong></div><span class="space-arrow">${ICON('arrow-right')}</span><div class="space-load"><span>Después</span><strong>${after}%</strong></div></div>${suggestions.map(({task,targetDate})=>`<div class="space-card"><div><strong>${escapeHTML(task.title)}</strong><span>${formatMinutes(task.duration)} · ${CATEGORY_SHORT[task.category]}</span></div><em>→ ${formatDate(targetDate)}</em></div>`).join('')}<div class="sheet-actions"><button class="ghost-btn" data-close-action>No mover</button><button class="primary-btn" data-confirm-space>Aceptar</button></div>`);
}
function openDayClose(){const done=completedToday().length,pending=tasksOn(todayISO()),tomorrow=getDayLoad(addDays(todayISO(),1));showActionSheet(`${sheetHeader('Cierre del día','30 segundos y listo')}<div class="action-summary">✓ ${done} completadas · ${pending.length} pendientes · mañana ${tomorrow.percent}%</div><div class="action-list">${actionOption({icon:'arrow-right',title:'Pasar a mañana',attrs:'data-day-close="tomorrow"'})}${actionOption({icon:'spark',title:'Buscar hueco',sub:'Repartir con margen.',attrs:'data-day-close="gaps"'})}${actionOption({icon:'archive',title:'Archivar',attrs:'data-day-close="archive"'})}</div>`);}
function openTomorrowReview(){state.lowEnergyMode=false;const date=addDays(todayISO(),1);state.calendarSelectedDate=date;state.calendarCursor=startOfMonth(parseISODate(date));state.route='calendar';closeActionSheet();render();}
function openOverdueReview(){document.body.classList.add('home-results-open');state.quickMode='overdue';const tasks=getImportantTasks();els.smartResultsTitle.textContent='Lo que conviene resolver primero';renderSmartList(tasks);els.smartResults.hidden=false;setTimeout(()=>els.smartResults.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'nearest'}),0);}

function pushUndo(label,snapshot){
  const item={snapshot,label,expiresAt:Date.now()+90000};state.undoStack=(state.undoStack||[]).filter(x=>x.expiresAt>Date.now()).slice(-2);state.undoStack.push(item);state.undo=item;
  clearTimeout(state.undoTimer);els.undoText.textContent=`${label}${state.undoStack.length>1?` · ${state.undoStack.length} acciones`:''}`;els.undoBar.hidden=false;state.undoTimer=setTimeout(()=>{state.undoStack=[];state.undo=null;els.undoBar.hidden=true;},90000);
}
function mutateWithUndo(label,mutator,{haptic=true}={}){const snapshot=deepClone(state.tasks);mutator();touchChangedTasks(snapshot);saveAll();render();pushUndo(label,snapshot);if(haptic)buzz(9);maybeCelebrateFocus();}
function animatedMutation(id,type,label,mutator){const rows=[...document.querySelectorAll(`[data-task-id="${CSS.escape(id)}"]`)];rows.forEach(r=>r.classList.add(type));const delay=reduceMotion()?0:165;setTimeout(()=>mutateWithUndo(label,mutator),delay);}
function undoLast(){const item=state.undoStack?.pop();if(!item)return;state.tasks=item.snapshot.map(normalizeTask);state.undo=state.undoStack.at(-1)||null;if(!state.undoStack.length)els.undoBar.hidden=true;else els.undoText.textContent=`${state.undo.label} · ${state.undoStack.length} acciones`;saveAll();render();toast('Acción deshecha.');}
function touchChangedTasks(before=[]){const old=new Map(before.map(t=>[t.id,JSON.stringify(t)])),now=new Date().toISOString();state.tasks.forEach(t=>{if(!old.has(t.id)||old.get(t.id)!==JSON.stringify(t))t.modifiedAt=now;});}
function buzz(ms=8){if(state.settings.haptics&&navigator.vibrate)navigator.vibrate(ms);}
function recordGestureUse(){state.ui.gestureUses=Math.min(3,Number(state.ui.gestureUses||0)+1);saveUI();}

function completeTask(id){
  const task=state.tasks.find(t=>t.id===id);if(!task||task.completedAt)return;
  const started=task.startedAt||((state.ui.activeNowTaskId===id)?state.ui.activeNowStartedAt:'');
  animatedMutation(id,'completing','Tarea completada',()=>{
    task.completedAt=new Date().toISOString();
    if(started){
      const actual=Math.max(1,Math.round((Date.now()-new Date(started).getTime())/60000));
      task.actualDuration=Math.max(actual,Number(task.actualDuration||0));
      task.sessions=[...(task.sessions||[]),{startedAt:started,endedAt:new Date().toISOString(),minutes:actual}].slice(-30);
      recordDurationSample(task,actual);
      state.learning.actualSessions=[...(state.learning.actualSessions||[]),{taskId:task.id,category:task.category,minutes:actual,at:new Date().toISOString()}].slice(-120);
    }
    appendTaskHistory(task,'completed');recordCompletionRhythm(task);
    if(state.ui.activeNowTaskId===id){state.ui.activeNowTaskId='';state.ui.activeNowStartedAt='';}
    task.startedAt='';task.pausedAt='';advanceRecurrence(task);
  });
} 
function recordDurationSample(task,actual){if(!Number.isFinite(actual)||actual>720)return;state.learning.durationSamples=(state.learning.durationSamples||[]).slice(-59);state.learning.durationSamples.push({estimated:Number(task.duration||30),actual,category:task.category,date:todayISO()});saveLearning();}
function recordCompletionRhythm(task){const hour=new Date().getHours();const map=state.learning.completionHours||{};map[task.category]=(map[task.category]||[]).slice(-19);map[task.category].push(hour);state.learning.completionHours=map;saveLearning();}

function advanceRecurrence(task){
  if(task.recurrence==='none')return;
  const base=task.scheduledDate||todayISO();let next;
  if(task.recurrence==='daily')next=addDays(base,1);
  else if(task.recurrence==='weekly')next=addDays(base,7);
  else if(task.recurrence==='flex-weekly')next=findFlexibleRecurrenceDate(task,base);
  else next=addMonths(base,1);
  let deadline='';if(task.deadline&&task.scheduledDate){const delta=Math.round((parseISODate(task.deadline)-parseISODate(task.scheduledDate))/86400000);deadline=addDays(next,delta);}
  state.tasks.push(createTask({...task,id:uid(),scheduledDate:next,deadline,completedAt:null,archivedAt:null,deletedAt:null,googleEventId:null,snoozeCount:0,postponeAlertedAtCount:0,startedAt:'',actualDuration:0,sessions:[],history:[],subtasks:(task.subtasks||[]).map(s=>({id:uid(),title:s.title,completedAt:null}))}));
}
function applySnooze(id,date){const task=state.tasks.find(t=>t.id===id);if(!task)return;const reason=state.pendingSnoozeReason||'time';closeActionSheet();animatedMutation(id,'snoozing',`→ ${weekdayName(date)} · ${formatDate(date)}`,()=>{task.scheduledDate=date;task.snoozeCount+=1;task.lastDecisionReason=reason;task.startedAt='';if(state.ui.activeNowTaskId===id){state.ui.activeNowTaskId='';state.ui.activeNowStartedAt='';}state.learning.decisions=(state.learning.decisions||[]).slice(-79);state.learning.decisions.push({taskId:id,category:task.category,reason,hour:new Date().getHours(),date:todayISO()});saveLearning();});}
function archiveTask(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;closeActionSheet();animatedMutation(id,'archiving','Tarea archivada',()=>{task.archivedAt=new Date().toISOString();});}
function deleteTask(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;closeActionSheet();animatedMutation(id,'deleting','Tarea a la papelera',()=>{task.deletedAt=new Date().toISOString();appendTaskHistory(task,'deleted');});}
function confirmSplit(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;const parts=[...els.actionSheetContent.querySelectorAll('.split-part')].map(i=>i.value.trim()).filter(Boolean);if(parts.length<2){toast('Escribe al menos dos pasos.');return;}mutateWithUndo('Tarea dividida',()=>{task.subtasks=parts.slice(0,4).map(title=>({id:uid(),title,completedAt:null}));});closeActionSheet();}
function confirmMakeSpace(){const moves=[...state.pendingSpaceSuggestions];if(!moves.length)return;mutateWithUndo('Día reorganizado',()=>moves.forEach(m=>{const t=state.tasks.find(x=>x.id===m.id);if(t){t.scheduledDate=m.date;t.snoozeCount+=1;}}));state.pendingSpaceSuggestions=[];closeActionSheet();}
function applyDayClose(action){const pending=tasksOn(todayISO());mutateWithUndo('Cierre del día aplicado',()=>pending.forEach(task=>{if(task.nonNegotiableDate===todayISO())return;if(action==='tomorrow'){const tomorrow=addDays(todayISO(),1);task.scheduledDate=getDayLoad(tomorrow,effectiveTaskLoadMinutes(task),task.id).percent<=95?tomorrow:findNextGap(task,tomorrow);task.snoozeCount+=1;task.lastDecisionReason='time';}if(action==='gaps'){task.scheduledDate=findNextGap(task);task.snoozeCount+=1;task.lastDecisionReason='time';}if(action==='archive')task.archivedAt=new Date().toISOString();}));closeActionSheet();}
function maybeCelebrateFocus(){const focus=getFocusTasks();if(focus.length===3&&focus.every(t=>t.completedAt)&&state.ui.celebratedDate!==todayISO()){state.ui.celebratedDate=todayISO();saveUI();setTimeout(()=>{els.focusProgress.classList.add('celebrate');buzz(18);toast('Tus 3, hechos ✓');setTimeout(()=>els.focusProgress.classList.remove('celebrate'),650);},190);}}

function contextFromTask(task){
  if(task.context)return task.context;
  const text=String(task.title||'').toLowerCase();
  if(/llamar|correo|email|mensaje|cita|reservar|pedir|gesti|tramite|trámite/.test(text))return 'admin';
  if(/comprar|recoger|supermercado|farmacia|fuera/.test(text))return 'out';
  if(task.category==='personal')return 'home';
  if(task.energy==='high'||task.category==='study')return 'focus';
  return 'admin';
}
function contextLabelForTask(task){return {admin:'Gestiones',home:'Casa y personal',focus:'Concentración',out:'Fuera'}[contextFromTask(task)]||CATEGORY_SHORT[task.category]||'Tareas';}
function buildSequence(minutes){const candidates=activeTasks().filter(t=>!t.inbox&&predictedDuration(t)<=minutes).sort((a,b)=>taskScore(b)-taskScore(a));if(!candidates.length)return[];const anchor=contextLabelForTask(candidates[0]);let left=minutes;const seq=[];for(const t of candidates){const d=predictedDuration(t);if(d<=left&&(contextLabelForTask(t)===anchor||seq.length===0)){seq.push(t);left-=d;}if(seq.length>=5)break;}if(seq.length<2){for(const t of candidates){if(seq.includes(t))continue;const d=predictedDuration(t);if(d<=left){seq.push(t);left-=d;}if(seq.length>=4)break;}}return seq;}
function showQuickTime(minutes){document.body.classList.add('home-results-open');state.quickMode=`time-${minutes}`;const tasks=activeTasks().filter(t=>!t.inbox&&predictedDuration(t)<=minutes).sort((a,b)=>taskScore(b)-taskScore(a)).slice(0,8);els.smartResultsTitle.textContent=`Lo mejor para ${minutes>=60?formatMinutes(minutes):`${minutes} min`}`;renderSmartList(tasks);const seq=buildSequence(minutes);state.sequenceCandidateIds=seq.map(t=>t.id);els.sequenceStartBtn.hidden=seq.length<2;if(seq.length>=2){const total=seq.reduce((s,t)=>s+predictedDuration(t),0),label=contextLabelForTask(seq[0]);els.contextGroupSummary.hidden=false;els.contextGroupSummary.textContent=`${seq.length} ${label.toLowerCase()} · ${formatMinutes(total)}`;}else els.contextGroupSummary.hidden=true;els.smartResults.hidden=false;setTimeout(()=>els.smartResults.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'nearest'}),0);}
function toggleLowEnergy(){state.lowEnergyMode=!state.lowEnergyMode;renderHome();renderContextIsland();if(state.lowEnergyMode){document.body.classList.add('home-results-open');state.quickMode='low-energy';const tasks=activeTasks().filter(t=>t.energy==='low'||(t.energy==='normal'&&t.duration<=25)).sort((a,b)=>taskScore(b)-taskScore(a)).slice(0,8);els.smartResultsTitle.textContent='Poco esfuerzo, buen avance';renderSmartList(tasks);els.smartResults.hidden=false;}else{els.smartResults.hidden=true;state.quickMode=null;document.body.classList.remove('home-results-open');}}
function closeSmartResults(){state.quickMode=null;state.sequenceCandidateIds=[];els.sequenceStartBtn.hidden=true;els.contextGroupSummary.hidden=true;els.smartResults.hidden=true;document.body.classList.remove('home-results-open');}
function openNowMode(taskId=null,queue=null){
  let task=taskId?state.tasks.find(t=>t.id===taskId):state.ui.activeNowTaskId?state.tasks.find(t=>t.id===state.ui.activeNowTaskId):getNextBestAction();
  if(!task||task.completedAt||task.archivedAt){task=getNextBestAction();}
  if(!task){toast('No hay una siguiente tarea clara ahora mismo.');return;}
  state.nowQueue=Array.isArray(queue)?queue.filter(id=>id!==task.id):state.nowQueue||[];state.nowTaskId=task.id;state.ui.activeNowTaskId=task.id;if(!state.ui.activeNowStartedAt)state.ui.activeNowStartedAt=new Date().toISOString();if(!task.startedAt)task.startedAt=state.ui.activeNowStartedAt;saveUI();saveAll();
  els.nowTaskTitle.textContent=task.title;const predicted=predictedDuration(task);els.nowTaskMeta.textContent=`${formatMinutes(predicted)}${predicted!==task.duration?` estimados · tú pusiste ${formatMinutes(task.duration)}`:''} · ${CATEGORY_SHORT[task.category]}`;els.nowNextBtn.hidden=!state.nowQueue.length;openSheet(els.nowMode);
}
function pauseNowMode(){
  if(state.nowTaskId){
    const task=state.tasks.find(t=>t.id===state.nowTaskId);
    if(task){task.pausedAt=new Date().toISOString();appendTaskHistory(task,'paused');}
    state.ui.activeNowTaskId=state.nowTaskId;saveUI();saveAll();
  }
  closeSheet(els.nowMode);state.nowTaskId=null;toast('Pausada. Puedes continuar después.');
}
function nextNowTask(){const current=state.tasks.find(t=>t.id===state.nowTaskId);if(current)current.startedAt='';const nextId=state.nowQueue.shift();if(!nextId){state.ui.activeNowTaskId='';state.ui.activeNowStartedAt='';saveAll();closeNowMode();return;}state.ui.activeNowStartedAt='';saveAll();closeSheet(els.nowMode);state.nowTaskId=null;setTimeout(()=>openNowMode(nextId,state.nowQueue),30);}
function closeNowMode(){closeSheet(els.nowMode);state.nowTaskId=null;}

function parseNaturalTask(input){
  const original=String(input||'').trim();if(!original)return{};let remaining=original;const result={};
  const normalize=x=>x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');const lower=()=>normalize(remaining);
  if(/\bmanana\b/.test(lower())){result.scheduledDate=addDays(todayISO(),1);remaining=remaining.replace(/\bmañana\b/ig,'');}else if(/\bhoy\b/.test(lower())){result.scheduledDate=todayISO();remaining=remaining.replace(/\bhoy\b/ig,'');}
  const weekdayMap={lunes:1,martes:2,miercoles:3,jueves:4,viernes:5,sabado:6,domingo:0};
  for(const [name,dow] of Object.entries(weekdayMap)){const re=new RegExp(`\\b(?:el\\s+)?${name}\\b`,'i');if(re.test(normalize(remaining))){const now=parseISODate(todayISO()),cur=now.getDay();let delta=(dow-cur+7)%7;if(delta===0)delta=7;result.scheduledDate=addDays(todayISO(),delta);remaining=remaining.replace(new RegExp(`\\b(?:el\\s+)?${name.replace('miercoles','mi[eé]rcoles').replace('sabado','s[aá]bado')}\\b`,'i'),'');break;}}
  const deadlineMatch=normalize(remaining).match(/\bantes del?\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/);if(deadlineMatch){const dow=weekdayMap[deadlineMatch[1]],cur=parseISODate(todayISO()).getDay();let delta=(dow-cur+7)%7;if(delta===0)delta=7;result.deadline=addDays(todayISO(),delta);remaining=remaining.replace(/\bantes del?\s+[a-záéíóú]+\b/i,'');}
  const dateMatch=lower().match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);if(dateMatch){let year=Number(dateMatch[3]||new Date().getFullYear());if(year<100)year+=2000;const d=new Date(year,Number(dateMatch[2])-1,Number(dateMatch[1]));if(!Number.isNaN(d.getTime()))result.scheduledDate=toISO(d);remaining=remaining.replace(dateMatch[0],'');}
  const timeMatch=lower().match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);if(timeMatch){result.scheduledTime=`${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}`;remaining=remaining.replace(timeMatch[0],'');}
  const dur=lower().match(/\b(?:(\d+)\s*h(?:oras?)?)\s*(?:(\d+)\s*m(?:in(?:utos?)?)?)?\b|\b(\d+)\s*m(?:in(?:utos?)?)?\b/);if(dur){const n=Number(dur[1]||0)*60+Number(dur[2]||dur[3]||0);if(n)result.duration=n;remaining=remaining.replace(dur[0],'');}
  for(const [category,pattern] of [['work',/\b(trabajo|laboral)\b/i],['personal',/\b(personal|casa|vivienda|hogar)\b/i],['study',/\b(estudio|estudios)\b/i]]){if(pattern.test(remaining)){result.category=category;remaining=remaining.replace(pattern,'');break;}}
  const energy=remaining.match(/\benerg[ií]a\s+(baja|normal|alta)\b/i);if(energy){result.energy=({baja:'low',normal:'normal',alta:'high'})[energy[1].toLowerCase()];remaining=remaining.replace(energy[0],'');}
  const priority=remaining.match(/\b(prioridad\s+)?(alta|media|baja)\b/i);if(priority){result.priority=({alta:'high',media:'medium',baja:'low'})[priority[2].toLowerCase()];remaining=remaining.replace(priority[0],'');}
  const flexible=normalize(remaining).match(/\b(\d+)\s+veces\s+(?:esta|por)\s+semana\b/);if(flexible){result.recurrence='flex-weekly';result.flexibleWeeklyCount=Math.max(1,Math.min(7,Number(flexible[1])));remaining=remaining.replace(/\b\d+\s+veces\s+(?:esta|por)\s+semana\b/i,'');}
  if(!result.recurrence){for(const [recurrence,pattern] of [['daily',/\b(cada d[ií]a|diaria|diario)\b/i],['weekly',/\b(cada semana|semanal)\b/i],['monthly',/\b(cada mes|mensual)\b/i]]){if(pattern.test(remaining)){result.recurrence=recurrence;remaining=remaining.replace(pattern,'');break;}}}
  const project=remaining.match(/\bproyecto\s+([^,;]+)$/i);if(project){result.project=project[1].trim();remaining=remaining.replace(project[0],'');}
  if(/\b(fuera|recados)\b/i.test(remaining))result.context='out';else if(/\b(gestiones|administrativo)\b/i.test(remaining))result.context='admin';else if(/\b(concentracion|concentración|profundo)\b/i.test(remaining))result.context='focus';
  result.title=remaining.replace(/\s{2,}/g,' ').replace(/\s+([,.;])/g,'$1').trim().replace(/^[-,.;\s]+|[-,.;\s]+$/g,'');return result;
}

function openSettings(){
  els.settingsName.value=state.settings.name;els.settingsCapacity.value=String(state.settings.dailyCapacity);els.settingsHaptics.checked=Boolean(state.settings.haptics);els.settingsWeekendMode.checked=Boolean(state.settings.weekendMode);els.settingsTheme.value=state.settings.theme||'neutral';els.settingsDefaultProfile.value=state.settings.defaultProfile||'normal';els.settingsPrivacyMode.checked=Boolean(state.settings.privacyMode);
  if(els.settingsIntelligentMode)els.settingsIntelligentMode.checked=state.settings.intelligentMode!==false;if(els.settingsBuffer)els.settingsBuffer.value=String(state.settings.bufferPercent??15);if(els.settingsMaxHigh)els.settingsMaxHigh.value=String(state.settings.maxHighPerDay||2);if(els.settingsWorkFreeWeekend)els.settingsWorkFreeWeekend.checked=Boolean(state.settings.workFreeWeekend);if(els.settingsAppearance)els.settingsAppearance.value=state.settings.appearance||'system';
  els.localLockStatus.textContent=state.security.enabled?'Activado en este dispositivo':'Desactivado';updateBiometricUI();updateInstallStatus();updateSyncUI();openSheet(els.settingsSheet);
}
function openResetAppConfirmation(){
  closeSheet(els.settingsSheet);
  showActionSheet(`${sheetHeader('Resetear aplicación','Empezar desde cero')}<div class="action-summary">Se borrarán todas las tareas, ajustes, historial y memoria de Organizador. Si tienes una cuenta sincronizada, también se vaciarán sus datos de Firestore. La cuenta de acceso se conserva.</div><div class="sheet-actions"><button class="ghost-btn" data-close-action>Cancelar</button><button class="primary-btn danger-btn" data-confirm-reset-app>Resetear todo</button></div>`);
}
async function resetApplicationMemory(){
  closeActionSheet();
  if(state.sync.user && !navigator.onLine){
    toast('Con una cuenta sincronizada necesitas conexión para resetear también Firebase.');
    return;
  }
  try{
    if(state.sync.user && state.sync.db){
      setSyncStatus('busy','Borrando tus datos sincronizados…');
      stopFirebaseListeners();
      const refs=userRefs();
      const snap=await refs.tasks.get({source:'server'});
      const docs=snap.docs;
      for(let i=0;i<docs.length;i+=400){
        const batch=state.sync.db.batch();
        docs.slice(i,i+400).forEach(doc=>batch.delete(doc.ref));
        await batch.commit();
      }
      await refs.meta.set({
        schemaVersion:CLOUD_SCHEMA_VERSION,
        settings:{...DEFAULT_SETTINGS},
        externalEvents:[],
        initialized:true,
        updatedAtCloud:state.sync.firebase.firestore.FieldValue.serverTimestamp(),
        deviceId:state.sync.deviceId
      },{merge:false});
    }

    [...Array(localStorage.length).keys()]
      .map(i=>localStorage.key(i))
      .filter(Boolean)
      .filter(key=>key.startsWith('opi_'))
      .forEach(key=>localStorage.removeItem(key));

    state.tasks=[];
    state.settings={...DEFAULT_SETTINGS};
    state.ui=deepClone(DEFAULT_UI);
    state.externalEvents=[];
    state.route='home';
    state.taskFilter='open';
    state.calendarSelectedDate=todayISO();
    state.calendarCursor=startOfMonth(new Date());
    state.lowEnergyMode=false;
    state.quickMode=null;
    state.nowTaskId=null;
    state.nowQueue=[];
    state.learning=deepClone(DEFAULT_LEARNING);
    state.security={...DEFAULT_SECURITY};
    state.undo=null;
    if(els.undoBar) els.undoBar.hidden=true;

    const freshMeta={deviceId:state.sync.deviceId||uid(),userId:state.sync.user?.uid||'',revision:0,lastSyncAt:new Date().toISOString()};
    saveSyncMeta(freshMeta);
    saveAll({skipSync:true});
    setTaskBaseline([]);
    setMetaBaseline({schemaVersion:CLOUD_SCHEMA_VERSION,settings:state.settings,externalEvents:[]});
    if(state.sync.user){
      state.sync.initialized=true;
      subscribeFirebaseRealtime();
      setSyncStatus('live','Aplicación reseteada y Firebase vacío.');
    } else {
      setSyncStatus('off','Aplicación reseteada.');
    }
    render();
    updateSyncUI();
    toast('Aplicación reseteada.');
  }catch(error){
    console.error('Reset app:',error);
    if(state.sync.user) subscribeFirebaseRealtime();
    setSyncStatus('error',firebaseErrorText(error));
    toast('No se pudo completar el reseteo.');
  }
}

function toggleTightDay(){state.ui.tightDayDate=state.ui.tightDayDate===todayISO()?'':todayISO();saveUI();render();toast(state.ui.tightDayDate?'Capacidad de hoy reducida.':'Capacidad normal restaurada.');}
function openDayProfile(){const current=(state.ui.dayProfileDate===todayISO()?state.ui.dayProfile:state.settings.defaultProfile)||'normal';showActionSheet(`${sheetHeader('Perfil del día','¿Qué ritmo tiene hoy?')}<div class="profile-grid">${[['normal','Normal','Tu capacidad habitual'],['intense','Intenso','Algo más de margen'],['light','Ligero','Menos compromisos'],['rest','Descanso','Solo lo esencial']].map(([v,t,s])=>`<button class="${current===v?'selected':''}" data-day-profile="${v}"><strong>${t}</strong><span>${s}</span></button>`).join('')}</div>`);}
function setDayProfile(profile){state.ui.dayProfileDate=todayISO();state.ui.dayProfile=profile;saveUI();closeActionSheet();render();}
function openRecoveryReview(){const r=getRecoverySummary();showActionSheet(`${sheetHeader('Volver sin agobios','Ordenar lo que quedó atrás')}<div class="action-summary"><strong>${r.important.length}</strong> siguen siendo importantes · <strong>${r.movable.length}</strong> pueden buscar hueco · <strong>${r.stale.length}</strong> quizá ya no tienen sentido.</div><div class="sheet-actions"><button class="ghost-btn" data-recovery-dismiss>Solo revisar</button><button class="primary-btn" data-recovery-apply>Repartir con margen</button></div>`);}
function applyRecovery(){const r=getRecoverySummary();mutateWithUndo('Pendientes reorganizados',()=>{r.movable.forEach(t=>{t.scheduledDate=findNextGap(t);t.snoozeCount+=1;t.lastDecisionReason='time';});});state.ui.recoveryPendingDays=0;saveUI();closeActionSheet();}
function openStaleReview(){const tasks=getStaleTasks().slice(0,6);showActionSheet(`${sheetHeader('Tareas que envejecen','¿Siguen mereciendo espacio?')}<div class="action-list">${tasks.map(t=>actionOption({icon:'clock',title:t.title,sub:`${t.snoozeCount} aplazamientos · creada ${formatDate((t.createdAt||'').slice(0,10))}`,attrs:`data-stale-task="${t.id}"`})).join('')}</div>`);}
function openStaleTask(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;showActionSheet(`${sheetHeader('Decidir',t.title)}<div class="action-list">${actionOption({icon:'check',title:'Sí, sigue importando',attrs:`data-stale-keep="${id}"`})}${actionOption({icon:'calendar',title:'Buscarle hueco',attrs:`data-stale-gap="${id}"`})}${actionOption({icon:'archive',title:'Algún día / archivar',attrs:`data-stale-archive="${id}"`})}</div>`);}
function openInboxReview(){const tasks=activeTasks().filter(t=>t.inbox).slice(0,10);showActionSheet(`${sheetHeader('Inbox invisible',`${tasks.length} cosas por colocar`)}<p class="action-meta">Decide solo cuándo; los detalles pueden esperar.</p><div class="action-list">${tasks.map(t=>`<div class="inbox-place-row"><strong>${escapeHTML(t.title)}</strong><div><button data-inbox-place="today" data-id="${t.id}">Hoy</button><button data-inbox-place="week" data-id="${t.id}">Semana</button><button data-inbox-place="later" data-id="${t.id}">Luego</button></div></div>`).join('')}</div>`);}
function placeInbox(id,where){const t=state.tasks.find(x=>x.id===id);if(!t)return;mutateWithUndo('Inbox organizado',()=>{t.inbox=false;t.scheduledDate=where==='today'?todayISO():where==='week'?findNextGap(t,addDays(todayISO(),1)):'';});const left=activeTasks().filter(x=>x.inbox);if(left.length)openInboxReview();else closeActionSheet();}
function getAttentionReminders(){const now=new Date(),today=todayISO(),mins=now.getHours()*60+now.getMinutes();return activeTasks().filter(t=>t.kind==='reminder'&&t.scheduledDate<=today&&(!t.scheduledTime||t.scheduledDate<today||parseTimeMinutes(t.scheduledTime)<=mins));}
function openAttention(){const tasks=getAttentionReminders();showActionSheet(`${sheetHeader('Atención','Lo que no conviene perder')}<div class="action-list">${tasks.map(t=>actionOption({icon:'bell',title:t.title,sub:`${formatDate(t.scheduledDate,true)}${t.scheduledTime?` · ${t.scheduledTime}`:''}`,attrs:`data-open-task="${t.id}"`})).join('')}</div>`);}
function openLifeReview(){const days=Array.from({length:7},(_,i)=>({date:addDays(todayISO(),i),load:getDayLoad(addDays(todayISO(),i))})).filter(x=>x.load.percent>100);const stale=getStaleTasks().slice(0,3);showActionSheet(`${sheetHeader('No me da la vida','Reducir antes de seguir moviendo')}<div class="action-summary">${days.length} días están por encima de tu capacidad. Antes de empujar todo hacia delante, conviene quitar peso.</div>${stale.length?`<div class="action-list">${stale.map(t=>actionOption({icon:'archive',title:t.title,sub:'Pendiente vieja',attrs:`data-stale-archive="${t.id}"`})).join('')}</div>`:''}<div class="sheet-actions"><button class="ghost-btn" data-close-action>Ahora no</button><button class="primary-btn" data-review-date="${days[0]?.date||todayISO()}">Revisar semana</button></div>`);}
function openPerformanceInsight(){const w=getWeeklyPlanningInsight();showActionSheet(`${sheetHeader('Una señal útil','Planificar con margen')}<div class="action-summary">${w.over>0?`Esta semana has planificado aproximadamente un <strong>${w.over}%</strong> por encima de tu capacidad.`:'La semana está dentro de tu capacidad.'} No es una nota: solo sirve para ajustar expectativas.</div><div class="sheet-actions"><button class="primary-btn" data-close-action>Entendido</button></div>`);}
function openUniversalSearch(query=''){
  showActionSheet(`${sheetHeader('Buscar','Todo, sin filtros')}<label class="field"><input id="universalSearchInput" type="search" placeholder="viernes, dentista, trabajo…" value="${escapeHTML(query)}" autocomplete="off" /></label><div class="search-results" id="universalSearchResults"></div>`);setTimeout(()=>{const input=document.getElementById('universalSearchInput');input?.focus();renderSearchResults(input?.value||'');},60);
}
function renderSearchResults(query){
  const box=document.getElementById('universalSearchResults');if(!box)return;let q=String(query||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const synonyms={casa:['personal','vivienda','hogar'],hogar:['personal','vivienda','casa'],curro:['trabajo','laboral'],estudiar:['estudio','estudios'],corto:['10 min','15 min'],urgente:['alta','vence']};const extras=synonyms[q]||[];
  let tasks=state.tasks.filter(t=>!t.archivedAt&&!t.deletedAt);if(q){tasks=tasks.filter(t=>{const hay=`${t.title} ${CATEGORY_LABELS[t.category]} ${t.scheduledDate} ${formatDate(t.scheduledDate,true)} ${t.project} ${t.outcome} ${contextLabelForTask(t)} ${PRIORITY_LABELS[t.priority]}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return hay.includes(q)||extras.some(x=>hay.includes(x));});}
  tasks=tasks.sort((a,b)=>taskScore(b)-taskScore(a)).slice(0,12);box.innerHTML=tasks.length?tasks.map(t=>`<button class="search-result" data-search-open="${t.id}"><strong>${escapeHTML(t.title)}</strong><span>${CATEGORY_SHORT[t.category]} · ${t.project?escapeHTML(t.project)+' · ':''}${t.scheduledDate?formatDate(t.scheduledDate):'sin fecha'}</span></button>`).join(''):'<div class="focus-empty">Sin resultados.</div>';
}
function openCommandPalette(){showActionSheet(`${sheetHeader('Comandos','Ir directo')}<div class="palette-grid"><button data-palette="task">+ Nueva tarea</button><button data-palette="search">⌕ Buscar</button><button data-palette="now">▶ Ahora</button><button data-palette="today">Hoy</button><button data-palette="planning">Planificar</button><button data-palette="trash">Papelera</button><button data-palette="study">Estudios</button><button data-palette="close-day">Cerrar día</button></div>`);}
function exportBackup(){const payload={schemaVersion:DATA_SCHEMA_VERSION,appVersion:CACHE_VERSION,exportedAt:new Date().toISOString(),tasks:state.tasks,settings:state.settings,externalEvents:state.externalEvents,ui:{focus:state.ui.focus},learning:state.learning};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`organizador-backup-${todayISO()}.json`;document.body.appendChild(a);a.click();const url=a.href;a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Copia preparada.');}
async function previewBackup(file){try{const data=JSON.parse(await file.text());if(!Array.isArray(data.tasks))throw new Error('Formato no válido');const incoming=data.tasks.map(normalizeTask),current=new Map(state.tasks.map(t=>[t.id,t]));let fresh=0,modified=0,conflicts=0;for(const t of incoming){const c=current.get(t.id);if(!c)fresh++;else if(taskFingerprint(c)!==taskFingerprint(t)){modified++;if((c.modifiedAt||'')!== (t.modifiedAt||''))conflicts++;}}state.pendingBackup={data:{...data,tasks:incoming},fresh,modified,conflicts};showActionSheet(`${sheetHeader('Restauración segura','Nada se sobrescribe a ciegas')}<div class="action-summary"><strong>${fresh}</strong> nuevas · <strong>${modified}</strong> modificadas · <strong>${conflicts}</strong> conflictos.</div><div class="sheet-actions"><button class="ghost-btn" data-close-action>Cancelar</button><button class="primary-btn" data-confirm-backup>Combinar copia</button></div>`);}catch(e){toast('La copia no es válida.');}}
function confirmBackup(){const p=state.pendingBackup;if(!p)return;const snapshot=deepClone(state.tasks),map=new Map(state.tasks.map(t=>[t.id,t]));p.data.tasks.forEach(t=>{const cur=map.get(t.id);if(!cur||String(t.modifiedAt||'')>String(cur.modifiedAt||''))map.set(t.id,t);});state.tasks=[...map.values()].map(normalizeTask);if(p.data.settings)state.settings={...DEFAULT_SETTINGS,...p.data.settings};if(p.data.externalEvents)state.externalEvents=p.data.externalEvents;if(p.data.learning)state.learning={...DEFAULT_LEARNING,...p.data.learning};saveAll();render();pushUndo('Copia restaurada',snapshot);state.pendingBackup=null;closeActionSheet();toast('Copia combinada.');}
async function sha256(text){const data=new TextEncoder().encode(text),hash=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function bytesToB64url(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function b64urlToBytes(text){const b64=String(text||'').replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(String(text||'').length/4)*4,'=');return Uint8Array.from(atob(b64),c=>c.charCodeAt(0));}
async function setupBiometric(){
  if(!window.PublicKeyCredential||!navigator.credentials?.create){toast('La biometría web no está disponible aquí.');return;}
  try{
    const challenge=crypto.getRandomValues(new Uint8Array(32)),userId=crypto.getRandomValues(new Uint8Array(16));
    const credential=await navigator.credentials.create({publicKey:{challenge,rp:{name:'Organizador'},user:{id:userId,name:'local@organizador',displayName:'Organizador local'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred'},timeout:60000,attestation:'none'}});
    if(!credential?.rawId)throw new Error('Sin credencial');state.security.biometricCredentialId=bytesToB64url(new Uint8Array(credential.rawId));saveSecurity();updateBiometricUI();toast('Desbloqueo del dispositivo activado.');
  }catch(error){console.warn('Biometric setup',error);toast('No se pudo activar el desbloqueo del dispositivo.');}
}
async function unlockBiometric(){
  if(!state.security.biometricCredentialId||!navigator.credentials?.get)return false;
  try{const credential=await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{id:b64urlToBytes(state.security.biometricCredentialId),type:'public-key'}],userVerification:'required',timeout:60000}});if(credential){els.localLockScreen.hidden=true;els.localLockScreen.setAttribute('aria-hidden','true');els.localLockError.textContent='';return true;}}catch(error){console.warn('Biometric unlock',error);}return false;
}
function updateBiometricUI(){if(els.biometricStatus)els.biometricStatus.textContent=state.security.biometricCredentialId?'Activado en este dispositivo':'Configurar si está disponible';if(els.localBiometricBtn)els.localBiometricBtn.hidden=!state.security.biometricCredentialId;}
function openLocalLockSetup(){if(state.security.enabled){showActionSheet(`${sheetHeader('Bloqueo local','Protección de este dispositivo')}<div class="action-summary">El PIN está activado solo en este dispositivo. No se sincroniza con Firebase.</div><div class="sheet-actions"><button class="ghost-btn" data-disable-lock>Desactivar</button><button class="primary-btn" data-change-lock>Cambiar PIN</button></div>`);}else showPinSetup();}
function showPinSetup(){showActionSheet(`${sheetHeader('Bloqueo local','Crear PIN')}<label class="field"><span>PIN de 4 a 6 cifras</span><input id="newLocalPin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" /></label><div class="sheet-actions"><button class="ghost-btn" data-close-action>Cancelar</button><button class="primary-btn" data-save-pin>Activar</button></div>`);}
async function saveLocalPin(){const pin=document.getElementById('newLocalPin')?.value||'';if(!/^\d{4,6}$/.test(pin)){toast('Usa entre 4 y 6 cifras.');return;}state.security={enabled:true,pinHash:await sha256(pin)};saveSecurity();closeActionSheet();toast('Bloqueo local activado.');}
function showLocalLock(){if(!state.security.enabled&&!state.security.biometricCredentialId)return;els.localLockPin.value='';els.localLockError.textContent='';els.localLockScreen.hidden=false;els.localLockScreen.setAttribute('aria-hidden','false');updateBiometricUI();setTimeout(()=>{if(state.security.biometricCredentialId)unlockBiometric();else els.localLockPin.focus();},120);}
async function unlockLocal(){const hash=await sha256(els.localLockPin.value||'');if(hash===state.security.pinHash){els.localLockScreen.hidden=true;els.localLockScreen.setAttribute('aria-hidden','true');els.localLockError.textContent='';}else{els.localLockError.textContent='PIN incorrecto';buzz(20);}}
function openConflictReview(){const c=state.conflicts[0];if(!c){toast('No hay conflictos pendientes.');return;}showActionSheet(`${sheetHeader('Cambio en otro dispositivo','Solo aparece cuando hace falta')}<div class="conflict-card"><strong>Este dispositivo</strong><span>${escapeHTML(c.local.title)} · ${formatDate(c.local.scheduledDate)}</span></div><div class="conflict-card"><strong>Otro dispositivo</strong><span>${escapeHTML(c.remote.title)} · ${formatDate(c.remote.scheduledDate)}</span></div><div class="sheet-actions three"><button class="ghost-btn" data-conflict="remote">Usar nueva</button><button class="ghost-btn" data-conflict="merge">Combinar</button><button class="primary-btn" data-conflict="local">Conservar mía</button></div>`);}
function resolveConflict(choice){const c=state.conflicts.shift();if(!c)return;const i=state.tasks.findIndex(t=>t.id===c.remote.id);if(choice==='remote'){if(i>=0)state.tasks[i]=normalizeTask(c.remote);}else if(choice==='merge'){if(i>=0)state.tasks[i]=mergeConflictFields(c.local,c.remote);state.sync.forceRetry=true;}else{const t=state.tasks.find(x=>x.id===c.local.id);if(t){t.modifiedAt=new Date().toISOString();state.sync.forceRetry=true;}}saveAll();closeActionSheet();render();if(state.conflicts.length)setTimeout(openConflictReview,100);}
function detectRemoteConflicts(remoteTasks){const preserve=new Set();if(!state.sync.initialized)return preserve;const localMap=new Map(state.tasks.map(t=>[t.id,t])),baseline=state.sync.baselineTasks||new Map();for(const remote of remoteTasks){const local=localMap.get(remote.id);if(!local||remote.lastDeviceId===state.sync.deviceId)continue;const localChanged=baseline.get(local.id)&&baseline.get(local.id)!==taskFingerprint(local);const remoteDiff=taskFingerprint(local)!==taskFingerprint(remote);if(localChanged&&remoteDiff){preserve.add(local.id);if(!state.conflicts.some(c=>c.local.id===local.id))state.conflicts.push({local:deepClone(local),remote:deepClone(remote)});}}if(state.conflicts.length)setTimeout(()=>{if(!document.querySelector('.modal-layer.is-open'))openConflictReview();},150);return preserve;}
function updateLastOpened(){const previous=state.ui.lastOpenedDate;const today=todayISO();if(previous&&previous<today){const days=Math.max(0,dayDistance(today)-dayDistance(previous));state.ui.recoveryPendingDays=days>=3?days:0;}state.ui.lastOpenedDate=today;state.ui.lastOpenedAt=new Date().toISOString();saveUI();}
function updateInstallStatus(){if(!els.installAppStatus)return;const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;if(standalone){els.installAppStatus.textContent='Ya está instalada';els.installAppBtn.disabled=true;}else if(state.installPrompt){els.installAppStatus.textContent='Instalar con un toque';els.installAppBtn.disabled=false;}else if(isIOS()){els.installAppStatus.textContent='Añadir a pantalla de inicio en Safari';els.installAppBtn.disabled=false;}else{els.installAppStatus.textContent='Disponible cuando el navegador lo permita';els.installAppBtn.disabled=false;}}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)||(/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1);}
async function installPWA(){if(state.installPrompt){const prompt=state.installPrompt;state.installPrompt=null;await prompt.prompt();await prompt.userChoice;updateInstallStatus();return;}closeSheet(els.settingsSheet);if(isIOS()){showActionSheet(`${sheetHeader('Instalar en iPhone','Añadir a pantalla de inicio')}<div class="action-summary">En Safari: pulsa <strong>Compartir</strong> → <strong>Añadir a pantalla de inicio</strong>. iOS no permite lanzar ese cuadro automáticamente desde una web.</div><div class="sheet-actions"><button class="primary-btn" data-close-action>Entendido</button></div>`);}else{showActionSheet(`${sheetHeader('Instalar app','Tu navegador decide cuándo ofrecerla')}<div class="action-summary">La PWA ya incluye manifest, modo standalone y funcionamiento offline. Si el navegador no muestra instalación todavía, abre su menú y busca “Instalar aplicación”.</div><div class="sheet-actions"><button class="primary-btn" data-close-action>Entendido</button></div>`);}}

async function syncGoogleCalendar(){const clientId=window.OPI_CONFIG&&window.OPI_CONFIG.googleClientId;if(!clientId){closeSheet(els.settingsSheet);showActionSheet(`${sheetHeader('Google Calendar','Falta una configuración única')}<div class="action-summary">Añade tu OAuth Client ID en <strong>config.js</strong>, habilita Google Calendar API y autoriza tu URL de GitHub Pages como origen. Nunca añadas un client secret al repositorio.</div><div class="sheet-actions"><button class="primary-btn" data-close-action>Entendido</button></div>`);return;}try{els.googleSyncStatus.textContent='Conectando…';await loadGoogleIdentity();const token=await getGoogleToken(clientId);state.googleAccessToken=token;const events=await fetchGoogleEvents(token);state.externalEvents=[...state.externalEvents.filter(e=>e.source!=='google'),...events];saveAll();render();els.googleSyncStatus.textContent=`Sincronizado · ${events.length} eventos`;toast('Google Calendar sincronizado.');}catch(error){console.error(error);els.googleSyncStatus.textContent='No se pudo conectar';toast('No se pudo sincronizar Google Calendar.');}}
function loadGoogleIdentity(){if(window.google?.accounts?.oauth2)return Promise.resolve();return new Promise((resolve,reject)=>{const existing=document.querySelector('script[data-google-identity]');if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;script.dataset.googleIdentity='1';script.onload=resolve;script.onerror=reject;document.head.appendChild(script);});}
function getGoogleToken(clientId){return new Promise((resolve,reject)=>{const client=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'https://www.googleapis.com/auth/calendar.events.readonly',callback:r=>r.error?reject(new Error(r.error)):resolve(r.access_token),error_callback:reject});client.requestAccessToken({prompt:state.googleAccessToken?'':'consent'});});}
async function fetchGoogleEvents(token){const min=new Date();min.setDate(min.getDate()-31);const max=new Date();max.setDate(max.getDate()+120);const url=new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');url.searchParams.set('timeMin',min.toISOString());url.searchParams.set('timeMax',max.toISOString());url.searchParams.set('singleEvents','true');url.searchParams.set('orderBy','startTime');url.searchParams.set('maxResults','250');const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error(`Google Calendar ${response.status}`);const data=await response.json();return(data.items||[]).filter(e=>e.status!=='cancelled').map(googleEventToLocal).filter(Boolean);}
function googleEventToLocal(event){const startRaw=event.start?.dateTime||event.start?.date,endRaw=event.end?.dateTime||event.end?.date;if(!startRaw)return null;const allDay=Boolean(event.start?.date),start=allDay?parseISODate(startRaw.slice(0,10)):new Date(startRaw),end=endRaw?(allDay?parseISODate(endRaw.slice(0,10)):new Date(endRaw)):start,duration=allDay?0:Math.max(0,Math.round((end-start)/60000));return{id:`google-${event.id}`,source:'google',title:event.summary||'Evento',date:toISO(start),duration,start:event.start,end:event.end};}
function exportAppleICS(){const tasks=activeTasks().filter(t=>t.scheduledDate).sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate)),lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Organizador Personal Inteligente//ES','CALSCALE:GREGORIAN'];tasks.forEach(task=>{const start=task.scheduledDate.replaceAll('-',''),summary=escapeICS(task.title);lines.push('BEGIN:VEVENT',`UID:${task.id}@opi`,`DTSTAMP:${utcStamp(new Date())}`,task.scheduledTime?`DTSTART:${start}T${task.scheduledTime.replace(':','')}00`:`DTSTART;VALUE=DATE:${start}`,task.scheduledTime?`DURATION:PT${task.duration}M`:'DURATION:P1D',`SUMMARY:${summary}`,`DESCRIPTION:${escapeICS(`${CATEGORY_SHORT[task.category]} · ${PRIORITY_LABELS[task.priority]}`)}`,'END:VEVENT');});lines.push('END:VCALENDAR');const blob=new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='organizador-personal.ics';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Calendario .ics preparado.');}
function utcStamp(date){return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');}function escapeICS(value){return String(value).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
async function importICS(file){const text=await file.text(),blocks=text.replace(/\r?\n[ \t]/g,'').split('BEGIN:VEVENT').slice(1).map(x=>x.split('END:VEVENT')[0]),imported=[];for(const block of blocks){const summary=getICSValue(block,'SUMMARY')||'Evento',startValue=getICSValue(block,'DTSTART'),endValue=getICSValue(block,'DTEND');if(!startValue)continue;const start=parseICSDate(startValue),end=endValue?parseICSDate(endValue):null;if(!start)continue;const allDay=/^\d{8}$/.test(startValue.trim()),duration=!allDay&&end?Math.max(0,Math.round((end-start)/60000)):0;imported.push({id:`ics-${uid()}`,source:'ics',title:unescapeICS(summary),date:toISO(start),duration,start:start.toISOString(),end:end?.toISOString()||null});}state.externalEvents=[...state.externalEvents.filter(e=>e.source!=='ics'),...imported];saveAll();render();toast(`${imported.length} eventos importados.`);}
function getICSValue(block,key){const line=block.split(/\r?\n/).find(l=>l.startsWith(key));return line?line.slice(line.indexOf(':')+1).trim():'';}function parseICSDate(value){const v=value.trim();if(/^\d{8}$/.test(v))return new Date(Number(v.slice(0,4)),Number(v.slice(4,6))-1,Number(v.slice(6,8)));const m=v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);if(!m)return null;const[,y,mo,d,h,min,s='0',z]=m;return z?new Date(Date.UTC(+y,+mo-1,+d,+h,+min,+s)):new Date(+y,+mo-1,+d,+h,+min,+s);}function unescapeICS(value){return value.replace(/\\n/gi,' ').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\');}

function toast(message){els.toast.textContent=message;els.toast.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>els.toast.classList.remove('show'),2100);}
function escapeHTML(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}

/* Interacción táctil robusta · v3.1.3
   - Un toque normal en una tarea abre acciones: ya no se suprime su click por error.
   - Los comandos críticos se ejecutan en pointerup (fiable en iOS) y click queda como respaldo.
   - La supresión se limita al click sintético de una tarea después de swipe/long-press; nunca bloquea toda la app. */
function suppressClicksFor(ms = 260) { state.suppressClickUntil = Math.max(state.suppressClickUntil || 0, performance.now() + ms); }
function clicksAreSuppressed() { return performance.now() < (state.suppressClickUntil || 0); }
function releaseSuppressedClicks() { state.suppressClickUntil = 0; }
function cancelActiveGesture() {
  if (!gesture) return;
  clearTimeout(gesture.timer);
  gesture.row?.classList.remove('swiping','show-complete','show-snooze');
  gesture.row?.querySelector('.swipe-content')?.style.removeProperty('transform');
  gesture = null;
}

let gesture=null;
function resetRevealed(except=null){document.querySelectorAll('.swipe-row.reveal-complete,.swipe-row.reveal-snooze').forEach(row=>{if(row!==except){row.classList.remove('reveal-complete','reveal-snooze');row.querySelector('.swipe-content')?.style.removeProperty('transform');}});}

document.addEventListener('pointerdown',event=>{
  const row=event.target.closest('.swipe-row');
  if(!row||row.classList.contains('is-done')||event.target.closest('button,input,select,textarea,a')){if(!row)resetRevealed();return;}
  resetRevealed(row);
  const id=row.dataset.taskId,startX=event.clientX,startY=event.clientY;
  gesture={row,id,startX,startY,dx:0,dy:0,moved:false,long:false,timer:null};
  gesture.timer=setTimeout(()=>{
    if(!gesture||gesture.moved)return;
    const taskId=gesture.id;
    gesture.long=true;
    buzz(7);
    openTaskActions(taskId);
    // openSheet limpia el gesto; volvemos a armar solo el bloqueo del click sintético de la fila.
    suppressClicksFor(520);
    state.modalIgnoreBackdropUntil=performance.now()+320;
  },480);
  row.classList.add('swiping');
});

document.addEventListener('pointermove',event=>{
  if(!gesture)return;
  gesture.dx=event.clientX-gesture.startX;gesture.dy=event.clientY-gesture.startY;
  if(Math.abs(gesture.dx)>8||Math.abs(gesture.dy)>8){gesture.moved=true;clearTimeout(gesture.timer);}
  if(Math.abs(gesture.dx)>Math.abs(gesture.dy)&&Math.abs(gesture.dx)>6){
    const x=Math.max(-130,Math.min(130,gesture.dx));
    const content=gesture.row.querySelector('.swipe-content');
    if(content) content.style.transform=`translateX(${x}px)`;
    gesture.row.classList.toggle('show-complete',x>0);gesture.row.classList.toggle('show-snooze',x<0);
  }
});

document.addEventListener('pointerup',event=>{
  if(!gesture)return;
  clearTimeout(gesture.timer);
  const {row,id,dx,dy,long}=gesture;
  row.classList.remove('swiping','show-complete','show-snooze');
  const content=row.querySelector('.swipe-content');
  const travel=Math.hypot(dx,dy);
  if(long){content?.style.removeProperty('transform');gesture=null;suppressClicksFor(360);return;}
  if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>=42){
    recordGestureUse();
    suppressClicksFor(320);
    if(dx>=110){content?.style.removeProperty('transform');completeTask(id);}
    else if(dx<=-110){content?.style.removeProperty('transform');openSnooze(id);}
    else if(dx>0){content?.style.removeProperty('transform');row.classList.add('reveal-complete');}
    else{content?.style.removeProperty('transform');row.classList.add('reveal-snooze');}
    gesture=null;
    return;
  }
  content?.style.removeProperty('transform');
  gesture=null;
  // Un toque real (sin scroll) abre acciones directamente en pointerup. Esto evita depender
  // del click sintético de Safari y corrige la zona de título marcada por el usuario.
  if(travel<10){
    openTaskActions(id);
    suppressClicksFor(320);
    state.modalIgnoreBackdropUntil=performance.now()+220;
  }
},{capture:false});

document.addEventListener('pointercancel',()=>{
  if(gesture){clearTimeout(gesture.timer);gesture.row.classList.remove('swiping','show-complete','show-snooze');gesture.row.querySelector('.swipe-content')?.style.removeProperty('transform');gesture=null;}
  // pointercancel no debe dejar un bloqueo global activo.
  releaseSuppressedClicks();
  state.ignorePointerUpPointerId=null;
},{capture:true});
window.addEventListener('blur',()=>{cancelActiveGesture();releaseSuppressedClicks();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelActiveGesture();releaseSuppressedClicks();}});
document.addEventListener('touchcancel',()=>{cancelActiveGesture();releaseSuppressedClicks();},{capture:true,passive:true});

const DIRECT_COMMAND_SELECTOR = [
  '[data-close-sheet]','[data-close-action]','[data-close-now]',
  '[data-action]','[data-swipe-complete]','[data-swipe-snooze]',
  '[data-snooze-choice]','[data-confirm-custom-snooze]','[data-confirm-split]','[data-confirm-space]',
  '[data-set-priority]','[data-set-energy]','[data-move-category]','[data-lower-priority]',
  '[data-postpone-help]','[data-review-date]','[data-day-close]','[data-confirm-reset-app]',
  '[data-snooze-reason]','[data-day-profile]','[data-recovery-dismiss]','[data-recovery-apply]','[data-stale-task]','[data-stale-keep]','[data-stale-gap]','[data-stale-archive]','[data-inbox-place]','[data-search-open]','[data-palette]','[data-confirm-backup]','[data-disable-lock]','[data-change-lock]','[data-save-pin]','[data-conflict]','[data-smart-list]','[data-trash-restore]','[data-trash-empty]','[data-create-outcome]','[data-procrastination]','[data-task-history]',
  '.row-more[data-open-task]'
].join(',');

function runDataCommand(target){
  if(!target)return false;
  const close=target.closest?.('[data-close-sheet]');
  if(close){closeSheet(document.getElementById(close.dataset.closeSheet));return true;}
  if(target.closest?.('[data-close-action]')){closeActionSheet();return true;}
  if(target.closest?.('[data-close-now]')){closeNowMode();return true;}

  const action=target.closest?.('[data-action]');
  if(action){
    const {action:kind,id}=action.dataset;
    if(kind==='complete'){closeActionSheet();completeTask(id);}
    else if(kind==='edit'){closeActionSheet();setTimeout(()=>openTaskSheet({editId:id}),70);}
    else if(kind==='snooze')openSnooze(id);
    else if(kind==='split')openSplit(id);
    else if(kind==='traits')openTraits(id);
    else if(kind==='move')openMove(id);
    else if(kind==='archive')archiveTask(id);
    else if(kind==='delete')deleteTask(id);
    return true;
  }
  const swipeComplete=target.closest?.('[data-swipe-complete]');if(swipeComplete){resetRevealed();completeTask(swipeComplete.dataset.swipeComplete);return true;}
  const swipeSnooze=target.closest?.('[data-swipe-snooze]');if(swipeSnooze){resetRevealed();openSnooze(swipeSnooze.dataset.swipeSnooze);return true;}
  const more=target.closest?.('.row-more[data-open-task]');if(more){openTaskActions(more.dataset.openTask);state.modalIgnoreBackdropUntil=performance.now()+180;return true;}
  const snooze=target.closest?.('[data-snooze-choice]');if(snooze){const task=state.tasks.find(t=>t.id===snooze.dataset.id);if(!task)return true;if(snooze.dataset.snoozeChoice==='tomorrow')applySnooze(task.id,addDays(todayISO(),1));if(snooze.dataset.snoozeChoice==='gap')applySnooze(task.id,findNextGap(task));if(snooze.dataset.snoozeChoice==='date')showDatePickerForSnooze(task.id);return true;}
  const custom=target.closest?.('[data-confirm-custom-snooze]');if(custom){const date=document.getElementById('customSnoozeDate')?.value;if(date)applySnooze(custom.dataset.confirmCustomSnooze,date);return true;}
  const split=target.closest?.('[data-confirm-split]');if(split){confirmSplit(split.dataset.confirmSplit);return true;}
  if(target.closest?.('[data-confirm-space]')){confirmMakeSpace();return true;}
  const priority=target.closest?.('[data-set-priority]');if(priority){const task=state.tasks.find(t=>t.id===priority.dataset.id);if(task){mutateWithUndo('Prioridad actualizada',()=>task.priority=priority.dataset.setPriority);openTraits(task.id);}return true;}
  const energy=target.closest?.('[data-set-energy]');if(energy){const task=state.tasks.find(t=>t.id===energy.dataset.id);if(task){mutateWithUndo('Energía actualizada',()=>task.energy=energy.dataset.setEnergy);openTraits(task.id);}return true;}
  const move=target.closest?.('[data-move-category]');if(move){const task=state.tasks.find(t=>t.id===move.dataset.id);if(task){mutateWithUndo(`Movida a ${CATEGORY_SHORT[move.dataset.moveCategory]}`,()=>task.category=move.dataset.moveCategory);closeActionSheet();}return true;}
  const lower=target.closest?.('[data-lower-priority]');if(lower){const task=state.tasks.find(t=>t.id===lower.dataset.lowerPriority);if(task){mutateWithUndo('Prioridad bajada',()=>task.priority='low');closeActionSheet();}return true;}
  const help=target.closest?.('[data-postpone-help]');if(help){openPostponeHelp(help.dataset.postponeHelp);return true;}
  const reviewDate=target.closest?.('[data-review-date]');if(reviewDate){state.lowEnergyMode=false;state.calendarSelectedDate=reviewDate.dataset.reviewDate;state.calendarCursor=startOfMonth(parseISODate(state.calendarSelectedDate));state.route='calendar';closeActionSheet();render();return true;}
  const dayClose=target.closest?.('[data-day-close]');if(dayClose){applyDayClose(dayClose.dataset.dayClose);return true;}
  if(target.closest?.('[data-confirm-reset-app]')){resetApplicationMemory();return true;}
  const reason=target.closest?.('[data-snooze-reason]');if(reason){state.pendingSnoozeReason=reason.dataset.snoozeReason;els.actionSheetContent.querySelectorAll('[data-snooze-reason]').forEach(b=>b.classList.toggle('selected',b===reason));return true;}
  const profile=target.closest?.('[data-day-profile]');if(profile){setDayProfile(profile.dataset.dayProfile);return true;}
  if(target.closest?.('[data-recovery-dismiss]')){state.ui.recoveryPendingDays=0;saveUI();closeActionSheet();render();return true;}
  if(target.closest?.('[data-recovery-apply]')){applyRecovery();return true;}
  const stale=target.closest?.('[data-stale-task]');if(stale){openStaleTask(stale.dataset.staleTask);return true;}
  const staleKeep=target.closest?.('[data-stale-keep]');if(staleKeep){const t=state.tasks.find(x=>x.id===staleKeep.dataset.staleKeep);if(t){mutateWithUndo('Tarea conservada',()=>{t.snoozeCount=0;t.createdAt=new Date().toISOString();});}closeActionSheet();return true;}
  const staleGap=target.closest?.('[data-stale-gap]');if(staleGap){const t=state.tasks.find(x=>x.id===staleGap.dataset.staleGap);if(t)applySnooze(t.id,findNextGap(t));return true;}
  const staleArchive=target.closest?.('[data-stale-archive]');if(staleArchive){archiveTask(staleArchive.dataset.staleArchive);return true;}
  const inbox=target.closest?.('[data-inbox-place]');if(inbox){placeInbox(inbox.dataset.id,inbox.dataset.inboxPlace);return true;}
  const sr=target.closest?.('[data-search-open]');if(sr){closeActionSheet();setTimeout(()=>openTaskActions(sr.dataset.searchOpen),40);return true;}
  const palette=target.closest?.('[data-palette]');if(palette){const p=palette.dataset.palette;closeActionSheet();if(p==='task')setTimeout(()=>openTaskSheet(),40);if(p==='search')setTimeout(()=>openUniversalSearch(),40);if(p==='now')setTimeout(()=>openNowMode(),40);if(p==='today'){state.route='home';render();}if(p==='study'){state.route='study';render();}if(p==='planning'){state.route='planning';render();}if(p==='trash')setTimeout(openTrash,40);if(p==='close-day')setTimeout(openDayClose,40);return true;}
  if(target.closest?.('[data-confirm-backup]')){confirmBackup();return true;}
  if(target.closest?.('[data-disable-lock]')){state.security={...DEFAULT_SECURITY};saveSecurity();closeActionSheet();toast('Bloqueo desactivado.');return true;}
  if(target.closest?.('[data-change-lock]')){showPinSetup();return true;}
  if(target.closest?.('[data-save-pin]')){saveLocalPin();return true;}
  const conflict=target.closest?.('[data-conflict]');if(conflict){resolveConflict(conflict.dataset.conflict);return true;}
  const smart=target.closest?.('[data-smart-list]');if(smart){openSmartList(smart.dataset.smartList);return true;}
  const restore=target.closest?.('[data-trash-restore]');if(restore){restoreTrashTask(restore.dataset.trashRestore);return true;}
  if(target.closest?.('[data-trash-empty]')){emptyTrash();return true;}
  if(target.closest?.('[data-create-outcome]')){createOutcomeFromSheet();return true;}
  const procrast=target.closest?.('[data-procrastination]');if(procrast){handleProcrastination(procrast.dataset.id,procrast.dataset.procrastination);return true;}
  const hist=target.closest?.('[data-task-history]');if(hist){openTaskHistory(hist.dataset.taskHistory);return true;}
  return false;
}

/* Cierre directo del panel de acciones: en iOS se resuelve en pointerdown para evitar
   que un pointerup/click sintético quede atrapado por el propio gesto que abrió la hoja. */
els.actionSheetContent.addEventListener('pointerdown',event=>{
  const close=event.target.closest?.('[data-close-action]');
  if(!close)return;
  event.preventDefault();
  event.stopPropagation();
  state.ignorePointerUpPointerId=event.pointerId;
  closeActionSheet();
},{capture:true});

/* Cierre robusto de X/Cancelar en todas las hojas: pointerdown evita el click fantasma de iOS. */
document.addEventListener('pointerdown',event=>{
  const close=event.target.closest?.('[data-close-sheet],[data-close-now]');
  if(!close)return;
  event.preventDefault();event.stopPropagation();releaseSuppressedClicks();
  state.ignorePointerUpPointerId=event.pointerId;
  if(close.hasAttribute?.('data-close-now'))closeNowMode();else closeSheet(document.getElementById(close.dataset.closeSheet));
  close.__opiPointerHandledUntil=performance.now()+650;
},{capture:true});

/* iOS ejecuta estos controles en pointerup. click queda como respaldo para teclado/VoiceOver. */
document.addEventListener('pointerup',event=>{
  // Si una hoja se cerró en pointerdown, bloqueamos este pointerup para que no caiga
  // sobre un control que estaba detrás (especialmente el botón ··· de una tarea en iOS).
  if(state.ignorePointerUpPointerId!=null && event.pointerId===state.ignorePointerUpPointerId){state.ignorePointerUpPointerId=null;event.preventDefault();event.stopPropagation();return;}
  const command=event.target.closest?.(DIRECT_COMMAND_SELECTOR);
  if(!command)return;
  // Evita que el mismo pointerup que abrió un modal mediante long-press lo cierre por el backdrop.
  if(command.classList?.contains('modal-backdrop') && performance.now()<(state.modalIgnoreBackdropUntil||0))return;
  event.preventDefault();event.stopPropagation();
  releaseSuppressedClicks();
  command.__opiPointerHandledUntil=performance.now()+650;
  runDataCommand(command);
},{capture:true});

/* FAB: toque = tarea; pulsación larga = tres accesos rápidos.
   Los accesos del menú se resuelven en pointerdown para iOS/PWA: después de una
   pulsación larga Safari puede no sintetizar un click fiable sobre el segundo toque. */
let fabTimer=null;
function cancelFabHold(){clearTimeout(fabTimer);fabTimer=null;els.fab.classList.remove('holding');}
els.fab.addEventListener('pointerdown',event=>{
  if(event.button!=null&&event.button!==0)return;
  state.fabLongPressed=false;
  els.fab.classList.add('holding');
  clearTimeout(fabTimer);
  fabTimer=setTimeout(()=>{
    state.fabLongPressed=true;
    els.fabMenu.hidden=false;
    els.fab.setAttribute('aria-expanded','true');
    buzz(8);
  },430);
});
els.fab.addEventListener('pointerup',()=>{
  const wasLong=state.fabLongPressed;
  cancelFabHold();
  if(!wasLong)openTaskSheet();
  else setTimeout(()=>{state.fabLongPressed=false;},180);
});
els.fab.addEventListener('pointercancel',cancelFabHold);
els.fab.addEventListener('lostpointercapture',cancelFabHold);

// Acción directa y fiable del menú del FAB en táctil.
els.fabMenu.addEventListener('pointerdown',event=>{
  const option=event.target.closest?.('[data-fab-action]');
  if(!option)return;
  event.preventDefault();
  event.stopPropagation();
  option.__opiFabHandledUntil=performance.now()+700;
  runFabAction(option.dataset.fabAction);
},{capture:true});

els.fabMenu.addEventListener('click',event=>{
  const option=event.target.closest?.('[data-fab-action]');
  if(!option)return;
  event.preventDefault();
  event.stopPropagation();
  if(performance.now()<(option.__opiFabHandledUntil||0))return;
  runFabAction(option.dataset.fabAction);
},{capture:true});

/* Eventos de interfaz delegados. */
document.addEventListener('click',event=>{
  if(performance.now()<(state.blockClickThroughUntil||0) && !event.target.closest?.('.modal-layer.is-open,.now-mode.is-open')){
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const command=event.target.closest?.(DIRECT_COMMAND_SELECTOR);
  if(command){
    if(command.classList?.contains('modal-backdrop') && performance.now()<(state.modalIgnoreBackdropUntil||0)){event.preventDefault();event.stopPropagation();return;}
    if(performance.now()<(command.__opiPointerHandledUntil||0)){event.preventDefault();event.stopPropagation();return;}
    if(runDataCommand(command)){event.preventDefault();event.stopPropagation();return;}
  }
  // La supresión se aplica únicamente a la fila de tarea tras un gesto. Nunca bloquea botones,
  // navegación ni controles de un panel abierto.
  if(clicksAreSuppressed() && event.target.closest?.('[data-open-task], .swipe-row')){event.preventDefault();event.stopPropagation();return;}

  const routeBtn=event.target.closest('[data-route]');if(routeBtn){state.route=routeBtn.dataset.route;state.lowEnergyMode=false;closeSmartResults();resetRevealed();render();return;}
  const fabAction=event.target.closest('[data-fab-action]');if(fabAction){if(performance.now()<(fabAction.__opiFabHandledUntil||0))return;runFabAction(fabAction.dataset.fabAction);return;}
  if(!event.target.closest('.fab-wrap')){els.fabMenu.hidden=true;els.fab.setAttribute('aria-expanded','false');}
  const openTask=event.target.closest('[data-open-task]');if(openTask){openTaskActions(openTask.dataset.openTask);return;}
  const calendarDate=event.target.closest('[data-calendar-date]');if(calendarDate){state.calendarSelectedDate=calendarDate.dataset.calendarDate;state.calendarCursor=startOfMonth(parseISODate(state.calendarSelectedDate));renderCalendar();return;}
  const gap=event.target.closest('[data-gap-minutes]');if(gap){showQuickTime(Number(gap.dataset.gapMinutes));return;}
  const planDate=event.target.closest('[data-plan-date]');if(planDate&&!event.target.closest('[data-open-task]')){state.calendarSelectedDate=planDate.dataset.planDate;state.calendarCursor=startOfMonth(parseISODate(state.calendarSelectedDate));state.route='calendar';render();return;}
  const smartList=event.target.closest('[data-smart-list]');if(smartList){openSmartList(smartList.dataset.smartList);return;}
});

/* Cerrar con Escape también funciona con nuestras capas, sin depender de <dialog>. */
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const open=document.querySelector('.modal-layer.is-open, .now-mode.is-open');
  if(!open)return;
  event.preventDefault();
  if(open===els.actionSheet)closeActionSheet();else if(open===els.nowMode)closeNowMode();else closeSheet(open);
});

document.addEventListener('input',event=>{if(event.target?.id==='universalSearchInput')renderSearchResults(event.target.value);});

document.addEventListener('change',event=>{
  const sub=event.target.closest('[data-subtask-toggle]');if(sub){const task=state.tasks.find(t=>t.id===sub.dataset.taskId),st=task?.subtasks.find(s=>s.id===sub.dataset.subtaskToggle);if(task&&st){const snapshot=deepClone(state.tasks);st.completedAt=sub.checked?new Date().toISOString():null;saveAll();render();pushUndo('Paso actualizado',snapshot);setTimeout(()=>openTaskActions(task.id),80);}return;}
});

document.querySelectorAll('[data-task-filter]').forEach(btn=>btn.addEventListener('click',()=>{state.taskFilter=btn.dataset.taskFilter;document.querySelectorAll('[data-task-filter]').forEach(b=>b.classList.toggle('active',b===btn));renderCategory();}));
document.querySelectorAll('[data-choice-group] button').forEach(btn=>btn.addEventListener('click',()=>{const group=btn.closest('[data-choice-group]').dataset.choiceGroup;setChoice(group,btn.dataset.value);}));

document.getElementById('openCalendar').addEventListener('click',()=>{state.lowEnergyMode=false;state.route='calendar';state.calendarSelectedDate=todayISO();state.calendarCursor=startOfMonth(new Date());render();});
document.getElementById('openWhatsNew').addEventListener('click',openWhatsNew);
document.getElementById('homeCalendarShortcut').addEventListener('click',()=>{state.lowEnergyMode=false;state.route='calendar';render();});
els.miniAgendaOpen.addEventListener('click',()=>{state.lowEnergyMode=false;state.route='calendar';render();});
document.getElementById('openSettingsSide').addEventListener('click',openSettings);
document.getElementById('openSettingsTop').addEventListener('click',openSettings);
els.startNextBtn.addEventListener('click',()=>openNowMode());
els.lowEnergyBtn.addEventListener('click',toggleLowEnergy);
els.tightDayBtn.addEventListener('click',toggleTightDay);
els.dayProfileBtn.addEventListener('click',openDayProfile);
els.sequenceStartBtn.addEventListener('click',()=>{const q=[...state.sequenceCandidateIds];if(!q.length)return;closeSmartResults();openNowMode(q.shift(),q);});
els.smartRecommendation.addEventListener('click',()=>{const type=els.smartRecommendation.dataset.recommendation;if(type==='space')openMakeSpace();else if(type==='tomorrow')openTomorrowReview();else if(type==='overdue')openOverdueReview();else if(type==='recovery')openRecoveryReview();else if(type==='stale')openStaleReview();else if(type==='inbox')openInboxReview();else if(type==='life')openLifeReview();else if(type==='performance')openPerformanceInsight();else if(type==='attention')openAttention();else if(type==='continue')openNowMode(state.ui.activeNowTaskId);});
document.getElementById('closeSmartResults').addEventListener('click',closeSmartResults);
els.contextIsland.addEventListener('click',()=>{if(state.islandLongPressed){state.islandLongPressed=false;return;}const action=els.contextIsland.dataset.islandAction;if(action==='space')openMakeSpace();else if(action==='close-day')openDayClose();else if(action==='gap')showQuickTime(Number(els.contextIsland.dataset.minutes||30));else if(action==='balance-week')applyWeekBalance();else openTaskSheet({category:['work','personal','study'].includes(state.route)?state.route:undefined});});
els.undoBtn.addEventListener('click',undoLast);

els.taskScheduledDate.addEventListener('change',updateCapacityPreview);els.taskDuration.addEventListener('change',updateCapacityPreview);
els.taskForm.addEventListener('submit',event=>{
  event.preventDefault();const title=els.taskTitle.value.trim();if(!title)return;
  const editId=els.taskEditId.value,existing=state.tasks.find(t=>t.id===editId),snapshot=deepClone(state.tasks);
  const data={title,category:els.taskCategory.value,priority:els.taskPriority.value,energy:els.taskEnergy.value,scheduledDate:els.taskScheduledDate.value,scheduledTime:els.taskScheduledTime.value,deadline:els.taskDeadline.value,duration:Number(els.taskDuration.value),recurrence:els.taskRecurrence.value,todayPriorityUntil:els.taskTodayPriority.checked?todayISO():'',nonNegotiableDate:els.taskNonNegotiable.checked?todayISO():'',project:els.taskProject?.value.trim()||'',outcome:els.taskOutcome?.value.trim()||'',dependsOnId:els.taskDependsOn?.value||'',context:els.taskContext?.value||'',modifiedAt:new Date().toISOString()};
  if(data.nonNegotiableDate&&!existing&&activeTasks().filter(t=>t.nonNegotiableDate===todayISO()).length>=3){data.nonNegotiableDate='';toast('Máximo 3 no negociables al día.');}
  if(data.priority==='high'&&state.settings.intelligentMode){const high=tasksOn(data.scheduledDate||todayISO()).filter(t=>t.id!==editId&&t.priority==='high').length;if(high>=Number(state.settings.maxHighPerDay||2))toast('Ese día ya tiene varias tareas de prioridad alta.');}
  if(existing){const before=deepClone(existing);Object.assign(existing,data);appendTaskHistory(existing,'edited',before);}
  else {const created=createTask(data);appendTaskHistory(created,'created');state.tasks.push(created);learnCategoryCorrection(created);considerTaskForFocus(created);}
  saveAll();closeSheet(els.taskSheet);render();pushUndo(existing?'Tarea actualizada':'Tarea creada',snapshot);
  const load=data.scheduledDate?getDayLoad(data.scheduledDate):null;toast(load&&load.percent>100?`Ese día queda al ${load.percent}%`:(existing?'Cambios guardados.':'Tarea guardada.'));
});
els.quickForm.addEventListener('submit',event=>{event.preventDefault();const parsed=parseNaturalTask(els.quickTaskInput.value);if(!parsed.title){toast('Escribe una tarea.');return;}const snapshot=deepClone(state.tasks);const hasStructure=Boolean(parsed.category||parsed.scheduledDate||parsed.scheduledTime||parsed.priority||parsed.energy||parsed.duration||parsed.recurrence||parsed.deadline||parsed.project||parsed.context);const task=createTask({title:parsed.title,category:parsed.category||suggestCategoryForTitle(parsed.title)||(['work','personal','study'].includes(state.route)?state.route:'personal'),priority:parsed.priority||'medium',energy:parsed.energy||'normal',scheduledDate:parsed.scheduledDate||(hasStructure?todayISO():''),scheduledTime:parsed.scheduledTime||'',deadline:parsed.deadline||'',duration:parsed.duration||30,recurrence:parsed.recurrence||'none',flexibleWeeklyCount:parsed.flexibleWeeklyCount||3,project:parsed.project||'',context:parsed.context||'',inbox:!hasStructure,modifiedAt:new Date().toISOString()});appendTaskHistory(task,'created');state.tasks.push(task);learnCategoryCorrection(task);considerTaskForFocus(task);saveAll();closeSheet(els.quickSheet);render();pushUndo('Tarea creada',snapshot);toast(task.inbox?'Guardada en Inbox.':'Entrada rápida creada.');});
els.reminderForm.addEventListener('submit',event=>{event.preventDefault();const title=els.reminderTitle.value.trim();if(!title)return;const snapshot=deepClone(state.tasks);const reminder=createTask({title,kind:'reminder',category:els.reminderCategory.value,priority:'medium',energy:'low',scheduledDate:els.reminderDate.value,scheduledTime:els.reminderTime.value,deadline:'',duration:5,recurrence:'none'});state.tasks.push(reminder);considerTaskForFocus(reminder);saveAll();closeSheet(els.reminderSheet);render();pushUndo('Recordatorio creado',snapshot);toast('Recordatorio guardado.');});

els.settingsForm.addEventListener('submit',event=>{event.preventDefault();state.settings.name=els.settingsName.value.trim()||'Angel';state.settings.dailyCapacity=Number(els.settingsCapacity.value||450);state.settings.haptics=els.settingsHaptics.checked;state.settings.weekendMode=els.settingsWeekendMode.checked;state.settings.theme=els.settingsTheme.value;state.settings.defaultProfile=els.settingsDefaultProfile.value;state.settings.privacyMode=els.settingsPrivacyMode.checked;state.settings.intelligentMode=els.settingsIntelligentMode?.checked!==false;state.settings.bufferPercent=Number(els.settingsBuffer?.value||15);state.settings.maxHighPerDay=Number(els.settingsMaxHigh?.value||2);state.settings.workFreeWeekend=Boolean(els.settingsWorkFreeWeekend?.checked);state.settings.appearance=els.settingsAppearance?.value||'system';saveAll();closeSheet(els.settingsSheet);render();toast('Ajustes guardados.');});
if(els.taskAdvancedToggle)els.taskAdvancedToggle.addEventListener('click',()=>setTaskAdvanced(els.taskAdvancedFields.hidden));
if(els.taskDateCycle)els.taskDateCycle.addEventListener('click',cycleCompactDate);
if(els.taskPriorityCycle)els.taskPriorityCycle.addEventListener('click',cycleCompactPriority);
if(els.taskVoiceBtn)els.taskVoiceBtn.addEventListener('click',()=>startSpeechCapture(els.taskTitle));
if(els.taskHistoryBtn)els.taskHistoryBtn.addEventListener('click',()=>{const id=els.taskEditId.value;if(id){closeSheet(els.taskSheet);setTimeout(()=>openTaskHistory(id),40);}});
if(els.quickVoiceBtn)els.quickVoiceBtn.addEventListener('click',()=>startSpeechCapture(els.quickTaskInput));
els.taskTitle.addEventListener('input',()=>{if(!els.taskEditId.value){applyCategorySuggestion();const parsed=parseNaturalTask(els.taskTitle.value);if(parsed.category)els.taskCategory.value=parsed.category;if(parsed.duration){ensureSelectOption(els.taskDuration,parsed.duration);els.taskDuration.value=String(parsed.duration);}if(parsed.scheduledDate)els.taskScheduledDate.value=parsed.scheduledDate;if(parsed.deadline)els.taskDeadline.value=parsed.deadline;if(parsed.priority)setChoice('priority',parsed.priority);if(parsed.energy)setChoice('energy',parsed.energy);if(parsed.recurrence)els.taskRecurrence.value=parsed.recurrence;if(parsed.project&&els.taskProject)els.taskProject.value=parsed.project;if(parsed.context&&els.taskContext)els.taskContext.value=parsed.context;syncCompactTaskMeta();updateCapacityPreview();}});
els.taskScheduledDate.addEventListener('change',()=>{syncCompactTaskMeta();updateCapacityPreview();});els.taskDuration.addEventListener('change',updateCapacityPreview);
if(els.planningBalanceBtn)els.planningBalanceBtn.addEventListener('click',applyWeekBalance);
if(els.planningCleanBtn)els.planningCleanBtn.addEventListener('click',()=>{const stale=getStaleTasks().slice(0,8);if(!stale.length){toast('No hay pendientes antiguos que limpiar.');return;}showActionSheet(`${sheetHeader('Limpieza inteligente','Menos deuda de tareas')}<div class="action-list">${stale.map(t=>actionOption({icon:'spark',title:t.title,sub:getProcrastinationStep(t)||'Revisar',attrs:`data-procrastination="split" data-id="${t.id}"`})).join('')}</div>`);});
if(els.newOutcomeBtn)els.newOutcomeBtn.addEventListener('click',openNewOutcome);
if(els.openTrashBtn)els.openTrashBtn.addEventListener('click',openTrash);
if(els.exportCsvBtn)els.exportCsvBtn.addEventListener('click',exportCSV);
if(els.autoBackupBtn)els.autoBackupBtn.addEventListener('click',makeAutoBackup);
els.resetAppBtn.addEventListener('click',openResetAppConfirmation);
els.exportBackupBtn.addEventListener('click',exportBackup);els.importBackupBtn.addEventListener('click',()=>els.backupFileInput.click());els.backupFileInput.addEventListener('change',async()=>{const f=els.backupFileInput.files?.[0];if(f)await previewBackup(f);els.backupFileInput.value='';});els.localLockBtn.addEventListener('click',openLocalLockSetup);els.localUnlockBtn.addEventListener('click',unlockLocal);els.localLockPin.addEventListener('keydown',e=>{if(e.key==='Enter')unlockLocal();});if(els.biometricSetupBtn)els.biometricSetupBtn.addEventListener('click',setupBiometric);if(els.localBiometricBtn)els.localBiometricBtn.addEventListener('click',unlockBiometric);
els.syncSignInBtn.addEventListener('click',()=>signInSyncAccount().catch(error=>{console.error(error);setSyncStatus('error',firebaseErrorText(error));}));els.syncCreateBtn.addEventListener('click',()=>createSyncAccount().catch(error=>{console.error(error);setSyncStatus('error',firebaseErrorText(error));}));els.syncResetBtn.addEventListener('click',()=>resetSyncPassword().catch(error=>{console.error(error);toast(firebaseErrorText(error));}));els.syncNowBtn.addEventListener('click',()=>pullCloudNow().catch(error=>{console.error(error);setSyncStatus('error',firebaseErrorText(error));}));els.syncSignOutBtn.addEventListener('click',()=>signOutCloud().catch(error=>{console.error(error);setSyncStatus('error',firebaseErrorText(error));}));
document.getElementById('googleSyncBtn').addEventListener('click',syncGoogleCalendar);document.getElementById('appleExportBtn').addEventListener('click',exportAppleICS);document.getElementById('icsImportBtn').addEventListener('click',()=>els.icsFileInput.click());els.icsFileInput.addEventListener('change',async()=>{const file=els.icsFileInput.files?.[0];if(file)await importICS(file);els.icsFileInput.value='';});els.installAppBtn.addEventListener('click',installPWA);

document.getElementById('calendarPrev').addEventListener('click',()=>{if(isMobile()){state.calendarSelectedDate=addDays(state.calendarSelectedDate,-7);state.calendarCursor=startOfMonth(parseISODate(state.calendarSelectedDate));}else state.calendarCursor=new Date(state.calendarCursor.getFullYear(),state.calendarCursor.getMonth()-1,1);renderCalendar();});
document.getElementById('calendarNext').addEventListener('click',()=>{if(isMobile()){state.calendarSelectedDate=addDays(state.calendarSelectedDate,7);state.calendarCursor=startOfMonth(parseISODate(state.calendarSelectedDate));}else state.calendarCursor=new Date(state.calendarCursor.getFullYear(),state.calendarCursor.getMonth()+1,1);renderCalendar();});
document.getElementById('calendarToday').addEventListener('click',()=>{state.calendarSelectedDate=todayISO();state.calendarCursor=startOfMonth(new Date());renderCalendar();});

els.nowCompleteBtn.addEventListener('click',()=>{const id=state.nowTaskId;if(!id)return;const next=state.nowQueue.shift();closeSheet(els.nowMode);state.nowTaskId=null;completeTask(id);if(next)setTimeout(()=>openNowMode(next,state.nowQueue),220);});els.nowPauseBtn.addEventListener('click',pauseNowMode);els.nowNextBtn.addEventListener('click',nextNowTask);els.nowSnoozeBtn.addEventListener('click',()=>{const id=state.nowTaskId;closeNowMode();if(id)setTimeout(()=>openSnooze(id),70);});els.nowMoreBtn.addEventListener('click',()=>{const id=state.nowTaskId;closeNowMode();if(id)setTimeout(()=>openTaskActions(id),70);});

window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();state.installPrompt=event;updateInstallStatus();});window.addEventListener('appinstalled',()=>{state.installPrompt=null;toast('Organizador instalado.');updateInstallStatus();});

function checkReminders(){const now=new Date(),date=toISO(now),minutes=now.getHours()*60+now.getMinutes();state.tasks.filter(t=>!t.completedAt&&!t.archivedAt&&t.kind==='reminder'&&t.scheduledDate===date&&t.scheduledTime).forEach(t=>{const target=parseTimeMinutes(t.scheduledTime);if(target!==null&&minutes>=target&&minutes-target<=2&&!state.ui.reminderNotified[t.id]){state.ui.reminderNotified[t.id]=new Date().toISOString();saveUI();buzz(20);toast(`🔔 ${t.title}`);}});}
setInterval(checkReminders,30000);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.settings.privacyMode){els.privacyCurtain.hidden=false;}else if(!document.hidden){els.privacyCurtain.hidden=true;checkReminders();if(state.security.enabled)showLocalLock();if(state.sync.user)pullCloudNow({silent:true}).catch(()=>{});}});
window.addEventListener('pageshow',()=>{if(state.sync.user&&navigator.onLine)pullCloudNow({silent:true}).catch(()=>{});});

/* iOS/PWA: evita el menú nativo de copiar/pegar al mantener pulsado.
   No cancelamos pointerdown/touchstart para conservar foco, teclado y gestos propios. */
document.addEventListener('contextmenu', event => event.preventDefault(), {capture:true});
document.addEventListener('dragstart', event => {
  if (!event.target.closest('input,textarea,select')) event.preventDefault();
}, {capture:true});

/* Bloqueo de zoom solicitado: pinch/doble toque/ctrl-wheel y atajos dentro de la página. */
['gesturestart','gesturechange','gestureend'].forEach(name=>document.addEventListener(name,event=>event.preventDefault(),{passive:false}));
document.addEventListener('touchmove',event=>{if(event.touches&&event.touches.length>1)event.preventDefault();},{passive:false});
document.addEventListener('dblclick',event=>event.preventDefault(),{passive:false});
window.addEventListener('wheel',event=>{if(event.ctrlKey)event.preventDefault();},{passive:false});
window.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&['+','-','=','0'].includes(event.key)){event.preventDefault();return;}if(event.target.closest?.('input,textarea,select'))return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openCommandPalette();return;}if(event.key==='/'){event.preventDefault();openUniversalSearch();return;}if(event.key.toLowerCase()==='n'){event.preventDefault();openTaskSheet();return;}if(event.key.toLowerCase()==='a'){event.preventDefault();openNowMode();return;}if(event.key.toLowerCase()==='t'){event.preventDefault();state.route='home';render();return;}});


let homePull=null,islandHold=null;
els.homeView.addEventListener('pointerdown',e=>{if(state.route!=='home'||e.pointerType==='mouse'||e.clientY>190||e.target.closest?.('.swipe-row,button,input'))return;homePull={y:e.clientY,dy:0};},{passive:true});
els.homeView.addEventListener('pointermove',e=>{if(homePull)homePull.dy=e.clientY-homePull.y;},{passive:true});
els.homeView.addEventListener('pointerup',()=>{if(homePull?.dy>70&&!document.querySelector('.modal-layer.is-open'))openUniversalSearch();homePull=null;},{passive:true});
els.contextIsland.addEventListener('pointerdown',()=>{islandHold=setTimeout(()=>{islandHold=null;state.islandLongPressed=true;openCommandPalette();buzz(8);},520);});
els.contextIsland.addEventListener('pointerup',()=>{if(islandHold){clearTimeout(islandHold);islandHold=null;}});els.contextIsland.addEventListener('pointercancel',()=>{if(islandHold)clearTimeout(islandHold);islandHold=null;});
window.addEventListener('online',()=>{updateSyncUI();if(isCloudConfigured()&&!state.sync.auth){initCloudSync().catch(()=>{});return;}if(state.sync.user){state.sync.forceRetry=true;syncLocalToFirebase().catch(()=>{});setTimeout(()=>pullCloudNow({silent:true}).catch(()=>{}),350);}});
window.addEventListener('offline',()=>{if(state.sync.user)setSyncStatus('offline','Sin conexión · los cambios quedarán pendientes.');else updateSyncUI();});

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=5.0.2',{updateViaCache:'none'}).then(reg=>reg.update()).catch(error=>console.warn('Service worker:',error)));}

function processLaunchAction(){
  const u=new URL(location.href),action=u.searchParams.get('action');if(!action)return;
  const clean=location.pathname+(location.hash||'');history.replaceState({},'',clean);
  setTimeout(()=>{if(action==='new')openTaskSheet();else if(action==='now')openNowMode();else if(action==='search')openUniversalSearch();},350);
}
cleanupOldTrash();createWeeklySnapshot();updateLastOpened();ensureDailyFocus();render();checkReminders();updateSyncUI();processShareTarget();processLaunchAction();setTimeout(()=>{if(state.security.enabled||state.security.biometricCredentialId)showLocalLock();},250);initCloudSync().catch(error=>{console.error('Firebase sync:',error);setSyncStatus('error','La sincronización con Firebase no pudo iniciarse.');});
