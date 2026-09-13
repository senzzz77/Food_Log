import { ACTIVITY_OPTIONS } from '@/lib/constants';
import type { BodyProfile } from '@/types/domain';

export interface MetabolicResult {
  bmr: number;
  tdee: number;
  targetCalories: { low: number; high: number; midpoint: number };
}

const round = (value: number) => Math.round(value);

/** Mifflin-St Jeor 公式：男性 BMR = 10W + 6.25H - 5A + 5；女性 = 10W + 6.25H - 5A - 161 */
export function calculateBmr({ weightKg, heightCm, age, sex }: BodyProfile): number {
  const sexAdjustment = sex === 'male' ? 5 : -161;
  return round(10 * weightKg + 6.25 * heightCm - 5 * age + sexAdjustment);
}

export function calculateMetabolism(profile: BodyProfile): MetabolicResult {
  const bmr = calculateBmr(profile);
  const factor = ACTIVITY_OPTIONS.find((option) => option.value === profile.activityLevel)?.factor ?? 1.2;
  const tdee = round(bmr * factor);
  const weeklyEnergyChange = (profile.weeklyRateKg * 7700) / 7;

  if (profile.goal === 'fat_loss') {
    const deficit = Math.min(1000, Math.max(250, weeklyEnergyChange));
    const midpoint = round(Math.max(bmr, tdee - deficit));
    return { bmr, tdee, targetCalories: { low: round(midpoint * 0.93), high: round(midpoint * 1.07), midpoint } };
  }

  if (profile.goal === 'muscle_gain') {
    const surplus = Math.min(400, Math.max(120, weeklyEnergyChange));
    const midpoint = round(tdee + surplus);
    return { bmr, tdee, targetCalories: { low: round(midpoint * 0.94), high: round(midpoint * 1.06), midpoint } };
  }

  return { bmr, tdee, targetCalories: { low: round(tdee * 0.95), high: round(tdee * 1.05), midpoint: tdee } };
}
