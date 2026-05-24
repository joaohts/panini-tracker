// Same-origin client for the in-app collection backend (/api/*).
// Auth is an httpOnly "session" cookie set by the auth routes, so we just send
// credentials and never touch a token.
import type { CollectionEntry } from "./types";

export interface User {
  id: string;
  username: string;
  displayName: string;
}

export interface CollectionResponse {
  entries: CollectionEntry[];
  serverTime: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: init?.body
      ? { "Content-Type": "application/json", ...init?.headers }
      : init?.headers,
    ...init,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  me: () => req<{ user: User }>("/api/auth/me"),
  login: (username: string, password: string) =>
    req<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  register: (
    username: string,
    displayName: string,
    password: string,
    inviteCode: string,
  ) =>
    req<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, displayName, password, inviteCode }),
    }),
  logout: () => req<void>("/api/auth/logout", { method: "POST" }),
  getCollection: () => req<CollectionResponse>("/api/collection"),
  patchCollection: (entries: CollectionEntry[]) =>
    req<CollectionResponse>("/api/collection", {
      method: "PATCH",
      body: JSON.stringify({ entries }),
    }),
};
