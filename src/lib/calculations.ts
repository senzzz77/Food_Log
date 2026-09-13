import { ACTIVITY_OPTIONS } from "@/lib/constants";
import type { BodyProfile } from "@/types/domain";

export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
}

export interface MetabolicResult {
  bmr: number;
  tdee: number;
  targetCalories: { low: number; high: number; midpoint: number };
  macros: MacroTargets;
}

const round = (value: number) => Math.round(value);

/**
 * Mifflin-St Jeor equation (Mifflin et al., 1990).
 * BMR male = 10W + 6.25H - 5A + 5; female = 10W + 6.25H - 5A - 161.
 */
export function calculateBmr({ weightKg, heightCm, age, sex }: BodyProfile): number {
  const sexAdjustment = sex === "male" ? 5 : -161;
  return round(10 * weightKg + 6.25 * heightCm - 5 * age + sexAdjustment);
}

/**
 * 推荐三大营养素（克），基于目标热量与体重。
 * 蛋白质按体重系数，脂肪占目标热量 25%，碳水补齐剩余热量。
 */
export function calculateRecommendedMacros(profile: BodyProfile, targetCalories: number): MacroTargets {
  const proteinPerKg = profile.goal === "fat_loss" ? 2.2 : profile.goal === "muscle_gain" ? 1.8 : 1.6;
  const protein = round(profile.weightKg * proteinPerKg);
  const fat = round((targetCalories * 0.25) / 9);
  const carbs = round(Math.max(0, (targetCalories - protein * 4 - fat * 9) / 4));
  return { protein, carbs, fat };
}

function targetRange(midpoint: number, goal: BodyProfile["goal"]) {
  const [lowRatio, highRatio] = goal === "fat_loss" ? [0.93, 1.07] : goal === "muscle_gain" ? [0.94, 1.06] : [0.95, 1.05];
  return { low: round(midpoint * lowRatio), high: round(midpoint * highRatio), midpoint };
}

export function calculateMetabolism(profile: BodyProfile): MetabolicResult {
  const bmr = calculateBmr(profile);
  const factor = ACTIVITY_OPTIONS.find((option) => option.value === profile.activityLevel)?.factor ?? 1.2;
  const computedTdee = round(bmr * factor);
  const weeklyEnergyChange = (profile.weeklyRateKg * 7700) / 7;

  let recommendedMidpoint: number;
  if (profile.goal === "fat_loss") {
    const deficit = Math.min(1000, Math.max(250, weeklyEnergyChange));
    recommendedMidpoint = round(Math.max(bmr, computedTdee - deficit));
  } else if (profile.goal === "muscle_gain") {
    const surplus = Math.min(400, Math.max(120, weeklyEnergyChange));
    recommendedMidpoint = round(computedTdee + surplus);
  } else {
    recommendedMidpoint = computedTdee;
  }

  // 手动覆盖优先，未设置时回退到推荐值
  const tdee = profile.manualTdee ?? computedTdee;
  const midpoint = profile.manualTargetCalories ?? recommendedMidpoint;
  const recommendedMacros = calculateRecommendedMacros(profile, midpoint);
  const macros: MacroTargets = {
    protein: profile.manualProtein ?? recommendedMacros.protein,
    carbs: profile.manualCarbs ?? recommendedMacros.carbs,
    fat: profile.manualFat ?? recommendedMacros.fat,
  };

  return { bmr, tdee, targetCalories: targetRange(midpoint, profile.goal), macros };
}
