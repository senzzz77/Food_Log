import type { ActivityLevel, FitnessGoal } from "@/types/domain";

export const ACTIVITY_OPTIONS: Array<{ value: ActivityLevel; label: string; factor: number; description: string }> = [
  { value: "sedentary", label: "久坐", factor: 1.2, description: "很少运动或长期伏案" },
  { value: "light", label: "轻度活动", factor: 1.375, description: "每周运动 1-3 天" },
  { value: "moderate", label: "中度活动", factor: 1.55, description: "每周运动 3-5 天" },
  { value: "active", label: "高活动", factor: 1.725, description: "每周高强度训练 6-7 天" },
  { value: "very_active", label: "极高活动", factor: 1.9, description: "体力劳动或双训" },
];

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  fat_loss: "减脂",
  muscle_gain: "增肌",
  maintenance: "维持",
};

export const PROFILE_ACCENTS = ["#5f7d6d", "#b06b4f", "#657d9b", "#8d7a59", "#886d84"];
