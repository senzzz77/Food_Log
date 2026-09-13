import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function newId() {
  return crypto.randomUUID();
}

export function formatCalories(value: number) {
  return new Intl.NumberFormat("zh-CN").format(Math.round(value));
}
