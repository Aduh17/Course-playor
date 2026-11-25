import { useSyncExternalStore } from 'react';
import type { LibrarySource } from './fs';

const KEY = 'vcp:durations:v1';
const MAX_CONCURRENT = 3;
const TIMEOUT_MS = 20000;

function loadDurations(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        out[id] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

let durations: Record<string, number> = loadDurations();
let version = 0;
let source: LibrarySource | null = null;
const listeners = new Set<() => void>();
const queue: string[] = [];
const queued = new Set<string>();
let active = 0;

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(durations));
  } catch {
    void 0;
  }
}

function emit(): void {
  version += 1;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDurationStore(): Record<string, number> {
  useSyncExternalStore(subscribe, () => version);
  return durations;
}

function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let settled = false;

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };

    const timer = window.setTimeout(() => finish(null), TIMEOUT_MS);
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => {
      const value = video.duration;
      finish(Number.isFinite(value) && value > 0 ? value : null);
    };
    video.onerror = () => finish(null);
    video.src = url;
  });
}

async function probe(id: string): Promise<void> {
  const src = source;
  if (!src) return;
  try {
    const file = await src.getLessonFile(id);
    if (src !== source) return;
    const value = await readDuration(file);
    if (value === null || src !== source) return;
    durations = { ...durations, [id]: value };
    persist();
    emit();
  } catch {
    void 0;
  }
}

function pump(): void {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const id = queue.shift();
    if (!id) break;
    queued.delete(id);
    if (durations[id] !== undefined) continue;
    const src = source;
    if (!src) break;
    active += 1;
    void probe(id).finally(() => {
      active -= 1;
      pump();
    });
  }
}

export function ensureLessonDurations(src: LibrarySource, lessonIds: string[]): void {
  source = src;
  for (const id of lessonIds) {
    if (durations[id] !== undefined || queued.has(id)) continue;
    queued.add(id);
    queue.push(id);
  }
  pump();
}
