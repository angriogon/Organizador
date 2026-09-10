const STORAGE_KEY = 'opi_tasks_v2';
const LEGACY_STORAGE_KEY = 'opi_tasks_v1';
const SETTINGS_KEY = 'opi_settings_v2';
const EXTERNAL_EVENTS_KEY = 'opi_external_events_v2';

const DEFAULT_SETTINGS = {
  name: 'Angel',
  dailyCapacity: 450
};

const CATEGORY_LABELS = {
  work: 'Trabajo',
  personal: 'Vida personal / vivienda',
  study: 'Estudios'
};

const CATEGORY_SHORT = {
  work: 'Trabajo',
  personal: 'Vida personal',
  study: 'Estudios'
};

const ENERGY_LABELS = { low: 'Baja', normal: 'Normal', high: 'Alta' };
const ENERGY_ICONS = { low: '◌', normal: '◐', high: '●' };
const PRIORITY_LABELS = { low: 'Baja', medium: 'Media', high: 'Alta' };

const state = {
  route: 'home',
  taskFilter: 'open',
  tasks: loadTasks(),
  settings: loadSettings(),
  externalEvents: loadExternalEvents(),
  calendarCursor: startOfMonth(new Date()),
  googleAccessToken: null,
  quickMode: null
};

const els = Object.fromEntries([
  'currentDate','pageTitle','homeView','tasksView','calendarView','greeting','daySentence','capacityRing','loadEmoji','loadPercent','loadStatus','capacityContext','makeSpaceBtn','topThreeCount','topThreeList','importantAlert','smartResults','smartResultsTitle','smartTaskList','nextTaskTitle','nextTaskMeta','calendarBusy','calendarCapacity','categoryKicker','categoryTitle','categoryTaskList','categoryEmpty','calendarMonthTitle','calendarGrid','taskModal','taskForm','quickTaskInput','taskTitle','taskCategory','taskPriority','taskEnergy','taskScheduledDate','taskScheduledTime','taskDeadline','taskDuration','taskRecurrence','taskCapacityPreview','actionModal','actionModalContent','settingsModal','settingsForm','settingsName','settingsCapacity','googleSyncStatus','icsFileInput','toast'
].map(id => [id, document.getElementById(id)]));

function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch (_) { return { ...DEFAULT_SETTINGS }; }
}

function loadExternalEvents() {
  try {
    const data = JSON.parse(localStorage.getItem(EXTERNAL_EVENTS_KEY));
    return Array.isArray(data) ? data : [];
  } catch (_) { return []; }
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
        energy: 'normal',
        snoozeCount: 0
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
    googleEventId: task.googleEventId || null
  };
}

function createTask(data) {
  return normalizeTask({
    id: uid(),
    createdAt: new Date().toISOString(),
    completedAt: null,
    archivedAt: null,
    snoozeCount: 0,
    postponeAlertedAtCount: 0,
    ...data
  });
}

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

function saveAll() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  localStorage.setItem(EXTERNAL_EVENTS_KEY, JSON.stringify(state.externalEvents));
}

function todayISO() { return toISO(new Date()); }
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function parseISODate(iso) {
  if (!iso) return null;
  const [y,m,d] = iso.split('-').map(Number);
  return new Date(y, m-1, d);
}
function addDays(iso, n) { const d = parseISODate(iso || todayISO()); d.setDate(d.getDate()+n); return toISO(d); }
function addMonths(iso, n) { const d = parseISODate(iso || todayISO()); d.setMonth(d.getMonth()+n); return toISO(d); }
function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function isToday(iso) { return iso === todayISO(); }
function isOverdueDeadline(task) { return Boolean(task.deadline && task.deadline < todayISO()); }
function activeTasks() { return state.tasks.filter(t => !t.completedAt && !t.archivedAt); }
function tasksOn(date) { return activeTasks().filter(t => t.scheduledDate === date); }
function completedToday() { return state.tasks.filter(t => t.completedAt && toISO(new Date(t.completedAt)) === todayISO()); }

function formatMinutes(minutes) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60); const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}
function formatDate(iso) {
  if (!iso) return 'Sin fecha';
  if (iso === todayISO()) return 'Hoy';
  if (iso === addDays(todayISO(), 1)) return 'Mañana';
  return new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short'}).format(parseISODate(iso));
}
function dayDistance(iso) {
  if (!iso) return Infinity;
  const a = parseISODate(todayISO());
  const b = parseISODate(iso);
  return Math.round((b-a)/86400000);
}

function getBusyMinutes(date) {
  return state.externalEvents.filter(e => e.date === date).reduce((sum,e) => sum + Number(e.duration || 0), 0);
}

function getDayCapacity(date) {
  return Math.max(60, Number(state.settings.dailyCapacity || 450) - getBusyMinutes(date));
}

function getDayLoad(date, extraMinutes = 0, excludeTaskId = null) {
  const planned = tasksOn(date).filter(t => t.id !== excludeTaskId).reduce((sum,t) => sum + t.duration, 0) + extraMinutes;
  const capacity = getDayCapacity(date);
  return { planned, capacity, percent: Math.round((planned / capacity) * 100), busy: getBusyMinutes(date) };
}

function loadStatus(percent) {
  if (percent <= 35) return { label:'Día ligero', emoji:'😌' };
  if (percent <= 70) return { label:'Equilibrado', emoji:'🙂' };
  if (percent <= 100) return { label:'Cargado', emoji:'😅' };
  return { label:'Sobrecargado', emoji:'🫠' };
}

function taskScore(task) {
  let score = { high:42, medium:22, low:7 }[task.priority];
  if (task.deadline) {
    const days = dayDistance(task.deadline);
    if (days < 0) score += 120 + Math.min(30, Math.abs(days)*5);
    else if (days === 0) score += 75;
    else if (days === 1) score += 42;
    else if (days <= 7) score += Math.max(8, 30 - days*3);
  }
  if (task.scheduledDate) {
    const days = dayDistance(task.scheduledDate);
    if (days < 0) score += 48;
    else if (days === 0) score += 58;
    else if (days === 1) score += 19;
  }
  score += Math.min(40, task.snoozeCount * 8);
  if (task.duration <= 30) score += 6;
  if (task.recurrence !== 'none') score += 2;
  return score;
}

function getTopThree() {
  return activeTasks().slice().sort((a,b) => taskScore(b)-taskScore(a) || (a.deadline || '9999').localeCompare(b.deadline || '9999')).slice(0,3);
}

function getImportantAlertTasks() {
  return activeTasks().filter(t => isOverdueDeadline(t) || t.deadline === todayISO()).sort((a,b) => taskScore(b)-taskScore(a));
}

function findNextGap(task, startDate = addDays(todayISO(),1)) {
  for (let i=0; i<21; i++) {
    const date = addDays(startDate, i);
    const load = getDayLoad(date, task.duration, task.id);
    if (load.percent <= 80) return date;
  }
  return addDays(startDate, 21);
}

function getMoveSuggestions(date = todayISO(), targetPercent = 85) {
  const current = getDayLoad(date);
  if (current.percent <= 100) return [];
  const candidates = tasksOn(date).filter(t => !isOverdueDeadline(t) && t.deadline !== date).slice().sort((a,b) => movableScore(a)-movableScore(b));
  const selected = [];
  let remaining = current.planned;
  for (const task of candidates) {
    if (Math.round((remaining/current.capacity)*100) <= targetPercent) break;
    selected.push({ task, targetDate: findNextGap(task, addDays(date,1)) });
    remaining -= task.duration;
  }
  return selected;
}

function movableScore(task) {
  let score = 0;
  if (task.priority === 'high') score += 60;
  if (task.priority === 'medium') score += 25;
  if (task.deadline === todayISO() || isOverdueDeadline(task)) score += 100;
  if (task.deadline === addDays(todayISO(),1)) score += 45;
  score += task.snoozeCount * 7;
  return score;
}

function render() {
  renderDateAndGreeting();
  renderRoute();
  renderHome();
  renderCategory();
  renderCalendar();
}

function renderDateAndGreeting() {
  const now = new Date();
  els.currentDate.textContent = new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(now);
  const hour = now.getHours();
  const part = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  els.greeting.textContent = `${part}, ${state.settings.name || 'Angel'} 👋`;
}

function renderRoute() {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-route]').forEach(b => b.classList.toggle('active', b.dataset.route === state.route));
  if (state.route === 'home') { els.homeView.classList.add('active'); els.pageTitle.textContent = 'Inicio'; }
  else if (state.route === 'calendar') { els.calendarView.classList.add('active'); els.pageTitle.textContent = 'Calendario'; }
  else { els.tasksView.classList.add('active'); els.pageTitle.textContent = CATEGORY_SHORT[state.route]; }
}

function renderHome() {
  const load = getDayLoad(todayISO());
  const status = loadStatus(load.percent);
  const ringPercent = Math.min(100, load.percent);
  els.capacityRing.style.setProperty('--ring-value', `${ringPercent * 3.6}deg`);
  els.loadEmoji.textContent = status.emoji;
  els.loadPercent.textContent = `${load.percent}%`;
  els.loadStatus.textContent = status.label;
  const busyText = load.busy ? ` · ${formatMinutes(load.busy)} en agenda` : '';
  els.capacityContext.textContent = `${formatMinutes(load.planned)} planificados${busyText}`;
  els.makeSpaceBtn.hidden = load.percent <= 100;
  if (load.percent > 100) {
    const suggestions = getMoveSuggestions();
    if (suggestions.length) {
      const moved = suggestions.reduce((sum, item) => sum + item.task.duration, 0);
      const after = Math.round(((load.planned - moved) / load.capacity) * 100);
      els.makeSpaceBtn.textContent = `Hazme hueco · mover ${suggestions.length} → ${after}%`;
    } else {
      els.makeSpaceBtn.textContent = 'Hazme hueco →';
    }
  }

  const top = getTopThree();
  els.topThreeCount.textContent = top.length;
  els.topThreeList.innerHTML = top.length ? top.map(task => `
    <button class="top-task" data-open-task="${task.id}">
      <i class="category-dot ${task.category}"></i>
      <strong>${escapeHTML(task.title)}</strong>
      <span>${formatMinutes(task.duration)}</span>
    </button>`).join('') : '<div class="top-three-empty">No hay nada urgente. Buen momento para mantener el día ligero.</div>';

  const alerts = getImportantAlertTasks();
  if (alerts.length) {
    const overdue = alerts.filter(isOverdueDeadline).length;
    els.importantAlert.hidden = false;
    els.importantAlert.textContent = overdue ? `⚠️ ${overdue} ${overdue === 1 ? 'tarea vencida' : 'tareas vencidas'} que conviene revisar hoy.` : `⏰ ${alerts.length} ${alerts.length === 1 ? 'fecha límite' : 'fechas límite'} hoy.`;
  } else els.importantAlert.hidden = true;

  const next = activeTasks().filter(t => t.deadline || t.scheduledDate).sort((a,b) => {
    const da = a.deadline || a.scheduledDate; const db = b.deadline || b.scheduledDate;
    return da.localeCompare(db) || taskScore(b)-taskScore(a);
  })[0];
  if (next) {
    els.nextTaskTitle.textContent = next.title;
    const date = next.deadline || next.scheduledDate;
    els.nextTaskMeta.textContent = `${formatDate(date)} · ${formatMinutes(next.duration)}`;
  } else {
    els.nextTaskTitle.textContent = 'Nada urgente';
    els.nextTaskMeta.textContent = 'Tu agenda está tranquila';
  }

  if (load.busy) {
    els.calendarBusy.textContent = `${formatMinutes(load.busy)} ocupadas hoy`;
    els.calendarCapacity.textContent = `${formatMinutes(load.capacity)} disponibles para tareas`;
  } else {
    els.calendarBusy.textContent = state.externalEvents.length ? 'Hoy sin eventos' : 'Sin eventos conectados';
    els.calendarCapacity.textContent = state.externalEvents.length ? `${formatMinutes(load.capacity)} disponibles` : 'Conecta tu agenda si quieres';
  }
  els.daySentence.textContent = load.percent > 100 ? 'Hay demasiado para hoy. La app puede ayudarte a mover lo menos crítico.' : top.length ? `Tienes ${top.length} ${top.length === 1 ? 'prioridad clara' : 'cosas importantes'}. El resto puede esperar.` : 'Hoy, solo lo que importa.';
}

function renderCategory() {
  if (!['work','personal','study'].includes(state.route)) return;
  els.categoryKicker.textContent = 'Área';
  els.categoryTitle.textContent = CATEGORY_LABELS[state.route];
  let tasks = state.tasks.filter(t => t.category === state.route && !t.archivedAt);
  if (state.taskFilter === 'open') tasks = tasks.filter(t => !t.completedAt);
  if (state.taskFilter === 'today') tasks = tasks.filter(t => !t.completedAt && (t.scheduledDate === todayISO() || t.deadline === todayISO() || isOverdueDeadline(t)));
  tasks.sort((a,b) => Number(Boolean(a.completedAt))-Number(Boolean(b.completedAt)) || taskScore(b)-taskScore(a));
  els.categoryTaskList.innerHTML = tasks.map(renderTaskItem).join('');
  els.categoryEmpty.hidden = tasks.length > 0;
}

function renderTaskItem(task) {
  const due = task.deadline ? `${isOverdueDeadline(task) ? 'Vencida · ' : ''}${formatDate(task.deadline)}` : task.scheduledDate ? formatDate(task.scheduledDate) : 'Sin fecha';
  const urgentClass = isOverdueDeadline(task) || task.deadline === todayISO() ? 'urgent' : '';
  return `<article class="task-item" data-task-id="${task.id}">
    <button class="check-btn" data-action="complete" data-id="${task.id}" aria-label="Completar tarea"></button>
    <div class="task-main">
      <div class="task-title-row"><i class="task-badge ${task.category}"></i><h3 class="task-title">${escapeHTML(task.title)}</h3></div>
      <div class="task-meta">
        <span class="${urgentClass}">◷ ${due}</span>
        <span>${formatMinutes(task.duration)}</span>
        <span title="Energía ${ENERGY_LABELS[task.energy]}">${ENERGY_ICONS[task.energy]} energía</span>
        ${task.snoozeCount ? `<span>↪ ${task.snoozeCount}</span>` : ''}
      </div>
    </div>
    <div class="task-actions">
      <button class="task-action" data-action="snooze" data-id="${task.id}">Aplazar</button>
      <button class="task-action icon-only" data-action="split" data-id="${task.id}" title="Dividir tarea">⑂</button>
      <button class="task-action icon-only" data-action="archive" data-id="${task.id}" title="Archivar">⋯</button>
    </div>
  </article>`;
}

function renderSmartList(tasks) {
  els.smartTaskList.innerHTML = tasks.length ? tasks.map(renderTaskItem).join('') : '<div class="top-three-empty">No encuentro una tarea que encaje bien ahora mismo.</div>';
}

function renderCalendar() {
  if (state.route !== 'calendar') return;
  const cursor = state.calendarCursor;
  els.calendarMonthTitle.textContent = new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(cursor).replace(/^./, c => c.toUpperCase());
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const last = new Date(cursor.getFullYear(), cursor.getMonth()+1, 0);
  const mondayOffset = (first.getDay()+6)%7;
  const total = Math.ceil((mondayOffset + last.getDate())/7)*7;
  const start = new Date(first); start.setDate(first.getDate()-mondayOffset);
  const cells = [];
  for (let i=0;i<total;i++) {
    const date = new Date(start); date.setDate(start.getDate()+i);
    const iso = toISO(date);
    const inMonth = date.getMonth() === cursor.getMonth();
    const events = [
      ...activeTasks().filter(t => t.scheduledDate === iso).map(t => ({type:'task', id:t.id, title:t.title, category:t.category})),
      ...state.externalEvents.filter(e => e.date === iso).map(e => ({type:'external', id:e.id, title:e.title, category:'external'}))
    ];
    cells.push(`<div class="calendar-day ${inMonth ? '' : 'outside'} ${iso === todayISO() ? 'today' : ''}">
      <span class="day-number">${date.getDate()}</span>
      <div class="calendar-events">
        ${events.slice(0,3).map(e => `<button class="calendar-event ${e.category}" ${e.type === 'task' ? `data-open-task="${e.id}"` : `title="${escapeHTML(e.title)}"`}>${escapeHTML(e.title)}</button>`).join('')}
        ${events.length > 3 ? `<span class="more-events">+${events.length-3}</span>` : ''}
      </div>
    </div>`);
  }
  els.calendarGrid.innerHTML = cells.join('');
}

function openTaskModal(prefill = {}) {
  els.taskForm.reset();
  els.quickTaskInput.value = '';
  els.taskScheduledDate.value = prefill.scheduledDate || todayISO();
  els.taskCategory.value = prefill.category || (['work','personal','study'].includes(state.route) ? state.route : 'work');
  els.taskPriority.value = 'medium';
  els.taskEnergy.value = 'normal';
  els.taskDuration.value = '30';
  els.taskRecurrence.value = 'none';
  els.taskDeadline.value = '';
  els.taskScheduledTime.value = '';
  updateCapacityPreview();
  els.taskModal.showModal();
  setTimeout(() => (prefill.focusQuick ? els.quickTaskInput : els.taskTitle).focus(), 50);
}

function updateCapacityPreview() {
  const date = els.taskScheduledDate.value;
  if (!date) { els.taskCapacityPreview.textContent = 'Sin día asignado: no afecta a la carga diaria.'; els.taskCapacityPreview.classList.remove('warning'); return; }
  const duration = Number(els.taskDuration.value || 30);
  const load = getDayLoad(date, duration);
  els.taskCapacityPreview.textContent = load.percent > 100 ? `⚠️ Con esto llegarías al ${load.percent}% de capacidad ese día.` : `Ese día quedaría al ${load.percent}% de capacidad.`;
  els.taskCapacityPreview.classList.toggle('warning', load.percent > 100);
}

function parseNaturalTask(text) {
  const original = text.trim();
  let remaining = original;
  const result = {};
  const lower = original.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  if (/\bmanana\b/.test(lower)) { result.scheduledDate = addDays(todayISO(),1); remaining = remaining.replace(/\bmañana\b/ig,''); }
  else if (/\bhoy\b/.test(lower)) { result.scheduledDate = todayISO(); remaining = remaining.replace(/\bhoy\b/ig,''); }

  const dateMatch = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (dateMatch) {
    let year = Number(dateMatch[3] || new Date().getFullYear()); if (year < 100) year += 2000;
    const d = new Date(year, Number(dateMatch[2])-1, Number(dateMatch[1]));
    if (!Number.isNaN(d.getTime())) result.scheduledDate = toISO(d);
    remaining = remaining.replace(dateMatch[0],'');
  }

  const timeMatch = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (timeMatch) { result.scheduledTime = `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}`; remaining = remaining.replace(timeMatch[0],''); }

  const durationMatch = lower.match(/\b(?:(\d+)\s*h(?:oras?)?)\s*(?:(\d+)\s*m(?:in(?:utos?)?)?)?\b|\b(\d+)\s*m(?:in(?:utos?)?)\b/);
  if (durationMatch) {
    const duration = Number(durationMatch[1] || 0)*60 + Number(durationMatch[2] || durationMatch[3] || 0);
    if (duration) result.duration = duration;
    remaining = remaining.replace(durationMatch[0],'');
  }

  const categoryPatterns = [
    ['work', /\b(trabajo|laboral)\b/i],
    ['personal', /\b(personal|casa|vivienda|hogar)\b/i],
    ['study', /\b(estudio|estudios)\b/i]
  ];
  for (const [category, pattern] of categoryPatterns) {
    if (pattern.test(remaining)) { result.category = category; remaining = remaining.replace(pattern,''); break; }
  }

  const energyMatch = remaining.match(/\benergia\s+(baja|normal|alta)\b/i) || remaining.match(/\benergía\s+(baja|normal|alta)\b/i);
  if (energyMatch) { result.energy = ({baja:'low',normal:'normal',alta:'high'})[energyMatch[1].toLowerCase()]; remaining = remaining.replace(energyMatch[0],''); }

  const priorityMatch = remaining.match(/\b(prioridad\s+)?(alta|media|baja)\b/i);
  if (priorityMatch) { result.priority = ({alta:'high',media:'medium',baja:'low'})[priorityMatch[2].toLowerCase()]; remaining = remaining.replace(priorityMatch[0],''); }

  const recurrencePatterns = [
    ['daily', /\b(cada d[ií]a|diaria|diario)\b/i],
    ['weekly', /\b(cada semana|semanal)\b/i],
    ['monthly', /\b(cada mes|mensual)\b/i]
  ];
  for (const [recurrence, pattern] of recurrencePatterns) {
    if (pattern.test(remaining)) { result.recurrence = recurrence; remaining = remaining.replace(pattern,''); break; }
  }

  result.title = remaining.replace(/\s{2,}/g,' ').replace(/\s+([,.;])/g,'$1').trim().replace(/^[-,.;\s]+|[-,.;\s]+$/g,'');
  return result;
}

function applyParsedTask() {
  const parsed = parseNaturalTask(els.quickTaskInput.value);
  if (parsed.title) els.taskTitle.value = parsed.title;
  if (parsed.category) els.taskCategory.value = parsed.category;
  if (parsed.priority) els.taskPriority.value = parsed.priority;
  if (parsed.energy) els.taskEnergy.value = parsed.energy;
  if (parsed.scheduledDate) els.taskScheduledDate.value = parsed.scheduledDate;
  if (parsed.scheduledTime) els.taskScheduledTime.value = parsed.scheduledTime;
  if (parsed.duration) {
    const option = [...els.taskDuration.options].find(o => Number(o.value) === parsed.duration);
    if (option) els.taskDuration.value = String(parsed.duration);
    else {
      const custom = document.createElement('option'); custom.value = String(parsed.duration); custom.textContent = formatMinutes(parsed.duration); els.taskDuration.appendChild(custom); els.taskDuration.value = String(parsed.duration);
    }
  }
  if (parsed.recurrence) els.taskRecurrence.value = parsed.recurrence;
  updateCapacityPreview();
  toast('He rellenado lo que he podido reconocer.');
}

function completeTask(id) {
  const task = state.tasks.find(t => t.id === id); if (!task) return;
  task.completedAt = new Date().toISOString();
  advanceRecurrence(task);
  saveAll(); render();
  toast('Tarea completada ✓');
}

function advanceRecurrence(task) {
  if (task.recurrence === 'none') return;
  const base = task.scheduledDate || todayISO();
  const next = task.recurrence === 'daily' ? addDays(base,1) : task.recurrence === 'weekly' ? addDays(base,7) : addMonths(base,1);
  let nextDeadline = '';
  if (task.deadline && task.scheduledDate) {
    const delta = Math.round((parseISODate(task.deadline)-parseISODate(task.scheduledDate))/86400000);
    nextDeadline = addDays(next,delta);
  }
  state.tasks.push(createTask({ ...task, id:uid(), scheduledDate:next, deadline:nextDeadline, completedAt:null, archivedAt:null, googleEventId:null, snoozeCount:0, postponeAlertedAtCount:0 }));
}

function openTaskActions(id) {
  const task = state.tasks.find(t => t.id === id); if (!task) return;
  openActionModal(`
    <div class="modal-header"><div><span class="section-kicker">Tarea</span><h2>${escapeHTML(task.title)}</h2></div><button class="icon-btn subtle" data-close-action>×</button></div>
    <p class="action-copy">${CATEGORY_SHORT[task.category]} · ${PRIORITY_LABELS[task.priority]} · ${formatMinutes(task.duration)} · energía ${ENERGY_LABELS[task.energy].toLowerCase()}</p>
    <div class="action-list">
      <button class="action-option" data-action="complete" data-id="${task.id}"><strong>✓ Completar</strong><span>Quitarla de pendientes.</span></button>
      <button class="action-option" data-action="snooze" data-id="${task.id}"><strong>↪ Aplazar inteligentemente</strong><span>Mañana, próximo hueco o una fecha concreta.</span></button>
      <button class="action-option" data-action="split" data-id="${task.id}"><strong>⑂ Dividir tarea</strong><span>Convertirla en 2–4 pasos pequeños.</span></button>
      <button class="action-option" data-action="archive" data-id="${task.id}"><strong>Archivar</strong><span>Quitarla de tu planificación sin marcarla como hecha.</span></button>
    </div>`);
}

function openSnooze(id) {
  const task = state.tasks.find(t => t.id === id); if (!task) return;
  const gap = findNextGap(task);
  openActionModal(`
    <div class="modal-header"><div><span class="section-kicker">Aplazar</span><h2>${escapeHTML(task.title)}</h2></div><button class="icon-btn subtle" data-close-action>×</button></div>
    <div class="action-list">
      <button class="action-option" data-snooze-choice="tomorrow" data-id="${id}"><strong>Mañana</strong><span>${formatDate(addDays(todayISO(),1))}</span></button>
      <button class="action-option" data-snooze-choice="gap" data-id="${id}"><strong>Próximo hueco</strong><span>${formatDate(gap)} · con margen de capacidad</span></button>
      <button class="action-option" data-snooze-choice="date" data-id="${id}"><strong>Elegir fecha</strong><span>Decidirlo manualmente.</span></button>
    </div>`);
}

function applySnooze(id, date) {
  const task = state.tasks.find(t => t.id === id); if (!task) return;
  task.scheduledDate = date;
  task.snoozeCount += 1;
  saveAll(); closeActionModal(); render();
  toast(`Movida a ${formatDate(date)}.`);
  if (task.snoozeCount >= 4 && task.postponeAlertedAtCount < task.snoozeCount) {
    task.postponeAlertedAtCount = task.snoozeCount;
    saveAll();
    setTimeout(() => openPostponeIntervention(task.id), 120);
  }
}

function openPostponeIntervention(id) {
  const task = state.tasks.find(t => t.id === id); if (!task) return;
  openActionModal(`
    <div class="modal-header"><div><span class="section-kicker">Una señal útil</span><h2>Esta tarea ya se ha aplazado ${task.snoozeCount} veces</h2></div><button class="icon-btn subtle" data-close-action>×</button></div>
    <p class="action-copy">En vez de seguir empujándola, quizá convenga cambiar cómo está planteada.</p>
    <div class="action-list">
      <button class="action-option" data-action="split" data-id="${id}"><strong>Dividirla</strong><span>Crear pasos más pequeños.</span></button>
      <button class="action-option" data-intervention="lower" data-id="${id}"><strong>Bajar prioridad</strong><span>Dejar de tratarla como urgente.</span></button>
      <button class="action-option" data-snooze-choice="date" data-id="${id}"><strong>Programarla de verdad</strong><span>Elegir una fecha concreta.</span></button>
      <button class="action-option" data-action="archive" data-id="${id}"><strong>Descartarla / archivar</strong><span>Si ya no aporta valor, fuera.</span></button>
    </div>`);
}

function openSplit(id) {
  const task = state.tasks.find(t => t.id === id); if (!task) return;
  openActionModal(`
    <div class="modal-header"><div><span class="section-kicker">Dividir tarea</span><h2>${escapeHTML(task.title)}</h2></div><button class="icon-btn subtle" data-close-action>×</button></div>
    <p class="action-copy">Escribe entre 2 y 4 pasos. Heredarán la fecha, el área y la prioridad.</p>
    <div class="split-inputs">
      <input class="split-part" placeholder="Paso 1" />
      <input class="split-part" placeholder="Paso 2" />
      <input class="split-part" placeholder="Paso 3 (opcional)" />
      <input class="split-part" placeholder="Paso 4 (opcional)" />
    </div>
    <div class="modal-actions"><button class="ghost-btn" data-close-action>Cancelar</button><button class="primary-btn" data-confirm-split="${id}">Crear pasos</button></div>`);
}

function confirmSplit(id) {
  const task = state.tasks.find(t => t.id === id); if (!task) return;
  const parts = [...els.actionModalContent.querySelectorAll('.split-part')].map(i => i.value.trim()).filter(Boolean);
  if (parts.length < 2) { toast('Escribe al menos dos pasos.'); return; }
  const partDuration = Math.max(5, Math.ceil(task.duration / parts.length / 5) * 5);
  parts.forEach(title => state.tasks.push(createTask({ ...task, id:uid(), title, duration:partDuration, parentId:task.id, completedAt:null, archivedAt:null, googleEventId:null, recurrence:'none', snoozeCount:0, postponeAlertedAtCount:0 })));
  task.archivedAt = new Date().toISOString();
  saveAll(); closeActionModal(); render(); toast('Tarea dividida en pasos.');
}

function openMakeSpace() {
  const suggestions = getMoveSuggestions();
  const current = getDayLoad(todayISO());
  if (!suggestions.length) { toast('Tu día no necesita liberar espacio ahora mismo.'); return; }
  const movedMinutes = suggestions.reduce((s,x)=>s+x.task.duration,0);
  const after = Math.round(((current.planned-movedMinutes)/current.capacity)*100);
  openActionModal(`
    <div class="modal-header"><div><span class="section-kicker">Hazme hueco</span><h2>Podemos bajar tu día del ${current.percent}% al ${after}%</h2></div><button class="icon-btn subtle" data-close-action>×</button></div>
    <p class="action-copy">He elegido primero lo que tiene menor riesgo de moverse. Las fechas límite no cambian.</p>
    <div>${suggestions.map(({task,targetDate}) => `
      <label class="space-suggestion"><input type="checkbox" class="space-check" data-id="${task.id}" data-date="${targetDate}" checked /><div><strong>${escapeHTML(task.title)}</strong><span>${formatMinutes(task.duration)} · ${CATEGORY_SHORT[task.category]}</span></div><span>→ ${formatDate(targetDate)}</span></label>`).join('')}</div>
    <div class="action-summary">Resultado estimado: ${after}% de capacidad.</div>
    <div class="modal-actions"><button class="ghost-btn" data-close-action>Ahora no</button><button class="primary-btn" data-confirm-space>Aceptar propuesta</button></div>`);
}

function confirmMakeSpace() {
  const checks = [...els.actionModalContent.querySelectorAll('.space-check:checked')];
  checks.forEach(input => {
    const task = state.tasks.find(t => t.id === input.dataset.id);
    if (task) { task.scheduledDate = input.dataset.date; task.snoozeCount += 1; }
  });
  saveAll(); closeActionModal(); render(); toast('He dejado más aire en tu día.');
}

function openDayClose() {
  const done = completedToday().length;
  const pending = tasksOn(todayISO());
  const tomorrow = getDayLoad(addDays(todayISO(),1));
  openActionModal(`
    <div class="modal-header"><div><span class="section-kicker">Cierre del día</span><h2>30 segundos y listo</h2></div><button class="icon-btn subtle" data-close-action>×</button></div>
    <div class="action-summary">✓ ${done} completadas · ${pending.length} pendientes · mañana ${tomorrow.percent}%</div>
    <p class="action-copy">¿Qué hacemos con lo que queda de hoy?</p>
    <div class="action-list">
      <button class="action-option" data-day-close="tomorrow"><strong>Pasar a mañana</strong><span>Mueve todas las pendientes al día siguiente.</span></button>
      <button class="action-option" data-day-close="gaps"><strong>Buscar hueco</strong><span>Reparte cada tarea en el próximo día con margen.</span></button>
      <button class="action-option" data-day-close="archive"><strong>Archivar</strong><span>Sácalas de la planificación.</span></button>
    </div>`);
}

function applyDayClose(action) {
  const pending = tasksOn(todayISO());
  pending.forEach(task => {
    if (action === 'tomorrow') { task.scheduledDate = addDays(todayISO(),1); task.snoozeCount += 1; }
    if (action === 'gaps') { task.scheduledDate = findNextGap(task); task.snoozeCount += 1; }
    if (action === 'archive') task.archivedAt = new Date().toISOString();
  });
  saveAll(); closeActionModal(); render(); toast('Cierre del día hecho.');
}

function showQuickTime(minutes) {
  state.quickMode = `time-${minutes}`;
  const tasks = activeTasks().filter(t => t.duration <= minutes).sort((a,b)=>taskScore(b)-taskScore(a)).slice(0,6);
  els.smartResultsTitle.textContent = `Lo mejor para ${minutes === 60 ? '1 hora' : `${minutes} min`}`;
  renderSmartList(tasks);
  els.smartResults.hidden = false;
  els.smartResults.scrollIntoView({behavior:'smooth', block:'nearest'});
  document.querySelectorAll('.time-chip[data-minutes]').forEach(b => b.classList.toggle('active', Number(b.dataset.minutes)===minutes));
  document.getElementById('lowEnergyBtn').classList.remove('active');
}

function showLowEnergy() {
  state.quickMode = 'low-energy';
  const tasks = activeTasks().filter(t => t.energy === 'low' || (t.energy === 'normal' && t.duration <= 20)).sort((a,b)=>taskScore(b)-taskScore(a)).slice(0,6);
  els.smartResultsTitle.textContent = 'Poco esfuerzo, buen avance';
  renderSmartList(tasks);
  els.smartResults.hidden = false;
  els.smartResults.scrollIntoView({behavior:'smooth', block:'nearest'});
  document.querySelectorAll('.time-chip[data-minutes]').forEach(b => b.classList.remove('active'));
  document.getElementById('lowEnergyBtn').classList.add('active');
}

function closeSmartResults() {
  state.quickMode = null; els.smartResults.hidden = true;
  document.querySelectorAll('.time-chip').forEach(b => b.classList.remove('active'));
}

function archiveTask(id) {
  const task = state.tasks.find(t => t.id === id); if (!task) return;
  task.archivedAt = new Date().toISOString();
  saveAll(); closeActionModal(); render(); toast('Tarea archivada.');
}

function openActionModal(html) {
  els.actionModalContent.innerHTML = html;
  if (!els.actionModal.open) els.actionModal.showModal();
}
function closeActionModal() { if (els.actionModal.open) els.actionModal.close(); }

function showDatePickerForSnooze(id) {
  const task = state.tasks.find(t => t.id === id); if (!task) return;
  openActionModal(`
    <div class="modal-header"><div><span class="section-kicker">Elegir fecha</span><h2>¿Cuándo encaja mejor?</h2></div><button class="icon-btn subtle" data-close-action>×</button></div>
    <label><span>Nueva fecha planificada</span><input id="customSnoozeDate" type="date" value="${task.scheduledDate || addDays(todayISO(),1)}" min="${todayISO()}" /></label>
    <div class="modal-actions"><button class="ghost-btn" data-close-action>Cancelar</button><button class="primary-btn" data-confirm-custom-snooze="${id}">Mover tarea</button></div>`);
}

function openSettings() {
  els.settingsName.value = state.settings.name;
  els.settingsCapacity.value = String(state.settings.dailyCapacity);
  els.settingsModal.showModal();
}

async function syncGoogleCalendar() {
  const clientId = window.OPI_CONFIG && window.OPI_CONFIG.googleClientId;
  if (!clientId) {
    openActionModal(`
      <div class="modal-header"><div><span class="section-kicker">Google Calendar</span><h2>Falta una configuración única</h2></div><button class="icon-btn subtle" data-close-action>×</button></div>
      <p class="action-copy">Para que una web estática pueda leer tu calendario de forma segura, Google exige un Client ID OAuth. No es una contraseña ni debe llevar un client secret.</p>
      <div class="action-summary">Añade tu Client ID en <strong>config.js</strong>, habilita Google Calendar API y autoriza la URL de GitHub Pages como origen.</div>
      <div class="modal-actions"><button class="primary-btn" data-close-action>Entendido</button></div>`);
    return;
  }
  try {
    els.googleSyncStatus.textContent = 'Conectando…';
    await loadGoogleIdentity();
    const token = await getGoogleToken(clientId);
    state.googleAccessToken = token;
    const events = await fetchGoogleEvents(token);
    state.externalEvents = [
      ...state.externalEvents.filter(e => e.source !== 'google'),
      ...events
    ];
    saveAll(); render();
    els.googleSyncStatus.textContent = `Sincronizado · ${events.length} eventos`;
    toast('Google Calendar sincronizado.');
  } catch (error) {
    console.error(error);
    els.googleSyncStatus.textContent = 'No se pudo conectar';
    toast('No se pudo sincronizar Google Calendar.');
  }
}

function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve,reject) => {
    const existing = document.querySelector('script[data-google-identity]');
    if (existing) { existing.addEventListener('load',resolve,{once:true}); existing.addEventListener('error',reject,{once:true}); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true; script.defer = true; script.dataset.googleIdentity = '1';
    script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
  });
}

function getGoogleToken(clientId) {
  return new Promise((resolve,reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
      callback: response => response.error ? reject(new Error(response.error)) : resolve(response.access_token),
      error_callback: reject
    });
    client.requestAccessToken({prompt: state.googleAccessToken ? '' : 'consent'});
  });
}

async function fetchGoogleEvents(token) {
  const min = new Date(); min.setDate(min.getDate()-31);
  const max = new Date(); max.setDate(max.getDate()+120);
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', min.toISOString()); url.searchParams.set('timeMax', max.toISOString()); url.searchParams.set('singleEvents','true'); url.searchParams.set('orderBy','startTime'); url.searchParams.set('maxResults','250');
  const response = await fetch(url, {headers:{Authorization:`Bearer ${token}`}});
  if (!response.ok) throw new Error(`Google Calendar ${response.status}`);
  const data = await response.json();
  return (data.items || []).filter(e => e.status !== 'cancelled').map(e => googleEventToLocal(e)).filter(Boolean);
}

function googleEventToLocal(event) {
  const startRaw = event.start?.dateTime || event.start?.date; const endRaw = event.end?.dateTime || event.end?.date;
  if (!startRaw) return null;
  const allDay = Boolean(event.start?.date);
  const start = allDay ? parseISODate(startRaw.slice(0,10)) : new Date(startRaw);
  const end = endRaw ? (allDay ? parseISODate(endRaw.slice(0,10)) : new Date(endRaw)) : start;
  const duration = allDay ? 0 : Math.max(0, Math.round((end-start)/60000));
  return { id:`google-${event.id}`, source:'google', title:event.summary || 'Evento', date:toISO(start), duration, start:event.start, end:event.end };
}

function exportAppleICS() {
  const tasks = activeTasks().filter(t => t.scheduledDate).sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate));
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Organizador Personal Inteligente//ES','CALSCALE:GREGORIAN'];
  tasks.forEach(task => {
    const start = task.scheduledDate.replaceAll('-','');
    const summary = escapeICS(task.title);
    lines.push('BEGIN:VEVENT',`UID:${task.id}@opi`,`DTSTAMP:${utcStamp(new Date())}`, task.scheduledTime ? `DTSTART:${start}T${task.scheduledTime.replace(':','')}00` : `DTSTART;VALUE=DATE:${start}`, task.scheduledTime ? `DURATION:PT${task.duration}M` : 'DURATION:P1D', `SUMMARY:${summary}`,`DESCRIPTION:${escapeICS(`${CATEGORY_SHORT[task.category]} · ${PRIORITY_LABELS[task.priority]}`)}`,'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'organizador-personal.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  toast('Calendario .ics preparado.');
}

function utcStamp(date) { return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'); }
function escapeICS(value) { return String(value).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'); }

async function importICS(file) {
  const text = await file.text();
  const blocks = text.replace(/\r?\n[ \t]/g,'').split('BEGIN:VEVENT').slice(1).map(x=>x.split('END:VEVENT')[0]);
  const imported = [];
  for (const block of blocks) {
    const summary = getICSValue(block,'SUMMARY') || 'Evento';
    const startValue = getICSValue(block,'DTSTART');
    const endValue = getICSValue(block,'DTEND');
    if (!startValue) continue;
    const start = parseICSDate(startValue); const end = endValue ? parseICSDate(endValue) : null;
    if (!start) continue;
    const allDay = /^\d{8}$/.test(startValue.trim());
    const duration = !allDay && end ? Math.max(0,Math.round((end-start)/60000)) : 0;
    imported.push({ id:`ics-${uid()}`, source:'ics', title:unescapeICS(summary), date:toISO(start), duration, start:start.toISOString(), end:end?.toISOString() || null });
  }
  state.externalEvents = [...state.externalEvents.filter(e=>e.source!=='ics'), ...imported];
  saveAll(); render(); toast(`${imported.length} eventos importados.`);
}

function getICSValue(block,key) {
  const line = block.split(/\r?\n/).find(l => l.startsWith(key));
  return line ? line.slice(line.indexOf(':')+1).trim() : '';
}
function parseICSDate(value) {
  const v = value.trim();
  if (/^\d{8}$/.test(v)) return new Date(Number(v.slice(0,4)),Number(v.slice(4,6))-1,Number(v.slice(6,8)));
  const match = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!match) return null;
  const [,y,m,d,h,min,s='0',z] = match;
  return z ? new Date(Date.UTC(+y,+m-1,+d,+h,+min,+s)) : new Date(+y,+m-1,+d,+h,+min,+s);
}
function unescapeICS(value) { return value.replace(/\\n/gi,' ').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\'); }

function toast(message) {
  els.toast.textContent = message; els.toast.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(()=>els.toast.classList.remove('show'),2200);
}
function escapeHTML(value) { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }

// Navegación
document.addEventListener('click', event => {
  const routeBtn = event.target.closest('[data-route]');
  if (routeBtn) { state.route = routeBtn.dataset.route; closeSmartResults(); render(); return; }

  const openTask = event.target.closest('[data-open-task]');
  if (openTask) { openTaskActions(openTask.dataset.openTask); return; }

  const action = event.target.closest('[data-action]');
  if (action) {
    const { action:kind, id } = action.dataset;
    if (kind === 'complete') { closeActionModal(); completeTask(id); }
    if (kind === 'snooze') openSnooze(id);
    if (kind === 'split') openSplit(id);
    if (kind === 'archive') archiveTask(id);
    return;
  }

  const close = event.target.closest('[data-close-dialog]');
  if (close) { document.getElementById(close.dataset.closeDialog)?.close(); return; }
  if (event.target.closest('[data-close-action]')) { closeActionModal(); return; }

  const snooze = event.target.closest('[data-snooze-choice]');
  if (snooze) {
    const task = state.tasks.find(t=>t.id===snooze.dataset.id); if (!task) return;
    if (snooze.dataset.snoozeChoice === 'tomorrow') applySnooze(task.id, addDays(todayISO(),1));
    if (snooze.dataset.snoozeChoice === 'gap') applySnooze(task.id, findNextGap(task));
    if (snooze.dataset.snoozeChoice === 'date') showDatePickerForSnooze(task.id);
    return;
  }

  const customSnooze = event.target.closest('[data-confirm-custom-snooze]');
  if (customSnooze) { const date = document.getElementById('customSnoozeDate')?.value; if (date) applySnooze(customSnooze.dataset.confirmCustomSnooze,date); return; }

  const split = event.target.closest('[data-confirm-split]');
  if (split) { confirmSplit(split.dataset.confirmSplit); return; }

  if (event.target.closest('[data-confirm-space]')) { confirmMakeSpace(); return; }

  const lower = event.target.closest('[data-intervention="lower"]');
  if (lower) { const task=state.tasks.find(t=>t.id===lower.dataset.id); if(task){task.priority='low';saveAll();closeActionModal();render();toast('Prioridad bajada.');} return; }

  const dayClose = event.target.closest('[data-day-close]');
  if (dayClose) { applyDayClose(dayClose.dataset.dayClose); return; }
});

document.querySelectorAll('[data-task-filter]').forEach(btn => btn.addEventListener('click',() => {
  state.taskFilter = btn.dataset.taskFilter;
  document.querySelectorAll('[data-task-filter]').forEach(b=>b.classList.toggle('active',b===btn));
  renderCategory();
}));

document.getElementById('openTaskModal').addEventListener('click',()=>openTaskModal({focusQuick:true}));
document.getElementById('openCalendar').addEventListener('click',()=>{state.route='calendar';render();});
document.getElementById('openSettings').addEventListener('click',openSettings);
document.getElementById('openSettingsTop').addEventListener('click',openSettings);
document.getElementById('calendarContextCard').addEventListener('click',openSettings);
document.getElementById('calendarContextCard').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')openSettings();});
document.getElementById('parseQuickTask').addEventListener('click',applyParsedTask);
els.quickTaskInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyParsedTask();}});
els.taskScheduledDate.addEventListener('change',updateCapacityPreview);
els.taskDuration.addEventListener('change',updateCapacityPreview);
document.getElementById('makeSpaceBtn').addEventListener('click',openMakeSpace);
document.getElementById('closeDayBtn').addEventListener('click',openDayClose);
document.getElementById('closeSmartResults').addEventListener('click',closeSmartResults);
document.querySelectorAll('.time-chip[data-minutes]').forEach(btn => btn.addEventListener('click',()=>showQuickTime(Number(btn.dataset.minutes))));
document.getElementById('lowEnergyBtn').addEventListener('click',showLowEnergy);

document.getElementById('calendarPrev').addEventListener('click',()=>{state.calendarCursor=new Date(state.calendarCursor.getFullYear(),state.calendarCursor.getMonth()-1,1);renderCalendar();});
document.getElementById('calendarNext').addEventListener('click',()=>{state.calendarCursor=new Date(state.calendarCursor.getFullYear(),state.calendarCursor.getMonth()+1,1);renderCalendar();});
document.getElementById('calendarToday').addEventListener('click',()=>{state.calendarCursor=startOfMonth(new Date());renderCalendar();});

els.taskForm.addEventListener('submit', event => {
  event.preventDefault();
  const title = els.taskTitle.value.trim(); if (!title) return;
  const task = createTask({
    title,
    category: els.taskCategory.value,
    priority: els.taskPriority.value,
    energy: els.taskEnergy.value,
    scheduledDate: els.taskScheduledDate.value,
    scheduledTime: els.taskScheduledTime.value,
    deadline: els.taskDeadline.value,
    duration: Number(els.taskDuration.value),
    recurrence: els.taskRecurrence.value
  });
  state.tasks.push(task); saveAll(); els.taskModal.close(); render();
  const load = task.scheduledDate ? getDayLoad(task.scheduledDate) : null;
  toast(load && load.percent > 100 ? `Guardada · ese día queda al ${load.percent}%` : 'Tarea guardada.');
});

els.settingsForm.addEventListener('submit', event => {
  event.preventDefault();
  state.settings.name = els.settingsName.value.trim() || 'Angel';
  state.settings.dailyCapacity = Number(els.settingsCapacity.value || 450);
  saveAll(); els.settingsModal.close(); render(); toast('Ajustes guardados.');
});

document.getElementById('googleSyncBtn').addEventListener('click',syncGoogleCalendar);
document.getElementById('appleExportBtn').addEventListener('click',exportAppleICS);
document.getElementById('icsImportBtn').addEventListener('click',()=>els.icsFileInput.click());
els.icsFileInput.addEventListener('change',async()=>{const file=els.icsFileInput.files?.[0]; if(file) await importICS(file); els.icsFileInput.value='';});

render();
