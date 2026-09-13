import type { FoodItem, MealEntry } from "@/types/domain";
import { apiRequest } from "@/services/api-client";

export interface DiarySummary { calories: number; protein: number; carbs: number; fat: number }
export interface DiaryData { entries: MealEntry[]; summary: DiarySummary }
export type EntryPayload = Omit<MealEntry, "id" | "profileId" | "createdAt">;

export function listFoods(token: string, snack?: boolean) {
  const suffix = snack === undefined ? "" : `?snack=${snack}`;
  return apiRequest<{ foods: FoodItem[] }>(`/foods${suffix}`, {}, token);
}
export function getDiary(token: string, profileId: string, date: string) { return apiRequest<DiaryData>(`/diaries/${profileId}?date=${date}`, {}, token); }
export function addEntry(token: string, profileId: string, entry: EntryPayload) { return apiRequest<{ entry: MealEntry }>(`/diaries/${profileId}/entries`, { method: "POST", body: JSON.stringify(entry) }, token); }
export function parseEntries(token: string, profileId: string, payload: { date: string; mealType: MealEntry["mealType"]; text: string }) { return apiRequest<{ accepted: MealEntry[]; rejected: string[] }>(`/diaries/${profileId}/parse-text`, { method: "POST", body: JSON.stringify(payload) }, token); }
export function deleteEntry(token: string, profileId: string, entryId: string) { return apiRequest<void>(`/diaries/${profileId}/entries/${entryId}`, { method: "DELETE" }, token); }

export interface NutritionPer100g { caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number }
export interface RecognizedFood { name: string; food: FoodItem | null; estimate: NutritionPer100g | null }
export function recognizeFoods(token: string, imageBase64: string, mimeType: string) { return apiRequest<{ items: RecognizedFood[] }>(`/vision/recognize`, { method: "POST", body: JSON.stringify({ imageBase64, mimeType }) }, token); }
