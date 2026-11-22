import type { Lesson, SectionNode } from '../types';

export const VIDEO_EXTENSIONS: Set<string> = new Set(['mp4', 'webm', 'ogv', 'ogg', 'mov', 'mkv', 'm4v']);

export function fileExt(name: string): string {
  const i = name.lastIndexOf('.');
  if (i === -1) return '';
  return name.slice(i + 1).toLowerCase();
}

export function isVideoFile(name: string): boolean {
  return VIDEO_EXTENSIONS.has(fileExt(name));
}

export function stripExt(name: string): string {
  const i = name.lastIndexOf('.');
  if (i <= 0) return name;
  return name.slice(0, i);
}

export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = s < 10 ? `0${s}` : `${s}`;
  if (h > 0) {
    const mm = m < 10 ? `0${m}` : `${m}`;
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
}

export function joinPath(...parts: Array<string | undefined>): string {
  return parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join('/');
}

export function basename(path: string): string {
  const i = path.lastIndexOf('/');
  if (i === -1) return path;
  return path.slice(i + 1);
}

export function dirname(path: string): string {
  const i = path.lastIndexOf('/');
  if (i === -1) return '';
  return path.slice(0, i);
}

export function countLessons(node: SectionNode): number {
  let total = node.lessons.length;
  for (const child of node.children) {
    total += countLessons(child);
  }
  return total;
}

export function flattenLessons(node: SectionNode): Lesson[] {
  const out: Lesson[] = [...node.lessons];
  for (const child of node.children) {
    out.push(...flattenLessons(child));
  }
  return out;
}
