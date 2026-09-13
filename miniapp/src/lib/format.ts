export function round(value: number, digits = 1): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

export function formatCalories(value: number): string {
  return Math.round(value).toLocaleString('zh-CN');
}

export function formatNumber(value: number): string {
  return round(value).toString();
}

export function todayStr(): string {
  const d = new Date();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function caloriesForGrams(per100g: number, grams: number): number {
  return round((per100g * grams) / 100, 1);
}

export function macroForGrams(per100g: number, grams: number): number {
  return round((per100g * grams) / 100, 1);
}
