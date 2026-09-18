import type { MealEntry, UserRole } from "@/types/domain";
import { apiRequest } from "@/services/api-client";

export interface AdminUser {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
  profileCount: number | string;
}

export interface AdminProfile {
  id: string;
  displayName: string;
  accent: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFood {
  id: string;
  name: string;
  category: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  isSnack: number | boolean;
  isActive: number | boolean;
}

export interface FoodInput {
  name: string;
  category: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  isSnack: boolean;
  isActive: boolean;
}

export interface AdminVisionKey {
  id: string;
  label: string;
  model: string;
  baseUrl: string;
  isActive: number | boolean;
  apiKeyMasked: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisionKeyInput {
  label: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface AdminBodyProfile {
  heightCm: number;
  weightKg: number;
  age: number;
  sex: "male" | "female";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "fat_loss" | "muscle_gain" | "maintenance";
  targetWeightKg: number;
  weeklyRateKg: number;
  manualTdee: number | null;
  manualTargetCalories: number | null;
  manualProtein: number | null;
  manualCarbs: number | null;
  manualFat: number | null;
  updatedAt: string;
}

export interface AdminProfileData {
  profile: AdminProfile & { userId: string; username: string };
  body: AdminBodyProfile | null;
  date: string;
  entries: MealEntry[];
  summary: { calories: number; protein: number; carbs: number; fat: number };
  stats: { mealCount: number; mealDays: number; lastMealDate: string | null; weightCount: number; lastWeightDate: string | null };
  weights: Array<{ date: string; weightKg: number }>;
  calories: Array<{ date: string; calories: number }>;
}

export function listUsers(token: string) {
  return apiRequest<{ users: AdminUser[] }>("/admin/users", {}, token);
}

export function updateUserRole(token: string, userId: string, role: UserRole) {
  return apiRequest<{ userId: string; role: UserRole }>(`/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }, token);
}

export function deleteUser(token: string, userId: string) {
  return apiRequest<void>(`/admin/users/${userId}`, { method: "DELETE" }, token);
}

export function listUserProfiles(token: string, userId: string) {
  return apiRequest<{ profiles: AdminProfile[] }>(`/admin/users/${userId}/profiles`, {}, token);
}

export function deleteAdminProfile(token: string, profileId: string) {
  return apiRequest<void>(`/admin/profiles/${profileId}`, { method: "DELETE" }, token);
}

export function getAdminProfileData(token: string, profileId: string, date: string) {
  return apiRequest<AdminProfileData>(`/admin/profiles/${profileId}/data?date=${date}`, {}, token);
}

export function listAdminFoods(token: string, query: string) {
  const suffix = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : "";
  return apiRequest<{ foods: AdminFood[]; total: number }>(`/admin/foods${suffix}`, {}, token);
}

export function createAdminFood(token: string, input: FoodInput) {
  return apiRequest<{ food: AdminFood }>("/admin/foods", { method: "POST", body: JSON.stringify(input) }, token);
}

export function updateAdminFood(token: string, foodId: string, patch: Partial<FoodInput>) {
  return apiRequest<{ foodId: string }>(`/admin/foods/${foodId}`, { method: "PATCH", body: JSON.stringify(patch) }, token);
}

export function deleteAdminFood(token: string, foodId: string) {
  return apiRequest<void>(`/admin/foods/${foodId}`, { method: "DELETE" }, token);
}

export function listVisionKeys(token: string) {
  return apiRequest<{ keys: AdminVisionKey[] }>("/admin/vision-keys", {}, token);
}

export function createVisionKey(token: string, input: VisionKeyInput) {
  return apiRequest<AdminVisionKey>("/admin/vision-keys", { method: "POST", body: JSON.stringify(input) }, token);
}

export function updateVisionKey(token: string, keyId: string, patch: Partial<VisionKeyInput>) {
  return apiRequest<{ keyId: string }>(`/admin/vision-keys/${keyId}`, { method: "PATCH", body: JSON.stringify(patch) }, token);
}

export function activateVisionKey(token: string, keyId: string) {
  return apiRequest<{ keyId: string }>(`/admin/vision-keys/${keyId}/activate`, { method: "POST" }, token);
}

export function deleteVisionKey(token: string, keyId: string) {
  return apiRequest<void>(`/admin/vision-keys/${keyId}`, { method: "DELETE" }, token);
}
