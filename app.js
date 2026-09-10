'use strict';

const STORAGE_KEY = 'opi_tasks_v2';
const LEGACY_STORAGE_KEY = 'opi_tasks_v1';
const SETTINGS_KEY = 'opi_settings_v2';
const EXTERNAL_EVENTS_KEY = 'opi_external_events_v2';
const UI_KEY = 'opi_ui_v3';
const CACHE_VERSION = '3.0';

const DEFAULT_SETTINGS = { name: 'Angel', dailyCapacity: 450, haptics: true };
const DEFAULT_UI = { focus: { date: '', ids: [] }, gestureUses: 0, celebratedDate: '', reminderNotified: {} };
const CATEGORY_LABELS = { work: 'Trabajo', personal: 'Vida personal / vivienda', study: 'Estudios' };
const CATEGORY_SHORT = { work: 'Trabajo', personal: 'Personal', study: 'Estudios' };
const PRIORITY_LABELS = { low: 'Baja', medium: 'Media', high: 'Alta' };
const ENERGY_LABELS = { low: 'Baja', normal: 'Normal', high: 'Alta' };
const ICON = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;

const state = {
  route: 'home',
  taskFilter: 'open',
  tasks: loadTasks(),
  settings: loadSettings(),
  ui: loadUI(),
  externalEvents: loadExternalEvents(),
  calendarCursor: startOfMonth(new Date()),
  calendarSelectedDate: todayISO(),
  googleAccessToken: null,
  quickMode: null,
  lowEnergyMode: false,
  nowTaskId: null,
  undo: null,
  installPrompt: null,
  pendingSpaceSuggestions: [],
  suppressNextClick: false,
  fabLongPressed: false
};

const ids = [
  'currentDate','pageTitle','capacityRing','homeView','tasksView','calendarView','homeCard','greeting','adaptiveLine','loadEmoji','loadPercent','loadStatus','capacityContext','loadBar','focusHeadingText','focusProgress','topThreeList','startNextBtn','lowEnergyBtn','smartRecommendation','miniAgendaText','miniAgendaOpen','gapChips','gestureHint','smartResults','smartResultsTitle','smartTaskList','categoryTitle','categoryTaskList','categoryEmpty','calendarMonthTitle','calendarGrid','calendarWeekStrip','dayAgendaTitle','dayAgendaLoad','dayAgendaList','contextIsland','fab','fabMenu','taskSheet','taskForm','taskSheetKicker','taskSheetTitle','taskEditId','taskTitle','taskCategory','taskDuration','taskScheduledDate','taskScheduledTime','taskDeadline','taskRecurrence','taskPriority','taskEnergy','taskCapacityPreview','quickSheet','quickForm','quickTaskInput','reminderSheet','reminderForm','reminderTitle','reminderDate','reminderTime','reminderCategory','actionSheet','actionSheetContent','settingsSheet','settingsForm','settingsName','settingsCapacity','settingsHaptics','googleSyncStatus','icsFileInput','installAppBtn','installAppStatus','nowMode','nowTaskTitle','nowTaskMeta','nowCompleteBtn','nowSnoozeBtn','nowMoreBtn','undoBar','undoText','undoBtn','toast'
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
    recurrence: ['none','daily','weekly','monthly'].includes(task.recurrence) ? task.recurrence : 'none',
    snoozeCount: Number(task.snoozeCount || 0),
    postponeAlertedAtCount: Number(task.postponeAlertedAtCount || 0),
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completedAt || null,
    archivedAt: task.archivedAt || null,
    parentId: task.parentId || null,
    googleEventId: task.googleEventId || null,
    kind: task.kind === 'reminder' ? 'reminder' : 'task',
    subtasks: Array.isArray(task.subtasks) ? task.subtasks.map(s => ({ id: s.id || uid(), title: String(s.title || '').trim(), completedAt: s.completedAt || null })).filter(s => s.title) : []
  };
}
function createTask(data) {
  return normalizeTask({ id: uid(), createdAt: new Date().toISOString(), completedAt: null, archivedAt: null, snoozeCount: 0, postponeAlertedAtCount: 0, subtasks: [], ...data });
}
function saveAll() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  localStorage.setItem(EXTERNAL_EVENTS_KEY, JSON.stringify(state.externalEvents));
  localStorage.setItem(UI_KEY, JSON.stringify(state.ui));
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
function activeTasks() { return state.tasks.filter(t => !t.completedAt && !t.archivedAt); }
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
function getDayCapacity(date) { return Math.max(60, Number(state.settings.dailyCapacity||450)-getBusyMinutes(date)); }
function getDayLoad(date, extraMinutes=0, excludeTaskId=null) {
  const planned = tasksOn(date).filter(t=>t.id!==excludeTaskId).reduce((sum,t)=>sum+Number(t.duration||0),0)+extraMinutes;
  const capacity = getDayCapacity(date);
  return { planned, capacity, percent: Math.round((planned/capacity)*100), busy: getBusyMinutes(date) };
}
function loadStatus(percent) {
  if (percent <= 35) return {label:'Día ligero',short:'Ligero',emoji:'😌',level:'light'};
  if (percent <= 70) return {label:'Equilibrado',short:'Equilibrado',emoji:'🙂',level:'balanced'};
  if (percent <= 100) return {label:'Cargado',short:'Cargado',emoji:'😅',level:'busy'};
  return {label:'Sobrecargado',short:'Sobrecargado',emoji:'🫠',level:'over'};
}

function taskScore(task) {
  let score = {high:42,medium:22,low:7}[task.priority];
  if (task.kind === 'reminder') score += 8;
  if (task.deadline) {
    const days = dayDistance(task.deadline);
    if (days < 0) score += 120 + Math.min(30,Math.abs(days)*5);
    else if (days === 0) score += 75;
    else if (days === 1) score += 42;
    else if (days <= 7) score += Math.max(8,30-days*3);
  }
  if (task.scheduledDate) {
    const days = dayDistance(task.scheduledDate);
    if (days < 0) score += 48;
    else if (days === 0) score += 58;
    else if (days === 1) score += 19;
  }
  if (task.scheduledDate === todayISO() && task.scheduledTime) {
    const now = new Date().getHours()*60+new Date().getMinutes();
    const diff = parseTimeMinutes(task.scheduledTime)-now;
    if (diff >= -30 && diff <= 120) score += 24;
  }
  score += Math.min(40,task.snoozeCount*8);
  if (task.duration <= 30) score += 6;
  if (task.recurrence !== 'none') score += 2;
  return score;
}
function getTopCandidates() { return activeTasks().slice().sort((a,b)=>taskScore(b)-taskScore(a)||(a.deadline||'9999').localeCompare(b.deadline||'9999')); }
function ensureDailyFocus() {
  const today = todayISO();
  if (state.ui.focus.date !== today) state.ui.focus = { date: today, ids: getTopCandidates().slice(0,3).map(t=>t.id) };
  state.ui.focus.ids = state.ui.focus.ids.filter(id => state.tasks.some(t=>t.id===id && !t.archivedAt));
  const currentSet = new Set(state.ui.focus.ids);
  for (const task of getTopCandidates()) {
    if (state.ui.focus.ids.length >= 3) break;
    if (!currentSet.has(task.id)) { state.ui.focus.ids.push(task.id); currentSet.add(task.id); }
  }
  saveUI();
}
function getFocusTasks() { ensureDailyFocus(); return state.ui.focus.ids.map(id=>state.tasks.find(t=>t.id===id)).filter(Boolean); }
function considerTaskForFocus(task) {
  if(!task||task.archivedAt||task.completedAt)return;
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
  for (let i=0;i<21;i++) { const date=addDays(startDate,i); if (getDayLoad(date,task.duration,task.id).percent<=80) return date; }
  return addDays(startDate,21);
}
function movableScore(task,date=todayISO()) {
  let score=0;
  if (task.priority==='high') score+=60; else if(task.priority==='medium') score+=25;
  if (task.deadline===date || (task.deadline && task.deadline<date)) score+=100;
  if (task.deadline===addDays(date,1)) score+=45;
  score+=task.snoozeCount*7;
  return score;
}
function getMoveSuggestions(date=todayISO(),targetPercent=85) {
  const current=getDayLoad(date); if(current.percent<=100) return [];
  const candidates=tasksOn(date).filter(t=>!(t.deadline && t.deadline<=date)).slice().sort((a,b)=>movableScore(a,date)-movableScore(b,date));
  const selected=[]; let remaining=current.planned;
  for(const task of candidates){
    if(Math.round((remaining/current.capacity)*100)<=targetPercent) break;
    selected.push({task,targetDate:findNextGap(task,addDays(date,1))}); remaining-=task.duration;
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
  const load=getDayLoad(date), remaining=Math.max(0,load.capacity-load.planned);
  if(remaining<15) return [];
  return getFreeGaps(date).map(g=>({...g,duration:Math.min(g.duration,remaining)})).filter(g=>g.duration>=15);
}
function getAgendaItems(date) {
  const tasks=state.tasks.filter(t=>!t.archivedAt && t.scheduledDate===date && t.scheduledTime).map(t=>({id:t.id,type:'task',title:t.title,category:t.category,time:t.scheduledTime,minutes:parseTimeMinutes(t.scheduledTime),completed:Boolean(t.completedAt),kind:t.kind}));
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
  let candidates=getFocusTasks().filter(t=>!t.completedAt&&!t.archivedAt);
  if(!candidates.length) candidates=getTopCandidates().slice(0,6);
  const firstGap=getUsableGaps(todayISO())[0];
  return candidates.slice().sort((a,b)=>{
    const adjusted=t=>taskScore(t)+(firstGap&&t.duration<=firstGap.duration?13:0)+(state.lowEnergyMode?(t.energy==='low'?30:t.energy==='normal'&&t.duration<=25?15:-20):0);
    return adjusted(b)-adjusted(a);
  })[0] || null;
}
function getRecommendation() {
  const today=getDayLoad(todayISO());
  if(today.percent>100) return {type:'space',className:'danger',text:'😅 Vas justo hoy',action:'Hazme hueco'};
  const important=getImportantTasks(),overdue=important.filter(isOverdueDeadline);
  if(overdue.length) return {type:'overdue',className:'warning',text:`⏰ ${overdue.length} ${overdue.length===1?'tarea vencida':'tareas vencidas'}`,action:'Revisar'};
  const focusIds=new Set(state.ui.focus.ids||[]),dueToday=important.filter(t=>t.deadline===todayISO()&&!focusIds.has(t.id));
  if(dueToday.length) return {type:'overdue',className:'warning',text:`⏰ ${dueToday.length} ${dueToday.length===1?'tarea vence hoy':'tareas vencen hoy'}`,action:'Revisar'};
  const tomorrow=getDayLoad(addDays(todayISO(),1));
  if(tomorrow.percent>110) return {type:'tomorrow',className:'warning',text:`😅 Mañana viene al ${tomorrow.percent}%`,action:'Revisar'};
  return null;
}

function render() {
  renderHeader(); renderRoute(); renderHome(); renderCategory(); renderCalendar(); renderContextIsland(); updateInstallStatus();
  requestAnimationFrame(()=>setupRenderedState());
}
function renderHeader() {
  const now=new Date();
  els.currentDate.textContent=new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(now);
  const hour=now.getHours(); const part=hour<13?'Buenos días':hour<20?'Buenas tardes':'Buenas noches';
  els.greeting.textContent=`${part}, ${state.settings.name||'Angel'} 👋`;
}
function renderRoute() {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===state.route));
  if(state.route==='home'){els.homeView.classList.add('active');els.pageTitle.textContent='Inicio';}
  else if(state.route==='calendar'){els.calendarView.classList.add('active');els.pageTitle.textContent='Calendario';}
  else {els.tasksView.classList.add('active');els.pageTitle.textContent=CATEGORY_SHORT[state.route];}
}
function renderHome() {
  ensureDailyFocus();
  const load=getDayLoad(todayISO()), status=loadStatus(load.percent), focus=getFocusTasks(), done=focus.filter(t=>t.completedAt).length;
  els.homeCard.dataset.loadLevel=status.level;
  els.loadEmoji.textContent=status.emoji;
  els.loadStatus.textContent=status.short;
  els.capacityContext.textContent=load.busy?`${formatMinutes(load.planned)} · ${formatMinutes(load.busy)} agenda`:formatMinutes(load.planned);
  els.loadBar.style.width=`${Math.min(100,load.percent)}%`;
  animateLoadPercent(load.percent);
  const hour=new Date().getHours();
  if(hour<12) { els.adaptiveLine.textContent='Tus 3 para arrancar.'; els.focusHeadingText.textContent='Lo imprescindible'; }
  else if(hour<18) { els.adaptiveLine.textContent=focus.length?`${done} de ${focus.length} hechas.`:'Día despejado.'; els.focusHeadingText.textContent=done?'Sigue con lo esencial':'Lo imprescindible'; }
  else { els.adaptiveLine.textContent=done===focus.length&&focus.length?'Tus 3, hechos.':'Cierra el día sin arrastrarlo todo.'; els.focusHeadingText.textContent='Antes de cerrar'; }
  els.focusProgress.innerHTML=focus.map(t=>`<i class="progress-dot ${t.completedAt?'done':''}"></i>`).join('');
  els.topThreeList.innerHTML=focus.length?focus.map((task,index)=>renderFocusItem(task,index)).join(''):'<div class="focus-empty">Nada urgente. Mantén el día ligero.</div>';
  els.startNextBtn.disabled=!getNextBestAction(); els.startNextBtn.style.opacity=els.startNextBtn.disabled?'.45':'1';
  els.lowEnergyBtn.classList.toggle('active',state.lowEnergyMode);
  const rec=getRecommendation();
  if(rec){els.smartRecommendation.hidden=false;els.smartRecommendation.className=`smart-recommendation ${rec.className}`;els.smartRecommendation.dataset.recommendation=rec.type;els.smartRecommendation.innerHTML=`<span>${rec.text}</span><strong>${rec.action} →</strong>`;} else els.smartRecommendation.hidden=true;
  els.miniAgendaText.textContent=getMiniAgendaText();
  renderGapChips();
  els.gestureHint.hidden=state.ui.gestureUses>=3 || !focus.some(t=>!t.completedAt);
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
  let tasks=state.tasks.filter(t=>t.category===state.route&&!t.archivedAt);
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
  return `<article class="task-item swipe-row ${done?'is-done':''}" data-task-id="${task.id}">
    ${done?'':swipeUnder(task.id)}
    <div class="swipe-content" data-open-task="${task.id}">
      <button class="task-check" data-action="complete" data-id="${task.id}" aria-label="${done?'Completada':'Completar'}">${ICON('check')}</button>
      <div class="task-main"><div class="task-title-line">${task.priority==='high'?'<i class="priority-mark" title="Prioridad alta"></i>':''}<h3 class="task-title">${escapeHTML(task.title)}</h3></div><div class="exception-row">${badges.join('')}</div></div>
      <div class="task-title-line"><span class="task-duration">${formatMinutes(task.duration)}</span><button class="row-more" data-open-task="${task.id}" aria-label="Acciones">${ICON('more')}</button></div>
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
    cells.push(`<div class="calendar-day ${inMonth?'':'outside'} ${iso===todayISO()?'today':''} ${iso===state.calendarSelectedDate?'selected':''}" data-calendar-date="${iso}"><button class="day-number" data-calendar-date="${iso}">${date.getDate()}</button><div class="calendar-events">${items.slice(0,3).map(i=>`<button class="calendar-event ${i.category}" ${i.type==='task'?`data-open-task="${i.id}"`:''} title="${escapeHTML(i.title)}">${escapeHTML(i.title)}</button>`).join('')}${items.length>3?`<span class="more-events">+${items.length-3}</span>`:''}</div></div>`);
  }
  els.calendarGrid.innerHTML=cells.join('');
  renderCalendarWeekStrip(); renderDayAgenda();
}
function getCalendarItems(date) {
  return [
    ...state.tasks.filter(t=>!t.archivedAt&&!t.completedAt&&t.scheduledDate===date).map(t=>({type:'task',id:t.id,title:t.title,category:t.category,time:t.scheduledTime||''})),
    ...state.externalEvents.filter(e=>e.date===date).map(e=>({type:'external',id:e.id,title:e.title,category:'external',time:externalStartMinutes(e)===null?'':minutesToTime(externalStartMinutes(e))}))
  ].sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
}
function renderCalendarWeekStrip() {
  const selected=parseISODate(state.calendarSelectedDate);const monday=new Date(selected);monday.setDate(selected.getDate()-((selected.getDay()+6)%7));
  const days=[];
  for(let i=0;i<7;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);const iso=toISO(d),has=getCalendarItems(iso).length>0;days.push(`<button class="week-day ${iso===todayISO()?'today':''} ${iso===state.calendarSelectedDate?'selected':''} ${has?'has-items':''}" data-calendar-date="${iso}"><span>${new Intl.DateTimeFormat('es-ES',{weekday:'short'}).format(d).replace('.','')}</span><strong>${d.getDate()}</strong></button>`);}
  els.calendarWeekStrip.innerHTML=days.join('');
}
function renderDayAgenda() {
  const date=state.calendarSelectedDate, items=getAgendaItems(date), untimed=state.tasks.filter(t=>!t.archivedAt&&!t.completedAt&&t.scheduledDate===date&&!t.scheduledTime).map(t=>({id:t.id,type:'task',title:t.title,category:t.category,time:'—',minutes:9998}));
  const all=[...items,...untimed].sort((a,b)=>a.minutes-b.minutes);
  els.dayAgendaTitle.textContent=date===todayISO()?'Hoy':formatDate(date,true);
  const load=getDayLoad(date);els.dayAgendaLoad.textContent=`${load.percent}% · ${formatMinutes(load.planned)}`;
  els.dayAgendaList.innerHTML=all.length?all.map(i=>`<div class="agenda-item" ${i.type==='task'?`data-open-task="${i.id}"`:''}><span class="agenda-time">${i.time}</span><i class="agenda-color ${i.category}"></i><span class="agenda-title">${escapeHTML(i.title)}</span></div>`).join(''):'<div class="agenda-empty">Nada agendado para este día.</div>';
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
  els.contextIsland.dataset.islandAction=action;els.contextIsland.innerHTML=`${ICON(icon)}<span>${label}</span>`;
}
function setupRenderedState() {
  if(state.route==='home'&&!reduceMotion()) document.querySelectorAll('.focus-row').forEach(row=>row.classList.add('focus-enter'));
}

function openSheet(el) { if(!el.open) el.showModal(); }
function closeSheet(el) { if(el?.open) el.close(); }
function closeActionSheet(){ closeSheet(els.actionSheet); }
function resetTaskForm() {
  els.taskForm.reset();els.taskEditId.value='';els.taskScheduledDate.value=todayISO();els.taskCategory.value=['work','personal','study'].includes(state.route)?state.route:'work';els.taskDuration.value='30';els.taskScheduledTime.value='';els.taskDeadline.value='';els.taskRecurrence.value='none';setChoice('priority','medium');setChoice('energy','normal');updateCapacityPreview();
}
function openTaskSheet(prefill={}) {
  resetTaskForm();
  const task=prefill.editId?state.tasks.find(t=>t.id===prefill.editId):null;
  if(task){
    els.taskEditId.value=task.id;els.taskTitle.value=task.title;els.taskCategory.value=task.category;ensureSelectOption(els.taskDuration,task.duration);els.taskDuration.value=String(task.duration);els.taskScheduledDate.value=task.scheduledDate;els.taskScheduledTime.value=task.scheduledTime;els.taskDeadline.value=task.deadline;els.taskRecurrence.value=task.recurrence;setChoice('priority',task.priority);setChoice('energy',task.energy);els.taskSheetKicker.textContent='Editar tarea';els.taskSheetTitle.textContent='Solo lo necesario';
  } else { if(prefill.category)els.taskCategory.value=prefill.category;if(prefill.date)els.taskScheduledDate.value=prefill.date;els.taskSheetKicker.textContent='Nueva tarea';els.taskSheetTitle.textContent='Añadir sin ruido'; }
  updateCapacityPreview();openSheet(els.taskSheet);setTimeout(()=>els.taskTitle.focus(),80);
}
function setChoice(group,value) {
  const hidden=group==='priority'?els.taskPriority:els.taskEnergy;hidden.value=value;
  document.querySelectorAll(`[data-choice-group="${group}"] button`).forEach(b=>b.classList.toggle('selected',b.dataset.value===value));
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
function actionOption({icon,title,sub='',end='',attrs=''}){return `<button class="action-option" ${attrs}><span class="action-icon">${ICON(icon)}</span><span><strong>${escapeHTML(title)}</strong>${sub?`<small>${escapeHTML(sub)}</small>`:''}</span>${end?`<span class="action-end">${escapeHTML(end)}</span>`:'<span></span>'}</button>`;}
function showActionSheet(html){els.actionSheetContent.innerHTML=html;openSheet(els.actionSheet);}
function openTaskActions(id) {
  const task=state.tasks.find(t=>t.id===id);if(!task)return;
  const sub=getSubtaskProgress(task);
  const timing=[];
  if(task.scheduledDate) timing.push(`${formatDate(task.scheduledDate,true)}${task.scheduledTime?` ${task.scheduledTime}`:''}`);
  if(task.deadline) timing.push(`límite ${formatDate(task.deadline,true)}`);
  const detector=task.snoozeCount>=4?`<button class="smart-recommendation warning" data-postpone-help="${task.id}"><span>↪ Aplazada ${task.snoozeCount} veces</span><strong>Revisar →</strong></button>`:'';
  const subtaskBlock=sub.total?`<div class="action-summary"><strong>${sub.done}/${sub.total} pasos</strong><div class="subtask-list">${task.subtasks.map(s=>`<label class="toggle-row"><div><strong>${escapeHTML(s.title)}</strong></div><input type="checkbox" data-subtask-toggle="${s.id}" data-task-id="${task.id}" ${s.completedAt?'checked':''}></label>`).join('')}</div></div>`:'';
  showActionSheet(`${sheetHeader('Tarea',task.title)}<p class="action-meta">${CATEGORY_SHORT[task.category]} · ${PRIORITY_LABELS[task.priority]} · ${formatMinutes(task.duration)} · energía ${ENERGY_LABELS[task.energy].toLowerCase()}${timing.length?` · ${timing.join(' · ')}`:''}</p>${detector}${subtaskBlock}<div class="action-list">
    ${task.completedAt?'':actionOption({icon:'check',title:'Completar',sub:'Quitarla de pendientes.',attrs:`data-action="complete" data-id="${task.id}"`})}
    ${actionOption({icon:'edit',title:'Editar',sub:'Cambiar solo lo que necesites.',attrs:`data-action="edit" data-id="${task.id}"`})}
    ${task.completedAt?'':actionOption({icon:'snooze',title:'Aplazar',sub:'Mañana, próximo hueco o fecha.',attrs:`data-action="snooze" data-id="${task.id}"`})}
    ${actionOption({icon:'split',title:'Dividir tarea',sub:'Crear entre 2 y 4 pasos.',attrs:`data-action="split" data-id="${task.id}"`})}
    ${actionOption({icon:'bolt',title:'Prioridad y energía',sub:'Ajustes rápidos.',attrs:`data-action="traits" data-id="${task.id}"`})}
    ${actionOption({icon:'move',title:'Mover de área',sub:'Trabajo, personal o estudios.',attrs:`data-action="move" data-id="${task.id}"`})}
    ${actionOption({icon:'archive',title:'Archivar',sub:'Sacarla sin marcarla como hecha.',attrs:`data-action="archive" data-id="${task.id}"`})}
  </div>`);
}
function openSnooze(id) {
  const task=state.tasks.find(t=>t.id===id);if(!task)return;const gap=findNextGap(task);
  showActionSheet(`${sheetHeader('Aplazar',task.title)}<div class="action-list">
    ${actionOption({icon:'snooze',title:'Mañana',sub:formatDate(addDays(todayISO(),1),true),attrs:`data-snooze-choice="tomorrow" data-id="${id}"`})}
    ${actionOption({icon:'spark',title:'Próximo hueco',sub:`${formatDate(gap,true)} · con margen`,attrs:`data-snooze-choice="gap" data-id="${id}"`})}
    ${actionOption({icon:'calendar',title:'Elegir fecha',sub:'Decidirlo manualmente.',attrs:`data-snooze-choice="date" data-id="${id}"`})}
  </div>`);
}
function showDatePickerForSnooze(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;showActionSheet(`${sheetHeader('Elegir fecha','¿Cuándo encaja mejor?')}<label class="field"><span>Nueva fecha planificada</span><input id="customSnoozeDate" type="date" value="${task.scheduledDate||addDays(todayISO(),1)}" min="${todayISO()}" /></label><div class="sheet-actions"><button class="ghost-btn" data-close-action>Cancelar</button><button class="primary-btn" data-confirm-custom-snooze="${id}">Mover</button></div>`);}
function openTraits(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;showActionSheet(`${sheetHeader('Ajustes rápidos',task.title)}<span class="choice-title">Prioridad</span><div class="choice-row traits-row">${['low','medium','high'].map(v=>`<button class="${task.priority===v?'selected':''}" data-set-priority="${v}" data-id="${id}">${v==='low'?'Baja':v==='medium'?'Media':'● Alta'}</button>`).join('')}</div><span class="choice-title" style="margin-top:14px">Energía</span><div class="choice-row traits-row">${['low','normal','high'].map(v=>`<button class="${task.energy===v?'selected':''}" data-set-energy="${v}" data-id="${id}">${v==='low'?'○ Baja':v==='normal'?'◐ Normal':'● Alta'}</button>`).join('')}</div>`);}
function openMove(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;showActionSheet(`${sheetHeader('Mover de área',task.title)}<div class="action-list">${actionOption({icon:'briefcase',title:'Trabajo',attrs:`data-move-category="work" data-id="${id}"`})}${actionOption({icon:'heart-home',title:'Vida personal / vivienda',attrs:`data-move-category="personal" data-id="${id}"`})}${actionOption({icon:'book',title:'Estudios',attrs:`data-move-category="study" data-id="${id}"`})}</div>`);}
function openSplit(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;showActionSheet(`${sheetHeader('Dividir tarea',task.title)}<p class="action-meta">Entre 2 y 4 pasos. La duración total de la tarea no cambia.</p><div class="split-inputs"><input class="split-part" placeholder="Paso 1"><input class="split-part" placeholder="Paso 2"><input class="split-part" placeholder="Paso 3 (opcional)"><input class="split-part" placeholder="Paso 4 (opcional)"></div><div class="sheet-actions"><button class="ghost-btn" data-close-action>Cancelar</button><button class="primary-btn" data-confirm-split="${id}">Crear pasos</button></div>`);}
function openPostponeHelp(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;showActionSheet(`${sheetHeader('Una señal útil',`Aplazada ${task.snoozeCount} veces`)}<p class="action-meta">En vez de seguir empujándola, quizá convenga cambiar cómo está planteada.</p><div class="action-list">${actionOption({icon:'split',title:'Dividirla',sub:'Convertirla en pasos pequeños.',attrs:`data-action="split" data-id="${id}"`})}${actionOption({icon:'arrow-right',title:'Bajar prioridad',sub:'Dejar de tratarla como urgente.',attrs:`data-lower-priority="${id}"`})}${actionOption({icon:'calendar',title:'Programarla de verdad',sub:'Elegir una fecha concreta.',attrs:`data-snooze-choice="date" data-id="${id}"`})}${actionOption({icon:'archive',title:'Descartarla / archivar',attrs:`data-action="archive" data-id="${id}"`})}</div>`);}
function openMakeSpace(date=todayISO()) {
  const suggestions=getMoveSuggestions(date),current=getDayLoad(date);if(!suggestions.length){
    if(current.percent>100) showActionSheet(`${sheetHeader('Hazme hueco','No movería nada automáticamente')}<div class="action-summary">El día está al <strong>${current.percent}%</strong>, pero lo que queda tiene fecha límite o demasiada prioridad para moverlo sin preguntarte. Mejor revisarlo manualmente.</div><div class="sheet-actions"><button class="ghost-btn" data-close-action>Ahora no</button><button class="primary-btn" data-review-date="${date}">Revisar día</button></div>`);
    else toast('No hace falta liberar espacio ahora mismo.');
    return;
  }
  const moved=suggestions.reduce((s,x)=>s+x.task.duration,0),after=Math.round(((current.planned-moved)/current.capacity)*100);state.pendingSpaceSuggestions=suggestions.map(s=>({id:s.task.id,date:s.targetDate}));
  showActionSheet(`${sheetHeader('Hazme hueco','Más aire, sin tocar fechas límite')}<div class="space-visual"><div class="space-load"><span>Hoy</span><strong>${current.percent}%</strong></div><span class="space-arrow">${ICON('arrow-right')}</span><div class="space-load"><span>Después</span><strong>${after}%</strong></div></div>${suggestions.map(({task,targetDate})=>`<div class="space-card"><div><strong>${escapeHTML(task.title)}</strong><span>${formatMinutes(task.duration)} · ${CATEGORY_SHORT[task.category]}</span></div><em>→ ${formatDate(targetDate)}</em></div>`).join('')}<div class="sheet-actions"><button class="ghost-btn" data-close-action>No mover</button><button class="primary-btn" data-confirm-space>Aceptar</button></div>`);
}
function openDayClose(){const done=completedToday().length,pending=tasksOn(todayISO()),tomorrow=getDayLoad(addDays(todayISO(),1));showActionSheet(`${sheetHeader('Cierre del día','30 segundos y listo')}<div class="action-summary">✓ ${done} completadas · ${pending.length} pendientes · mañana ${tomorrow.percent}%</div><div class="action-list">${actionOption({icon:'arrow-right',title:'Pasar a mañana',attrs:'data-day-close="tomorrow"'})}${actionOption({icon:'spark',title:'Buscar hueco',sub:'Repartir con margen.',attrs:'data-day-close="gaps"'})}${actionOption({icon:'archive',title:'Archivar',attrs:'data-day-close="archive"'})}</div>`);}
function openTomorrowReview(){state.lowEnergyMode=false;const date=addDays(todayISO(),1);state.calendarSelectedDate=date;state.calendarCursor=startOfMonth(parseISODate(date));state.route='calendar';closeActionSheet();render();}
function openOverdueReview(){state.quickMode='overdue';const tasks=getImportantTasks();els.smartResultsTitle.textContent='Lo que conviene resolver primero';renderSmartList(tasks);els.smartResults.hidden=false;setTimeout(()=>els.smartResults.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'nearest'}),0);}

function pushUndo(label,snapshot){clearTimeout(state.undo?.timer);state.undo={snapshot,label,timer:setTimeout(()=>{state.undo=null;els.undoBar.hidden=true;},5200)};els.undoText.textContent=label;els.undoBar.hidden=false;}
function mutateWithUndo(label,mutator,{haptic=true}={}){const snapshot=deepClone(state.tasks);mutator();saveAll();render();pushUndo(label,snapshot);if(haptic)buzz(9);maybeCelebrateFocus();}
function animatedMutation(id,type,label,mutator){const rows=[...document.querySelectorAll(`[data-task-id="${CSS.escape(id)}"]`)];rows.forEach(r=>r.classList.add(type));const delay=reduceMotion()?0:165;setTimeout(()=>mutateWithUndo(label,mutator),delay);}
function undoLast(){if(!state.undo)return;clearTimeout(state.undo.timer);state.tasks=state.undo.snapshot.map(normalizeTask);state.undo=null;els.undoBar.hidden=true;saveAll();render();toast('Acción deshecha.');}
function buzz(ms=8){if(state.settings.haptics&&navigator.vibrate)navigator.vibrate(ms);}
function recordGestureUse(){state.ui.gestureUses=Math.min(3,Number(state.ui.gestureUses||0)+1);saveUI();}

function completeTask(id){const task=state.tasks.find(t=>t.id===id);if(!task||task.completedAt)return;animatedMutation(id,'completing','Tarea completada',()=>{task.completedAt=new Date().toISOString();advanceRecurrence(task);});}
function advanceRecurrence(task){if(task.recurrence==='none')return;const base=task.scheduledDate||todayISO(),next=task.recurrence==='daily'?addDays(base,1):task.recurrence==='weekly'?addDays(base,7):addMonths(base,1);let deadline='';if(task.deadline&&task.scheduledDate){const delta=Math.round((parseISODate(task.deadline)-parseISODate(task.scheduledDate))/86400000);deadline=addDays(next,delta);}state.tasks.push(createTask({...task,id:uid(),scheduledDate:next,deadline,completedAt:null,archivedAt:null,googleEventId:null,snoozeCount:0,postponeAlertedAtCount:0,subtasks:(task.subtasks||[]).map(s=>({id:uid(),title:s.title,completedAt:null}))}));}
function applySnooze(id,date){const task=state.tasks.find(t=>t.id===id);if(!task)return;closeActionSheet();animatedMutation(id,'snoozing',`→ ${weekdayName(date)} · ${formatDate(date)}`,()=>{task.scheduledDate=date;task.snoozeCount+=1;});}
function archiveTask(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;closeActionSheet();animatedMutation(id,'archiving','Tarea archivada',()=>{task.archivedAt=new Date().toISOString();});}
function confirmSplit(id){const task=state.tasks.find(t=>t.id===id);if(!task)return;const parts=[...els.actionSheetContent.querySelectorAll('.split-part')].map(i=>i.value.trim()).filter(Boolean);if(parts.length<2){toast('Escribe al menos dos pasos.');return;}mutateWithUndo('Tarea dividida',()=>{task.subtasks=parts.slice(0,4).map(title=>({id:uid(),title,completedAt:null}));});closeActionSheet();}
function confirmMakeSpace(){const moves=[...state.pendingSpaceSuggestions];if(!moves.length)return;mutateWithUndo('Día reorganizado',()=>moves.forEach(m=>{const t=state.tasks.find(x=>x.id===m.id);if(t){t.scheduledDate=m.date;t.snoozeCount+=1;}}));state.pendingSpaceSuggestions=[];closeActionSheet();}
function applyDayClose(action){const pending=tasksOn(todayISO());mutateWithUndo('Cierre del día aplicado',()=>pending.forEach(task=>{if(action==='tomorrow'){task.scheduledDate=addDays(todayISO(),1);task.snoozeCount+=1;}if(action==='gaps'){task.scheduledDate=findNextGap(task);task.snoozeCount+=1;}if(action==='archive')task.archivedAt=new Date().toISOString();}));closeActionSheet();}
function maybeCelebrateFocus(){const focus=getFocusTasks();if(focus.length===3&&focus.every(t=>t.completedAt)&&state.ui.celebratedDate!==todayISO()){state.ui.celebratedDate=todayISO();saveUI();setTimeout(()=>{els.focusProgress.classList.add('celebrate');buzz(18);toast('Tus 3, hechos ✓');setTimeout(()=>els.focusProgress.classList.remove('celebrate'),650);},190);}}

function showQuickTime(minutes){state.quickMode=`time-${minutes}`;const tasks=activeTasks().filter(t=>t.duration<=minutes).sort((a,b)=>taskScore(b)-taskScore(a)).slice(0,8);els.smartResultsTitle.textContent=`Lo mejor para ${minutes>=60?formatMinutes(minutes):`${minutes} min`}`;renderSmartList(tasks);els.smartResults.hidden=false;setTimeout(()=>els.smartResults.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'nearest'}),0);}
function toggleLowEnergy(){state.lowEnergyMode=!state.lowEnergyMode;renderHome();renderContextIsland();if(state.lowEnergyMode){state.quickMode='low-energy';const tasks=activeTasks().filter(t=>t.energy==='low'||(t.energy==='normal'&&t.duration<=25)).sort((a,b)=>taskScore(b)-taskScore(a)).slice(0,8);els.smartResultsTitle.textContent='Poco esfuerzo, buen avance';renderSmartList(tasks);els.smartResults.hidden=false;}else{els.smartResults.hidden=true;state.quickMode=null;}}
function closeSmartResults(){state.quickMode=null;els.smartResults.hidden=true;}
function openNowMode(taskId=null){const task=taskId?state.tasks.find(t=>t.id===taskId):getNextBestAction();if(!task||task.completedAt||task.archivedAt){toast('No hay una siguiente tarea clara ahora mismo.');return;}state.nowTaskId=task.id;els.nowTaskTitle.textContent=task.title;els.nowTaskMeta.textContent=`${formatMinutes(task.duration)} · ${CATEGORY_SHORT[task.category]}`;openSheet(els.nowMode);}
function closeNowMode(){closeSheet(els.nowMode);state.nowTaskId=null;}

function parseNaturalTask(input){
  const original=String(input||'').trim();if(!original)return{};let remaining=original;const result={};const lower=()=>remaining.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(/\bmanana\b/.test(lower())){result.scheduledDate=addDays(todayISO(),1);remaining=remaining.replace(/\bmañana\b/ig,'');}else if(/\bhoy\b/.test(lower())){result.scheduledDate=todayISO();remaining=remaining.replace(/\bhoy\b/ig,'');}
  const dateMatch=lower().match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);if(dateMatch){let year=Number(dateMatch[3]||new Date().getFullYear());if(year<100)year+=2000;const d=new Date(year,Number(dateMatch[2])-1,Number(dateMatch[1]));if(!Number.isNaN(d.getTime()))result.scheduledDate=toISO(d);remaining=remaining.replace(dateMatch[0],'');}
  const timeMatch=lower().match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);if(timeMatch){result.scheduledTime=`${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}`;remaining=remaining.replace(timeMatch[0],'');}
  const dur=lower().match(/\b(?:(\d+)\s*h(?:oras?)?)\s*(?:(\d+)\s*m(?:in(?:utos?)?)?)?\b|\b(\d+)\s*m(?:in(?:utos?)?)?\b/);if(dur){const n=Number(dur[1]||0)*60+Number(dur[2]||dur[3]||0);if(n)result.duration=n;remaining=remaining.replace(dur[0],'');}
  for(const [category,pattern] of [['work',/\b(trabajo|laboral)\b/i],['personal',/\b(personal|casa|vivienda|hogar)\b/i],['study',/\b(estudio|estudios)\b/i]]){if(pattern.test(remaining)){result.category=category;remaining=remaining.replace(pattern,'');break;}}
  const energy=remaining.match(/\benerg[ií]a\s+(baja|normal|alta)\b/i);if(energy){result.energy=({baja:'low',normal:'normal',alta:'high'})[energy[1].toLowerCase()];remaining=remaining.replace(energy[0],'');}
  const priority=remaining.match(/\b(prioridad\s+)?(alta|media|baja)\b/i);if(priority){result.priority=({alta:'high',media:'medium',baja:'low'})[priority[2].toLowerCase()];remaining=remaining.replace(priority[0],'');}
  for(const [recurrence,pattern] of [['daily',/\b(cada d[ií]a|diaria|diario)\b/i],['weekly',/\b(cada semana|semanal)\b/i],['monthly',/\b(cada mes|mensual)\b/i]]){if(pattern.test(remaining)){result.recurrence=recurrence;remaining=remaining.replace(pattern,'');break;}}
  result.title=remaining.replace(/\s{2,}/g,' ').replace(/\s+([,.;])/g,'$1').trim().replace(/^[-,.;\s]+|[-,.;\s]+$/g,'');return result;
}

function openSettings(){els.settingsName.value=state.settings.name;els.settingsCapacity.value=String(state.settings.dailyCapacity);els.settingsHaptics.checked=Boolean(state.settings.haptics);updateInstallStatus();openSheet(els.settingsSheet);}
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

/* Gestos: pequeño deslizamiento revela, deslizamiento largo ejecuta; mantener abre acciones. */
let gesture=null;
function resetRevealed(except=null){document.querySelectorAll('.swipe-row.reveal-complete,.swipe-row.reveal-snooze').forEach(row=>{if(row!==except){row.classList.remove('reveal-complete','reveal-snooze');row.querySelector('.swipe-content')?.style.removeProperty('transform');}});}
document.addEventListener('pointerdown',event=>{
  const row=event.target.closest('.swipe-row');
  if(!row||row.classList.contains('is-done')||event.target.closest('button,input,select')){if(!row)resetRevealed();return;}
  resetRevealed(row);const id=row.dataset.taskId,startX=event.clientX,startY=event.clientY;
  gesture={row,id,startX,startY,dx:0,dy:0,moved:false,long:false,timer:setTimeout(()=>{if(!gesture||gesture.moved)return;gesture.long=true;state.suppressNextClick=true;buzz(7);openTaskActions(id);},480)};
  row.classList.add('swiping');
});
document.addEventListener('pointermove',event=>{
  if(!gesture)return;gesture.dx=event.clientX-gesture.startX;gesture.dy=event.clientY-gesture.startY;
  if(Math.abs(gesture.dx)>8||Math.abs(gesture.dy)>8){gesture.moved=true;clearTimeout(gesture.timer);}
  if(Math.abs(gesture.dx)>Math.abs(gesture.dy)&&Math.abs(gesture.dx)>6){const x=Math.max(-130,Math.min(130,gesture.dx));gesture.row.querySelector('.swipe-content').style.transform=`translateX(${x}px)`;gesture.row.classList.toggle('show-complete',x>0);gesture.row.classList.toggle('show-snooze',x<0);}
});
document.addEventListener('pointerup',()=>{
  if(!gesture)return;clearTimeout(gesture.timer);const {row,id,dx,dy,long}=gesture;row.classList.remove('swiping','show-complete','show-snooze');const content=row.querySelector('.swipe-content');
  if(long){content?.style.removeProperty('transform');gesture=null;setTimeout(()=>{state.suppressNextClick=false;},120);return;}
  if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>=42){recordGestureUse();state.suppressNextClick=true;if(dx>=110){content?.style.removeProperty('transform');completeTask(id);}else if(dx<=-110){content?.style.removeProperty('transform');openSnooze(id);}else if(dx>0){content?.style.removeProperty('transform');row.classList.add('reveal-complete');}else{content?.style.removeProperty('transform');row.classList.add('reveal-snooze');}}
  else content?.style.removeProperty('transform');
  gesture=null;setTimeout(()=>{state.suppressNextClick=false;},120);
});
document.addEventListener('pointercancel',()=>{if(!gesture)return;clearTimeout(gesture.timer);gesture.row.classList.remove('swiping','show-complete','show-snooze');gesture.row.querySelector('.swipe-content')?.style.removeProperty('transform');gesture=null;});

/* FAB: toque = tarea; pulsación larga = tres accesos rápidos. */
let fabTimer=null;
els.fab.addEventListener('pointerdown',()=>{state.fabLongPressed=false;els.fab.classList.add('holding');fabTimer=setTimeout(()=>{state.fabLongPressed=true;els.fabMenu.hidden=false;buzz(8);},430);});
els.fab.addEventListener('pointerup',()=>{clearTimeout(fabTimer);els.fab.classList.remove('holding');if(!state.fabLongPressed)openTaskSheet();setTimeout(()=>state.fabLongPressed=false,50);});
els.fab.addEventListener('pointercancel',()=>{clearTimeout(fabTimer);els.fab.classList.remove('holding');});

/* Eventos de interfaz delegados. */
document.addEventListener('click',event=>{
  if(state.suppressNextClick){event.preventDefault();return;}
  const routeBtn=event.target.closest('[data-route]');if(routeBtn){state.route=routeBtn.dataset.route;state.lowEnergyMode=false;closeSmartResults();resetRevealed();render();return;}
  const close=event.target.closest('[data-close-sheet]');if(close){closeSheet(document.getElementById(close.dataset.closeSheet));return;}
  if(event.target.closest('[data-close-action]')){closeActionSheet();return;}
  if(event.target.closest('[data-close-now]')){closeNowMode();return;}
  const fabAction=event.target.closest('[data-fab-action]');if(fabAction){els.fabMenu.hidden=true;if(fabAction.dataset.fabAction==='task')openTaskSheet();if(fabAction.dataset.fabAction==='quick')openQuickSheet();if(fabAction.dataset.fabAction==='reminder')openReminderSheet();return;}
  if(!event.target.closest('.fab-wrap'))els.fabMenu.hidden=true;
  const action=event.target.closest('[data-action]');if(action){const {action:kind,id}=action.dataset;if(kind==='complete'){closeActionSheet();completeTask(id);}if(kind==='edit'){closeActionSheet();setTimeout(()=>openTaskSheet({editId:id}),80);}if(kind==='snooze')openSnooze(id);if(kind==='split')openSplit(id);if(kind==='traits')openTraits(id);if(kind==='move')openMove(id);if(kind==='archive')archiveTask(id);return;}
  const swipeComplete=event.target.closest('[data-swipe-complete]');if(swipeComplete){resetRevealed();completeTask(swipeComplete.dataset.swipeComplete);return;}
  const swipeSnooze=event.target.closest('[data-swipe-snooze]');if(swipeSnooze){resetRevealed();openSnooze(swipeSnooze.dataset.swipeSnooze);return;}
  const openTask=event.target.closest('[data-open-task]');if(openTask){openTaskActions(openTask.dataset.openTask);return;}
  const calendarDate=event.target.closest('[data-calendar-date]');if(calendarDate){state.calendarSelectedDate=calendarDate.dataset.calendarDate;state.calendarCursor=startOfMonth(parseISODate(state.calendarSelectedDate));renderCalendar();return;}
  const gap=event.target.closest('[data-gap-minutes]');if(gap){showQuickTime(Number(gap.dataset.gapMinutes));return;}
  const snooze=event.target.closest('[data-snooze-choice]');if(snooze){const task=state.tasks.find(t=>t.id===snooze.dataset.id);if(!task)return;if(snooze.dataset.snoozeChoice==='tomorrow')applySnooze(task.id,addDays(todayISO(),1));if(snooze.dataset.snoozeChoice==='gap')applySnooze(task.id,findNextGap(task));if(snooze.dataset.snoozeChoice==='date')showDatePickerForSnooze(task.id);return;}
  const custom=event.target.closest('[data-confirm-custom-snooze]');if(custom){const date=document.getElementById('customSnoozeDate')?.value;if(date)applySnooze(custom.dataset.confirmCustomSnooze,date);return;}
  const split=event.target.closest('[data-confirm-split]');if(split){confirmSplit(split.dataset.confirmSplit);return;}
  if(event.target.closest('[data-confirm-space]')){confirmMakeSpace();return;}
  const priority=event.target.closest('[data-set-priority]');if(priority){const task=state.tasks.find(t=>t.id===priority.dataset.id);if(task){mutateWithUndo('Prioridad actualizada',()=>task.priority=priority.dataset.setPriority);openTraits(task.id);}return;}
  const energy=event.target.closest('[data-set-energy]');if(energy){const task=state.tasks.find(t=>t.id===energy.dataset.id);if(task){mutateWithUndo('Energía actualizada',()=>task.energy=energy.dataset.setEnergy);openTraits(task.id);}return;}
  const move=event.target.closest('[data-move-category]');if(move){const task=state.tasks.find(t=>t.id===move.dataset.id);if(task){mutateWithUndo(`Movida a ${CATEGORY_SHORT[move.dataset.moveCategory]}`,()=>task.category=move.dataset.moveCategory);closeActionSheet();}return;}
  const lower=event.target.closest('[data-lower-priority]');if(lower){const task=state.tasks.find(t=>t.id===lower.dataset.lowerPriority);if(task){mutateWithUndo('Prioridad bajada',()=>task.priority='low');closeActionSheet();}return;}
  const help=event.target.closest('[data-postpone-help]');if(help){openPostponeHelp(help.dataset.postponeHelp);return;}
  const reviewDate=event.target.closest('[data-review-date]');if(reviewDate){state.lowEnergyMode=false;state.calendarSelectedDate=reviewDate.dataset.reviewDate;state.calendarCursor=startOfMonth(parseISODate(state.calendarSelectedDate));state.route='calendar';closeActionSheet();render();return;}
  const dayClose=event.target.closest('[data-day-close]');if(dayClose){applyDayClose(dayClose.dataset.dayClose);return;}
});

document.addEventListener('change',event=>{
  const sub=event.target.closest('[data-subtask-toggle]');if(sub){const task=state.tasks.find(t=>t.id===sub.dataset.taskId),st=task?.subtasks.find(s=>s.id===sub.dataset.subtaskToggle);if(task&&st){const snapshot=deepClone(state.tasks);st.completedAt=sub.checked?new Date().toISOString():null;saveAll();render();pushUndo('Paso actualizado',snapshot);setTimeout(()=>openTaskActions(task.id),80);}return;}
});

document.querySelectorAll('[data-task-filter]').forEach(btn=>btn.addEventListener('click',()=>{state.taskFilter=btn.dataset.taskFilter;document.querySelectorAll('[data-task-filter]').forEach(b=>b.classList.toggle('active',b===btn));renderCategory();}));
document.querySelectorAll('[data-choice-group] button').forEach(btn=>btn.addEventListener('click',()=>{const group=btn.closest('[data-choice-group]').dataset.choiceGroup;setChoice(group,btn.dataset.value);}));

document.getElementById('openCalendar').addEventListener('click',()=>{state.lowEnergyMode=false;state.route='calendar';state.calendarSelectedDate=todayISO();state.calendarCursor=startOfMonth(new Date());render();});
document.getElementById('homeCalendarShortcut').addEventListener('click',()=>{state.lowEnergyMode=false;state.route='calendar';render();});
els.miniAgendaOpen.addEventListener('click',()=>{state.lowEnergyMode=false;state.route='calendar';render();});
document.getElementById('openSettingsSide').addEventListener('click',openSettings);
document.getElementById('openSettingsTop').addEventListener('click',openSettings);
els.startNextBtn.addEventListener('click',()=>openNowMode());
els.lowEnergyBtn.addEventListener('click',toggleLowEnergy);
els.smartRecommendation.addEventListener('click',()=>{const type=els.smartRecommendation.dataset.recommendation;if(type==='space')openMakeSpace();if(type==='tomorrow')openTomorrowReview();if(type==='overdue')openOverdueReview();});
document.getElementById('closeSmartResults').addEventListener('click',closeSmartResults);
els.contextIsland.addEventListener('click',()=>{const action=els.contextIsland.dataset.islandAction;if(action==='space')openMakeSpace();else if(action==='close-day')openDayClose();else if(action==='gap')showQuickTime(Number(els.contextIsland.dataset.minutes||30));else openTaskSheet({category:['work','personal','study'].includes(state.route)?state.route:undefined});});
els.undoBtn.addEventListener('click',undoLast);

els.taskScheduledDate.addEventListener('change',updateCapacityPreview);els.taskDuration.addEventListener('change',updateCapacityPreview);
els.taskForm.addEventListener('submit',event=>{event.preventDefault();const title=els.taskTitle.value.trim();if(!title)return;const editId=els.taskEditId.value,existing=state.tasks.find(t=>t.id===editId),snapshot=deepClone(state.tasks),data={title,category:els.taskCategory.value,priority:els.taskPriority.value,energy:els.taskEnergy.value,scheduledDate:els.taskScheduledDate.value,scheduledTime:els.taskScheduledTime.value,deadline:els.taskDeadline.value,duration:Number(els.taskDuration.value),recurrence:els.taskRecurrence.value};if(existing)Object.assign(existing,data);else {const created=createTask(data);state.tasks.push(created);considerTaskForFocus(created);}saveAll();closeSheet(els.taskSheet);render();pushUndo(existing?'Tarea actualizada':'Tarea creada',snapshot);const load=data.scheduledDate?getDayLoad(data.scheduledDate):null;toast(load&&load.percent>100?`Ese día queda al ${load.percent}%`:(existing?'Cambios guardados.':'Tarea guardada.'));});
els.quickForm.addEventListener('submit',event=>{event.preventDefault();const parsed=parseNaturalTask(els.quickTaskInput.value);if(!parsed.title){toast('Escribe una tarea.');return;}const snapshot=deepClone(state.tasks);const task=createTask({title:parsed.title,category:parsed.category||(['work','personal','study'].includes(state.route)?state.route:'personal'),priority:parsed.priority||'medium',energy:parsed.energy||'normal',scheduledDate:parsed.scheduledDate||todayISO(),scheduledTime:parsed.scheduledTime||'',deadline:'',duration:parsed.duration||30,recurrence:parsed.recurrence||'none'});state.tasks.push(task);considerTaskForFocus(task);saveAll();closeSheet(els.quickSheet);render();pushUndo('Tarea creada',snapshot);toast('Entrada rápida creada.');});
els.reminderForm.addEventListener('submit',event=>{event.preventDefault();const title=els.reminderTitle.value.trim();if(!title)return;const snapshot=deepClone(state.tasks);const reminder=createTask({title,kind:'reminder',category:els.reminderCategory.value,priority:'medium',energy:'low',scheduledDate:els.reminderDate.value,scheduledTime:els.reminderTime.value,deadline:'',duration:5,recurrence:'none'});state.tasks.push(reminder);considerTaskForFocus(reminder);saveAll();closeSheet(els.reminderSheet);render();pushUndo('Recordatorio creado',snapshot);toast('Recordatorio guardado.');});

els.settingsForm.addEventListener('submit',event=>{event.preventDefault();state.settings.name=els.settingsName.value.trim()||'Angel';state.settings.dailyCapacity=Number(els.settingsCapacity.value||450);state.settings.haptics=els.settingsHaptics.checked;saveAll();closeSheet(els.settingsSheet);render();toast('Ajustes guardados.');});
document.getElementById('googleSyncBtn').addEventListener('click',syncGoogleCalendar);document.getElementById('appleExportBtn').addEventListener('click',exportAppleICS);document.getElementById('icsImportBtn').addEventListener('click',()=>els.icsFileInput.click());els.icsFileInput.addEventListener('change',async()=>{const file=els.icsFileInput.files?.[0];if(file)await importICS(file);els.icsFileInput.value='';});els.installAppBtn.addEventListener('click',installPWA);

document.getElementById('calendarPrev').addEventListener('click',()=>{if(isMobile()){state.calendarSelectedDate=addDays(state.calendarSelectedDate,-7);state.calendarCursor=startOfMonth(parseISODate(state.calendarSelectedDate));}else state.calendarCursor=new Date(state.calendarCursor.getFullYear(),state.calendarCursor.getMonth()-1,1);renderCalendar();});
document.getElementById('calendarNext').addEventListener('click',()=>{if(isMobile()){state.calendarSelectedDate=addDays(state.calendarSelectedDate,7);state.calendarCursor=startOfMonth(parseISODate(state.calendarSelectedDate));}else state.calendarCursor=new Date(state.calendarCursor.getFullYear(),state.calendarCursor.getMonth()+1,1);renderCalendar();});
document.getElementById('calendarToday').addEventListener('click',()=>{state.calendarSelectedDate=todayISO();state.calendarCursor=startOfMonth(new Date());renderCalendar();});

els.nowCompleteBtn.addEventListener('click',()=>{const id=state.nowTaskId;if(!id)return;closeNowMode();completeTask(id);});els.nowSnoozeBtn.addEventListener('click',()=>{const id=state.nowTaskId;closeNowMode();if(id)setTimeout(()=>openSnooze(id),70);});els.nowMoreBtn.addEventListener('click',()=>{const id=state.nowTaskId;closeNowMode();if(id)setTimeout(()=>openTaskActions(id),70);});

window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();state.installPrompt=event;updateInstallStatus();});window.addEventListener('appinstalled',()=>{state.installPrompt=null;toast('Organizador instalado.');updateInstallStatus();});

function checkReminders(){const now=new Date(),date=toISO(now),minutes=now.getHours()*60+now.getMinutes();state.tasks.filter(t=>!t.completedAt&&!t.archivedAt&&t.kind==='reminder'&&t.scheduledDate===date&&t.scheduledTime).forEach(t=>{const target=parseTimeMinutes(t.scheduledTime);if(target!==null&&minutes>=target&&minutes-target<=2&&!state.ui.reminderNotified[t.id]){state.ui.reminderNotified[t.id]=new Date().toISOString();saveUI();buzz(20);toast(`🔔 ${t.title}`);}});}
setInterval(checkReminders,30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkReminders();});

/* Bloqueo de zoom solicitado: pinch/doble toque/ctrl-wheel y atajos dentro de la página. */
['gesturestart','gesturechange','gestureend'].forEach(name=>document.addEventListener(name,event=>event.preventDefault(),{passive:false}));
document.addEventListener('touchmove',event=>{if(event.touches&&event.touches.length>1)event.preventDefault();},{passive:false});
document.addEventListener('dblclick',event=>event.preventDefault(),{passive:false});
window.addEventListener('wheel',event=>{if(event.ctrlKey)event.preventDefault();},{passive:false});
window.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&['+','-','=','0'].includes(event.key))event.preventDefault();});

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Service worker:',error)));}

ensureDailyFocus();render();checkReminders();
