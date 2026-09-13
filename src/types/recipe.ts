export interface Recipe {
  id: string;
  title: string;
  category: string;
  sourceCategory: string;
  description: string;
  estimatedCalories: number | null;
  difficulty: string | null;
  ingredients: string[];
  steps: string[];
  markdown: string;
  sourcePath: string;
}
