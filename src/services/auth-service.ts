import type { LocalUser } from "@/types/domain";
import { apiRequest } from "@/services/api-client";

export interface AuthSession {
  token: string;
  user: LocalUser;
}

export function registerUser(username: string, password: string) {
  return apiRequest<AuthSession>("/auth/register", { method: "POST", body: JSON.stringify({ username, password }) });
}

export function loginUser(username: string, password: string) {
  return apiRequest<AuthSession>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
}

export function getCurrentUser(token: string) {
  return apiRequest<{ user: AuthSession["user"] }>("/auth/me", {}, token);
}
