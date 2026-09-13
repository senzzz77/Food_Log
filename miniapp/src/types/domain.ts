export type Sex = 'male' | 'female';
export type FitnessGoal = 'fat_loss' | 'muscle_gain' | 'maintenance';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type EntrySource = 'manual' | 'text' | 'recipe' | 'snack' | 'photo';

export interface LocalUser {
  id: string;
  username: string;
}

export interface AuthSession {
  token: string;
  user: LocalUser;
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  accent: string;
  createdAt: string;
  updatedAt: string;
}

export interface BodyProfile {
  profileId: string;
  userId: string;
  heightCm: number;
  weightKg: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  targetWeightKg: number;
  weeklyRateKg: number;
  updatedAt: string;
}

export interface MealEntry {
  id: string;
  profileId: string;
  date: string;
  mealType: MealType;
  source: EntrySource;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  isSnack: boolean | number;
}

export interface NutritionPer100g {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface MyFood {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface RecognizedFood {
  name: string;
  food: FoodItem | null;
  estimate: NutritionPer100g | null;
}

export interface DiarySummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DiaryData {
  entries: MealEntry[];
  summary: DiarySummary;
}

export interface EntryPayload {
  date: string;
  mealType: MealType;
  source: EntrySource;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
