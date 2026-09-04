"use client";

export function getOrCreateSessionId(merchantSlug: string): string {
  const key = `amc_session_${merchantSlug}`;
  let id = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (!id) {
    id = `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    if (typeof window !== "undefined") localStorage.setItem(key, id);
  }
  return id;
}
