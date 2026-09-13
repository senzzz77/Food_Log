import type { FoodItem, MealEntry } from "@/types/domain";

export interface PlannedIngredient {
  foodName: string;
  grams: number;
}

export interface PlannedMeal {
  type: Extract<MealEntry["mealType"], "breakfast" | "lunch" | "dinner">;
  recipeTitle: string;
  ingredients: PlannedIngredient[];
}

export interface MealPlanTemplate {
  id: string;
  name: string;
  description: string;
  meals: PlannedMeal[];
}

export interface CalculatedIngredient extends PlannedIngredient {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface CalculatedMeal extends Omit<PlannedMeal, "ingredients"> {
  ingredients: CalculatedIngredient[];
  totals: MacroTotals;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface CalculatedPlan extends Omit<MealPlanTemplate, "meals"> {
  meals: CalculatedMeal[];
  totals: MacroTotals;
}

export const MEAL_PLAN_TEMPLATES: MealPlanTemplate[] = [
  {
    id: "balanced-protein",
    name: "均衡高蛋白",
    description: "以优质蛋白和稳定碳水为主，适合作为日常训练日安排。",
    meals: [
      { type: "breakfast", recipeTitle: "美式炒蛋", ingredients: [{ foodName: "燕麦片", grams: 50 }, { foodName: "鸡蛋", grams: 100 }, { foodName: "希腊酸奶", grams: 150 }, { foodName: "香蕉", grams: 100 }] },
      { type: "lunch", recipeTitle: "空气炸锅照烧鸡饭", ingredients: [{ foodName: "鸡胸肉", grams: 180 }, { foodName: "熟米饭", grams: 220 }, { foodName: "西兰花", grams: 250 }, { foodName: "橄榄油", grams: 8 }] },
      { type: "dinner", recipeTitle: "清蒸鲈鱼", ingredients: [{ foodName: "三文鱼", grams: 150 }, { foodName: "红薯", grams: 250 }, { foodName: "菠菜", grams: 200 }] },
    ],
  },
  {
    id: "lean-cut",
    name: "轻负担减脂",
    description: "提高蔬菜体积和蛋白占比，适合减脂期控制摄入。",
    meals: [
      { type: "breakfast", recipeTitle: "燕麦鸡蛋饼", ingredients: [{ foodName: "燕麦片", grams: 45 }, { foodName: "鸡蛋", grams: 100 }, { foodName: "苹果", grams: 180 }] },
      { type: "lunch", recipeTitle: "麻辣减脂荞麦面", ingredients: [{ foodName: "鸡胸肉", grams: 200 }, { foodName: "熟米饭", grams: 150 }, { foodName: "西兰花", grams: 300 }, { foodName: "橄榄油", grams: 5 }] },
      { type: "dinner", recipeTitle: "蒜蓉西兰花", ingredients: [{ foodName: "虾仁", grams: 200 }, { foodName: "红薯", grams: 200 }, { foodName: "番茄", grams: 250 }, { foodName: "希腊酸奶", grams: 150 }] },
    ],
  },
  {
    id: "training-fuel",
    name: "训练补给",
    description: "增加主食和总能量，适合增肌或训练量较高的日子。",
    meals: [
      { type: "breakfast", recipeTitle: "牛奶燕麦", ingredients: [{ foodName: "燕麦片", grams: 80 }, { foodName: "纯牛奶", grams: 300 }, { foodName: "鸡蛋", grams: 100 }, { foodName: "香蕉", grams: 150 }] },
      { type: "lunch", recipeTitle: "照烧鸡腿饭", ingredients: [{ foodName: "鸡胸肉", grams: 220 }, { foodName: "熟米饭", grams: 320 }, { foodName: "西兰花", grams: 200 }, { foodName: "橄榄油", grams: 12 }] },
      { type: "dinner", recipeTitle: "黑椒牛柳", ingredients: [{ foodName: "瘦牛肉", grams: 200 }, { foodName: "红薯", grams: 320 }, { foodName: "菠菜", grams: 200 }, { foodName: "希腊酸奶", grams: 150 }] },
    ],
  },
];

const emptyTotals: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const round = (value: number) => Math.round(value * 10) / 10;

function addTotals(left: MacroTotals, right: MacroTotals): MacroTotals {
  return { calories: left.calories + right.calories, protein: left.protein + right.protein, carbs: left.carbs + right.carbs, fat: left.fat + right.fat };
}

export function calculatePlan(template: MealPlanTemplate, foods: FoodItem[], targetCalories: number): CalculatedPlan {
  const byName = new Map(foods.map((food) => [food.name, food]));
  const unscaledMeals = template.meals.map((meal) => {
    const ingredients = meal.ingredients.flatMap((ingredient) => {
      const food = byName.get(ingredient.foodName);
      if (!food) return [];
      const ratio = ingredient.grams / 100;
      return [{ ...ingredient, calories: food.caloriesPer100g * ratio, protein: food.proteinPer100g * ratio, carbs: food.carbsPer100g * ratio, fat: food.fatPer100g * ratio }];
    });
    const totals = ingredients.reduce(addTotals, emptyTotals);
    return { ...meal, ingredients, totals };
  });
  const baseTotals = unscaledMeals.reduce((total, meal) => addTotals(total, meal.totals), emptyTotals);
  const scale = Math.min(1.35, Math.max(0.75, targetCalories / Math.max(baseTotals.calories, 1)));
  const meals = unscaledMeals.map((meal) => {
    const ingredients = meal.ingredients.map((ingredient) => ({ ...ingredient, grams: Math.round(ingredient.grams * scale / 5) * 5, calories: 0, protein: 0, carbs: 0, fat: 0 }));
    const recalculated = ingredients.map((ingredient) => {
      const food = byName.get(ingredient.foodName)!;
      const ratio = ingredient.grams / 100;
      return { ...ingredient, calories: round(food.caloriesPer100g * ratio), protein: round(food.proteinPer100g * ratio), carbs: round(food.carbsPer100g * ratio), fat: round(food.fatPer100g * ratio) };
    });
    return { ...meal, ingredients: recalculated, totals: recalculated.reduce(addTotals, emptyTotals) };
  });
  const totals = meals.reduce((total, meal) => addTotals(total, meal.totals), emptyTotals);
  return { ...template, meals, totals: { calories: Math.round(totals.calories), protein: round(totals.protein), carbs: round(totals.carbs), fat: round(totals.fat) } };
}
