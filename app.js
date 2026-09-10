const STORAGE_KEY = 'opi_tasks_v1';
const DAILY_CAPACITY = 8;

const state = {
  category: 'all',
  view: 'today',
  tasks: loadTasks()
};

const els = {
  currentDate: document.querySelector('#currentDate'),
  taskList: document.querySelector('#taskList'),
  emptyState: document.querySelector('#emptyState'),
  todayCount: document.querySelector('#todayCount'),
  loadPercent: document.querySelector('#loadPercent'),
  loadBar: document.querySelector('#loadBar'),
  loadLabel: document.querySelector('#loadLabel'),
  loadHint: document.querySelector('#loadHint'),
  nextDeadline: document.querySelector('#nextDeadline'),
  nextDeadlineTitle: document.querySelector('#nextDeadlineTitle'),
  viewTitle: document.querySelector('#viewTitle'),
  focusNote: document.querySelector('#focusNote'),
  modal: document.querySelector('#taskModal'),
  form: document.querySelector('#taskForm'),
  taskTitle: document.querySelector('#taskTitle'),
  taskCategory: document.querySelector('#taskCategory'),
  taskPriority: document.querySelector('#taskPriority'),
  taskDueDate: document.querySelector('#taskDueDate'),
  taskEffort: document.querySelector('#taskEffort'),
  taskRecurrence: document.querySelector('#taskRecurrence')
};

const categoryLabels = {
  personal: 'Personal',
  work: 'Trabajo',
  study: 'Estudios'
};

const priorityLabels = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja'
};

const recurrenceLabels = {
  daily: 'Diaria',
  weekly: 'Semanal',
  monthly: 'Mensual'
};

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (_) {}

  return [
    createTask({ title: 'Revisar prioridades del día', category: 'work', priority: 'high', dueDate: todayISO(), effort: 2, recurrence: 'daily' }),
    createTask({ title: '30 minutos de estudio sin distracciones', category: 'study', priority: 'medium', dueDate: todayISO(), effort: 2, recurrence: 'daily' }),
    createTask({ title: 'Comprar lo necesario para casa', category: 'personal', priority: 'low', dueDate: addDays(todayISO(), 1), effort: 1, recurrence: 'none' })
  ];
}

function createTask(data) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    title: data.title.trim(),
    category: data.category,
    priority: data.priority,
    dueDate: data.dueDate || '',
    effort: Number(data.effort || 1),
    recurrence: data.recurrence || 'none',
    createdAt: new Date().toISOString(),
    completedAt: null
  };
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseISODate(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(iso, amount) {
  const date = parseISODate(iso || todayISO());
  date.setDate(date.getDate() + amount);
  return toISO(date);
}

function addMonths(iso, amount) {
  const date = parseISODate(iso || todayISO());
  date.setMonth(date.getMonth() + amount);
  return toISO(date);
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isToday(date) { return date === todayISO(); }
function isOverdue(date) { return Boolean(date && date < todayISO()); }
function isUpcoming(date) { return Boolean(date && date > todayISO()); }

function formatDate(iso) {
  if (!iso) return 'Sin fecha';
  if (isToday(iso)) return 'Hoy';
  if (iso === addDays(todayISO(), 1)) return 'Mañana';
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(parseISODate(iso));
}

function scoreTask(task) {
  let score = 0;
  if (isOverdue(task.dueDate)) score += 100;
  if (isToday(task.dueDate)) score += 50;
  if (task.priority === 'high') score += 30;
  if (task.priority === 'medium') score += 15;
  if (!task.dueDate) score -= 5;
  return score;
}

function getVisibleTasks() {
  let tasks = state.tasks.filter(t => !t.completedAt);

  if (state.category !== 'all') {
    tasks = tasks.filter(t => t.category === state.category);
  }

  if (state.view === 'today') {
    tasks = tasks.filter(t => isOverdue(t.dueDate) || isToday(t.dueDate) || (t.priority === 'high' && !t.dueDate));
  } else if (state.view === 'upcoming') {
    tasks = tasks.filter(t => isUpcoming(t.dueDate));
  }

  return tasks.sort((a, b) => {
    const scoreDiff = scoreTask(b) - scoreTask(a);
    if (scoreDiff !== 0) return scoreDiff;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

function render() {
  renderHeaderDate();
  renderSummary();
  renderTasks();
  updateControls();
}

function renderHeaderDate() {
  els.currentDate.textContent = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(new Date());
}

function renderSummary() {
  const openTasks = state.tasks.filter(t => !t.completedAt);
  const todayTasks = openTasks.filter(t => isOverdue(t.dueDate) || isToday(t.dueDate));
  els.todayCount.textContent = todayTasks.length;

  const effort = todayTasks.reduce((sum, t) => sum + Number(t.effort || 1), 0);
  const percent = Math.min(100, Math.round((effort / DAILY_CAPACITY) * 100));
  els.loadPercent.textContent = `${percent}%`;
  els.loadBar.style.width = `${percent}%`;

  if (effort <= 3) {
    els.loadLabel.textContent = 'Ligera';
    els.loadHint.textContent = 'Tienes margen para añadir algo más.';
  } else if (effort <= 6) {
    els.loadLabel.textContent = 'Equilibrada';
    els.loadHint.textContent = 'Un día asumible si proteges tus prioridades.';
  } else if (effort <= 8) {
    els.loadLabel.textContent = 'Alta';
    els.loadHint.textContent = 'Tu día ya está bastante lleno. Mejor no añadir demasiado.';
  } else {
    els.loadLabel.textContent = 'Sobrecargada';
    els.loadHint.textContent = 'Hay más carga de la recomendable. Aplazar algo puede ayudarte.';
  }

  const dated = openTasks.filter(t => t.dueDate).sort((a,b) => a.dueDate.localeCompare(b.dueDate));
  const next = dated[0];
  if (next) {
    els.nextDeadline.textContent = formatDate(next.dueDate);
    els.nextDeadlineTitle.textContent = next.title;
  } else {
    els.nextDeadline.textContent = 'Sin fechas';
    els.nextDeadlineTitle.textContent = 'Nada urgente por ahora';
  }
}

function renderTasks() {
  const tasks = getVisibleTasks();
  els.taskList.innerHTML = '';
  els.emptyState.hidden = tasks.length > 0;

  tasks.forEach(task => {
    const item = document.createElement('article');
    item.className = `task-item${isOverdue(task.dueDate) ? ' overdue' : ''}`;
    item.innerHTML = `
      <button class="check-btn" data-action="complete" data-id="${task.id}" aria-label="Completar tarea"></button>
      <div class="task-main">
        <div class="task-title-row">
          <h3 class="task-title">${escapeHTML(task.title)}</h3>
          <span class="chip ${task.category}">${categoryLabels[task.category]}</span>
          <span class="chip priority-${task.priority}">${priorityLabels[task.priority]}</span>
        </div>
        <div class="task-meta">
          <span>${task.dueDate ? `◷ ${isOverdue(task.dueDate) ? 'Vencida · ' : ''}${formatDate(task.dueDate)}` : '◷ Sin fecha'}</span>
          <span>◌ Carga ${task.effort}/3</span>
          ${task.recurrence !== 'none' ? `<span>↻ ${recurrenceLabels[task.recurrence]}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action" data-action="snooze" data-id="${task.id}">Aplazar +1 día</button>
        <button class="task-action delete" data-action="delete" data-id="${task.id}" aria-label="Eliminar">Eliminar</button>
      </div>
    `;
    els.taskList.appendChild(item);
  });
}

function updateControls() {
  document.querySelectorAll('.menu-bubble').forEach(btn => btn.classList.toggle('active', btn.dataset.category === state.category));
  document.querySelectorAll('.segment').forEach(btn => btn.classList.toggle('active', btn.dataset.view === state.view));

  const titleMap = { today: 'Hoy', upcoming: 'Próximas', all: 'Todas las tareas' };
  els.viewTitle.textContent = titleMap[state.view];
  els.focusNote.style.display = state.view === 'today' ? 'flex' : 'none';
}

function advanceRecurrence(task) {
  if (task.recurrence === 'none') return;
  const base = task.dueDate || todayISO();
  let nextDate = base;
  if (task.recurrence === 'daily') nextDate = addDays(base, 1);
  if (task.recurrence === 'weekly') nextDate = addDays(base, 7);
  if (task.recurrence === 'monthly') nextDate = addMonths(base, 1);

  state.tasks.push(createTask({
    title: task.title,
    category: task.category,
    priority: task.priority,
    dueDate: nextDate,
    effort: task.effort,
    recurrence: task.recurrence
  }));
}

function escapeHTML(value) {
  return value.replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}

document.querySelectorAll('.menu-bubble').forEach(btn => {
  btn.addEventListener('click', () => {
    state.category = btn.dataset.category;
    render();
  });
});

document.querySelectorAll('.segment').forEach(btn => {
  btn.addEventListener('click', () => {
    state.view = btn.dataset.view;
    render();
  });
});

document.querySelector('#openTaskModal').addEventListener('click', () => {
  els.taskDueDate.value = todayISO();
  els.modal.showModal();
  setTimeout(() => els.taskTitle.focus(), 50);
});

document.querySelector('#closeTaskModal').addEventListener('click', () => els.modal.close());
document.querySelector('#cancelTask').addEventListener('click', () => els.modal.close());

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const task = createTask({
    title: els.taskTitle.value,
    category: els.taskCategory.value,
    priority: els.taskPriority.value,
    dueDate: els.taskDueDate.value,
    effort: els.taskEffort.value,
    recurrence: els.taskRecurrence.value
  });
  state.tasks.push(task);
  saveTasks();
  els.form.reset();
  els.modal.close();
  render();
});

els.taskList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const task = state.tasks.find(t => t.id === button.dataset.id);
  if (!task) return;

  if (button.dataset.action === 'complete') {
    task.completedAt = new Date().toISOString();
    advanceRecurrence(task);
  }

  if (button.dataset.action === 'snooze') {
    task.dueDate = addDays(task.dueDate || todayISO(), 1);
  }

  if (button.dataset.action === 'delete') {
    state.tasks = state.tasks.filter(t => t.id !== task.id);
  }

  saveTasks();
  render();
});

render();
