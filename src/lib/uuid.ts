/**
 * Utility functions for validating, generating, and mapping UUIDs
 * across Supabase PostgreSQL and local storage.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  return UUID_REGEX.test(str.trim());
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Maps known demo non-UUID identifiers to standard Supabase seed UUIDs.
 */
export const DEMO_UUID_MAP: Record<string, string> = {
  'faculty-demo-001': 'a0000000-0000-0000-0000-000000000001',
  'admin-demo-001': 'a0000000-0000-0000-0000-000000000002',
  'cls-aids-001': 'c0000000-0000-0000-0000-000000000001',
  'cls-cse-002': 'c0000000-0000-0000-0000-000000000002'
};

/**
 * Converts any ID to a valid Supabase UUID if possible, or returns null
 * if the ID cannot be safely passed to a PostgreSQL UUID column.
 */
export function toSupabaseUUID(id: string | null | undefined): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (isUUID(trimmed)) return trimmed;
  if (DEMO_UUID_MAP[trimmed]) return DEMO_UUID_MAP[trimmed];
  return null;
}
