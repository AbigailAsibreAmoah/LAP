import { applyPresence, heartbeat, HEARTBEAT_MS, nowIso, resolvePresence, seedPresence, TUTORS, type Booking, type PresenceChange, type PresenceRecord, type ResolvedPresence } from '@laporte/shared';
import { useEffect, useSyncExternalStore } from 'react';
import { detectApi, request } from '../../services/http';

/*
 * Live tutor presence for the whole app. One small store:
 *  - everyone: refreshes every 30 s, and straight away when the tab comes back into view;
 *  - tutors: send a heartbeat every minute saying whether they have been active (pointer, keys,
 *    scroll) in the last few minutes, so the system can show Online / On break / Offline.
 * Server when reachable; otherwise the same shared rules run on a copy kept in this browser
 * (so switching Learner ↔ Tutor in the demo shows the change immediately).
 */

const POLL_MS = 30_000;
const LOCAL_KEY = 'laporte-presence';
let state: { list: ResolvedPresence[]; mine: PresenceRecord | null } = { list: [], mine: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (next: Partial<typeof state>) => { state = { ...state, ...next }; emit(); };

/* ---------- offline copy ---------- */
function loadLocal(): Record<string, PresenceRecord> {
  try { const raw = localStorage.getItem(LOCAL_KEY); if (raw) return JSON.parse(raw); } catch { /* private mode */ }
  return seedPresence(nowIso());
}
function saveLocal(all: Record<string, PresenceRecord>) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); } catch { /* private mode */ }
}
let localBookings: Booking[] = [];
const resolveLocal = (all: Record<string, PresenceRecord>) => TUTORS.map((tu) => resolvePresence(all[tu.id], tu.id, nowIso(), localBookings));
let n = 0;
const localId = (p: string) => `${p}-${Date.now().toString(36)}${(++n).toString(36)}`;

/* ---------- calls ---------- */
export async function refreshPresence(userId?: string, isTutor = false) {
  try {
    if (await detectApi()) {
      const [list, mine] = await Promise.all([
        request<ResolvedPresence[]>('/presence', { userId }),
        isTutor && userId ? request<{ record: PresenceRecord }>('/me/presence', { userId }).then((r) => r.record) : Promise.resolve(null),
      ]);
      set({ list, mine });
      return;
    }
  } catch { /* fall back to the local copy */ }
  const all = loadLocal();
  set({ list: resolveLocal(all), mine: isTutor && userId ? all[userId] ?? { tutorId: userId } : null });
}

export async function changePresence(userId: string, change: PresenceChange) {
  if (await detectApi()) {
    const r = await request<{ record: PresenceRecord; resolved: ResolvedPresence }>('/me/presence', { method: 'PUT', body: change, userId });
    set({ mine: r.record, list: state.list.map((p) => (p.tutorId === userId ? r.resolved : p)) });
    return r.resolved;
  }
  const all = loadLocal();
  all[userId] = applyPresence(all[userId], userId, change, nowIso(), localId); // throws PresenceError on bad input
  saveLocal(all);
  set({ list: resolveLocal(all), mine: all[userId] });
  return state.list.find((p) => p.tutorId === userId)!;
}

async function beat(userId: string, active: boolean) {
  try {
    if (await detectApi()) {
      const resolved = await request<ResolvedPresence>('/me/presence/heartbeat', { method: 'POST', body: { active }, userId });
      set({ list: state.list.map((p) => (p.tutorId === userId ? resolved : p)) });
      return;
    }
  } catch { /* offline: local */ }
  const all = loadLocal();
  all[userId] = heartbeat(all[userId], userId, nowIso(), active);
  saveLocal(all);
  set({ list: resolveLocal(all), mine: all[userId] });
}

/* ---------- hooks ---------- */
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export function usePresenceList() {
  return useSyncExternalStore(subscribe, () => state.list);
}
export function usePresence(tutorId: string | undefined): ResolvedPresence | undefined {
  const list = usePresenceList();
  return tutorId ? list.find((p) => p.tutorId === tutorId) : undefined;
}
export function useMyPresenceRecord() {
  return useSyncExternalStore(subscribe, () => state.mine);
}

/**
 * Mount once (in the app layout). Keeps presence current for everyone, and for a tutor sends the
 * heartbeat that drives the automatic statuses.
 */
export function usePresenceSync(userId: string, role: string, bookings: Booking[]) {
  localBookings = bookings;
  const isTutor = role === 'instructor';
  useEffect(() => {
    let lastInput = Date.now();
    const onInput = () => { lastInput = Date.now(); };
    const refresh = () => { if (document.visibilityState === 'visible') void refreshPresence(userId, isTutor); };
    const sendBeat = () => { if (isTutor) void beat(userId, document.visibilityState === 'visible' && Date.now() - lastInput < 5 * 60_000); };
    const onVisible = () => { if (document.visibilityState === 'visible') { onInput(); sendBeat(); refresh(); } };
    refresh();
    sendBeat();
    const poll = window.setInterval(refresh, POLL_MS);
    const pulse = isTutor ? window.setInterval(sendBeat, HEARTBEAT_MS) : 0;
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    if (isTutor) events.forEach((e) => window.addEventListener(e, onInput, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    // Another tab of the demo changed presence (offline copy): pick it up at once.
    const onStorage = (e: StorageEvent) => { if (e.key === LOCAL_KEY) void refreshPresence(userId, isTutor); };
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(poll);
      if (pulse) window.clearInterval(pulse);
      if (isTutor) events.forEach((e) => window.removeEventListener(e, onInput));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('storage', onStorage);
    };
  }, [userId, isTutor]);
}
