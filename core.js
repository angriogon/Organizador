'use strict';

/* OPI Core · v6.0
   Shared data contract and deterministic utilities. This file intentionally has
   no UI or Firebase dependencies so it can be regression-tested in isolation. */

const STORAGE_KEY = 'opi_tasks_v2';
const LEGACY_STORAGE_KEY = 'opi_tasks_v1';
const SETTINGS_KEY = 'opi_settings_v2';
const EXTERNAL_EVENTS_KEY = 'opi_external_events_v2';
const UI_KEY = 'opi_ui_v3';
const CACHE_VERSION = '6.0.3';
const SYNC_META_KEY = 'opi_sync_meta_v41';
const CLOUD_BACKUP_PREFIX = 'opi_prefirebase_backup_v41_';
const CLOUD_SCHEMA_VERSION = 6;
const DATA_SCHEMA_VERSION = 6;
const DATA_SCHEMA_KEY = 'opi_schema_version';
const LEARNING_KEY = 'opi_learning_v50';
const SECURITY_KEY = 'opi_security_v50';
const FIREBASE_SDK_VERSION = '12.19.0';
const UNDO_TIMEOUT_MS = 5000;
const ACTION_LOCK_MS = 420;
const SEARCH_DEBOUNCE_MS = 140;
const DRAFT_KEY = 'opi_task_draft_v51';
const ERROR_LOG_KEY = 'opi_error_log_v51';

const DEFAULT_SETTINGS = { name: 'Angel', dailyCapacity: 450, haptics: true, weekendMode: true, theme: 'neutral', defaultProfile: 'normal', privacyMode: false, intelligentMode: true, bufferPercent: 15, maxHighPerDay: 2, workFreeWeekend: false, appearance: 'system' };
const DEFAULT_UI = { focus: { date: '', ids: [] }, gestureUses: 0, celebratedDate: '', reminderNotified: {}, tightDayDate: '', dayProfileDate: '', dayProfile: 'normal', activeNowTaskId: '', activeNowStartedAt: '', lastOpenedDate: '', lastOpenedAt: '', recoveryPendingDays: 0, commandKnown: false, planningWeekStart: '', smartList: '', advancedTaskOpen: false, onboardingLevel: 0, lastAutoBackupAt: '', weekendPlanning: { selectedDate: '', active: false }, workFocus: { enabled: false, start: '09:00', end: '17:00', overrideDate: '' }, keyboardShortcutsLocked: false, lowEnergyDate: '', daySignals: {}, dayClosedDate: '' };
const DEFAULT_LEARNING = { durationSamples: [], decisions: [], completionHours: {}, lastInsightAt: '', categoryHints: {}, contextStats: {}, weeklySnapshots: [], pauseReasons: {}, taskTemplates: {}, correctionHints: {}, actualSessions: [], adaptationEvents: [] };
const DEFAULT_SECURITY = { enabled: false, pinHash: '', biometricCredentialId: '' };
const CATEGORY_LABELS = { work: 'Trabajo', personal: 'Vida personal / vivienda', study: 'Estudios' };
const CATEGORY_SHORT = { work: 'Trabajo', personal: 'Personal', study: 'Estudios' };
const PRIORITY_LABELS = { low: 'Baja', medium: 'Media', high: 'Alta' };
const ENERGY_LABELS = { low: 'Baja', normal: 'Normal', high: 'Alta' };

function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function todayISO() { return toISO(new Date()); }
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function parseISODate(iso) { if (!iso) return null; const [y,m,d] = iso.split('-').map(Number); return new Date(y,m-1,d); }
function addDays(iso,n) { const d = parseISODate(iso || todayISO()); d.setDate(d.getDate()+n); return toISO(d); }
function addMonths(iso,n) {
  const source=parseISODate(iso || todayISO());
  const day=source.getDate();
  const target=new Date(source.getFullYear(),source.getMonth()+Number(n||0),1);
  const lastDay=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();
  target.setDate(Math.min(day,lastDay));
  return toISO(target);
}
function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function formatMinutes(minutes) {
  if (minutes === null || minutes === '' || minutes === undefined || !Number.isFinite(Number(minutes))) return 'Sin estimar';
  const m = Math.max(0,Math.round(Number(minutes)));
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
function parseTimeMinutes(time) { if (!time || !/^\d{2}:\d{2}$/.test(time)) return null; const [h,m]=time.split(':').map(Number); return h*60+m; }
function minutesToTime(value) { const n=Math.max(0,Math.min(1439,Math.round(value))); return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; }
