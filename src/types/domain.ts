export type Sex = "male" | "female";
export type FitnessGoal = "fat_loss" | "muscle_gain" | "maintenance";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export interface LocalUser {
  id: string;
  username: string;
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
  manualTdee?: number | null;
  manualTargetCalories?: number | null;
  manualProtein?: number | null;
  manualCarbs?: number | null;
  manualFat?: number | null;
  updatedAt: string;
}

export interface MealEntry {
  id: string;
  profileId: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  source: "manual" | "text" | "recipe" | "snack" | "photo";
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

export interface RecipeRecord {
  id: string;
  sourcePath: string;
  title: string;
  category: string;
  markdown: string;
  imagePath?: string;
}
