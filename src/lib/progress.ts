import type { Course, Lesson, ProgressMap } from '../types';
import { useSyncExternalStore } from 'react';
import { flattenLessons } from './utils';

const KEY = 'vcp:progress:v1';
const COMPLETE_RATIO = 0.9;

function loadStore(): ProgressMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressMap;
  } catch {
    return {};
  }
}

let store: ProgressMap = loadStore();
let version = 0;
const listeners = new Set<() => void>();

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
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

function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useProgressStore(): ProgressMap {
  useSyncExternalStore(subscribeProgress, () => version);
  return store;
}

export function recordWatch(lessonId: string, position: number, duration: number): void {
  if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return;
  const prev = store[lessonId];
  const furthest = Math.max(prev?.furthest ?? 0, position);
  const watchedRatio = Math.min(1, furthest / duration);
  store[lessonId] = {
    position,
    duration,
    furthest,
    watchedRatio,
    completed: prev?.completed ?? watchedRatio >= COMPLETE_RATIO,
    lastWatchedAt: Date.now(),
  };
  persist();
  emit();
}

export function markLessonCompleted(lessonId: string): void {
  const prev = store[lessonId];
  if (prev?.completed) return;
  store[lessonId] = {
    position: prev?.position ?? 0,
    duration: prev?.duration ?? 0,
    furthest: prev?.furthest ?? 0,
    watchedRatio: prev?.watchedRatio ?? 1,
    completed: true,
    lastWatchedAt: Date.now(),
  };
  persist();
  emit();
}

export function resetAllProgress(): void {
  store = {};
  persist();
  emit();
}

export function getCourseStats(
  progress: ProgressMap,
  course: Course,
): { total: number; completed: number; ratio: number; lastLesson: Lesson | null } {
  const lessons = flattenLessons(course.root);
  let completed = 0;
  let lastLesson: Lesson | null = null;
  let lastAt = -Infinity;
  for (const lesson of lessons) {
    const entry = progress[lesson.id];
    if (entry?.completed) completed += 1;
    if (entry && entry.lastWatchedAt > lastAt) {
      lastAt = entry.lastWatchedAt;
      lastLesson = lesson;
    }
  }
  const total = lessons.length;
  const ratio = total === 0 ? 0 : completed / total;
  return { total, completed, ratio, lastLesson };
}

export function getContinueLesson(progress: ProgressMap, course: Course): Lesson | null {
  const lessons = flattenLessons(course.root);
  if (lessons.length === 0) return null;
  let lastIdx = -1;
  let lastAt = -Infinity;
  for (let i = 0; i < lessons.length; i += 1) {
    const entry = progress[lessons[i].id];
    if (entry && entry.lastWatchedAt > lastAt) {
      lastAt = entry.lastWatchedAt;
      lastIdx = i;
    }
  }
  if (lastIdx >= 0 && !progress[lessons[lastIdx].id]?.completed) {
    return lessons[lastIdx];
  }
  const order =
    lastIdx >= 0 ? [...lessons.slice(lastIdx + 1), ...lessons.slice(0, lastIdx + 1)] : lessons;
  return order.find((lesson) => !progress[lesson.id]?.completed) ?? lessons[0];
}
