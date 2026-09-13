import { request } from '@/services/request';
import type {
  AuthSession,
  BodyProfile,
  DiaryData,
  EntryPayload,
  FoodItem,
  LocalUser,
  MealEntry,
  MyFood,
  Profile,
  RecognizedFood,
} from '@/types/domain';

export function registerUser(username: string, password: string) {
  return request<AuthSession>('/auth/register', { method: 'POST', data: { username, password } });
}

export function loginUser(username: string, password: string) {
  return request<AuthSession>('/auth/login', { method: 'POST', data: { username, password } });
}

export function getCurrentUser() {
  return request<{ user: LocalUser }>('/auth/me');
}

export function listProfiles() {
  return request<{ profiles: Profile[] }>('/profiles');
}

export function createProfile(data: Pick<Profile, 'displayName' | 'accent'>) {
  return request<{ profile: Profile }>('/profiles', { method: 'POST', data });
}

export function loadBodyProfile(profileId: string) {
  return request<{ body: BodyProfile | null }>(`/profiles/${profileId}/body`);
}

export function listFoods(snack?: boolean) {
  const suffix = snack === undefined ? '' : `?snack=${snack}`;
  return request<{ foods: FoodItem[] }>(`/foods${suffix}`);
}

export function listMyFoods() {
  return request<{ foods: MyFood[] }>('/foods/mine');
}

export function saveMyFood(data: Pick<MyFood, 'name' | 'caloriesPer100g' | 'proteinPer100g' | 'carbsPer100g' | 'fatPer100g'>) {
  return request<{ food: MyFood }>('/foods/mine', { method: 'POST', data });
}

export function deleteMyFood(foodId: string) {
  return request<void>(`/foods/mine/${foodId}`, { method: 'DELETE' });
}

export function getDiary(profileId: string, date: string) {
  return request<DiaryData>(`/diaries/${profileId}?date=${date}`);
}

export function addEntry(profileId: string, entry: EntryPayload) {
  return request<{ entry: MealEntry }>(`/diaries/${profileId}/entries`, { method: 'POST', data: entry });
}

export function deleteEntry(profileId: string, entryId: string) {
  return request<void>(`/diaries/${profileId}/entries/${entryId}`, { method: 'DELETE' });
}

export function updateEntry(profileId: string, entryId: string, data: Pick<EntryPayload, 'name' | 'grams' | 'calories' | 'protein' | 'carbs' | 'fat'>) {
  return request<{ entry: MealEntry }>(`/diaries/${profileId}/entries/${entryId}`, { method: 'PATCH', data });
}

export function recognizeFoods(imageBase64: string, mimeType: string) {
  return request<{ items: RecognizedFood[] }>('/vision/recognize', { method: 'POST', data: { imageBase64, mimeType } });
}

export function searchFoods(text: string) {
  return request<{ items: RecognizedFood[] }>('/vision/search', { method: 'POST', data: { text } });
}

export function recognizeNutritionFacts(imageBase64: string, mimeType: string) {
  return request<{ items: RecognizedFood[] }>('/vision/recognize-nutrition', { method: 'POST', data: { imageBase64, mimeType } });
}
