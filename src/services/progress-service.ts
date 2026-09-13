import { apiRequest } from "@/services/api-client";

export function getTrends(token: string, profileId: string) {
  return apiRequest<{ weights: Array<{ date: string; weightKg: number }>; calories: Array<{ date: string; calories: number }> }>(`/trends/${profileId}`, {}, token);
}
