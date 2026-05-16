import { randomUUID } from 'crypto';
import { ObjectId } from 'mongodb';

// ── Pre-generated IDs (shared across all services) ─────────────────────────

export const USER_COUNT = 50;
export const MAJOR_COUNT = 6;
export const COURSE_COUNT = 45;
export const CAREER_COUNT = 8;
export const SKILL_COUNT = 30;
export const RESOURCE_COUNT = 200;
export const TUTORIAL_COUNT = 150;
export const RES_COLLECTION_COUNT = 50;
export const TUT_COLLECTION_COUNT = 30;

const genOids = (n: number) => Array.from({ length: n }, () => new ObjectId());
const genUuids = (n: number) => Array.from({ length: n }, () => randomUUID());

// Mongo ObjectIds
export const majorIds = genOids(MAJOR_COUNT);
export const courseIds = genOids(COURSE_COUNT);
export const careerIds = genOids(CAREER_COUNT);
export const skillIds = genOids(SKILL_COUNT);
export const resourceIds = genOids(RESOURCE_COUNT);
export const tutorialIds = genOids(TUTORIAL_COUNT);
export const collectionIds = genOids(RES_COLLECTION_COUNT + TUT_COLLECTION_COUNT);

// UUIDs (for Postgres services)
export const authUserIds = genUuids(USER_COUNT);

// Media file UUIDs: 200 for resources + 150 for tutorials
export const mediaFileIds = genUuids(RESOURCE_COUNT + TUTORIAL_COUNT);

// Slug helper
export function slugify(text: string, idx: number): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    idx
  );
}

// Random pick helpers
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
