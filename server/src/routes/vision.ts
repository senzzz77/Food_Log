import type { FastifyInstance } from "fastify";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { database } from "../database.js";
import {
  recognizeFoodsFromImage,
  recognizeNutritionFactsFromImage,
  searchFoodsByText,
  type VisionFood,
} from "../vision.js";

type FoodRow = RowDataPacket & {
  id: string;
  name: string;
  category: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  isSnack: number;
};

async function loadCatalog(): Promise<FoodRow[]> {
  const [rows] = await database.query<FoodRow[]>(
    "SELECT id, name, category, calories_per_100g AS caloriesPer100g, protein_per_100g AS proteinPer100g, carbs_per_100g AS carbsPer100g, fat_per_100g AS fatPer100g, is_snack AS isSnack FROM food_catalog",
  );
  return rows;
}

// 将识别出的食物名映射到食物库（方案 A：优先用库，库没有则回退到 LLM 补估）
function mapToRecognized(foods: VisionFood[], catalog: FoodRow[]) {
  return foods.map((item) => {
    const matched =
      catalog.find((row) => row.name === item.name) ??
      catalog.find((row) => row.name.includes(item.name) || item.name.includes(row.name));
    return {
      name: item.name,
      food: matched
        ? {
            id: matched.id,
            name: matched.name,
            category: matched.category,
            caloriesPer100g: matched.caloriesPer100g,
            proteinPer100g: matched.proteinPer100g,
            carbsPer100g: matched.carbsPer100g,
            fatPer100g: matched.fatPer100g,
            isSnack: matched.isSnack,
          }
        : null,
      estimate: item.estimate,
    };
  });
}

const imageBodySchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().regex(/^image\/(jpeg|png|webp)$/i).default("image/jpeg"),
});

export async function visionRoutes(app: FastifyInstance) {
  app.post("/recognize", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { imageBase64, mimeType } = imageBodySchema.parse(request.body);
    const foods = await recognizeFoodsFromImage(imageBase64, mimeType);
    const catalog = await loadCatalog();
    return reply.send({ items: mapToRecognized(foods, catalog) });
  });

  app.post("/search", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { text } = z.object({ text: z.string().trim().min(1).max(2000) }).parse(request.body);
    const foods = await searchFoodsByText(text);
    const catalog = await loadCatalog();
    return reply.send({ items: mapToRecognized(foods, catalog) });
  });

  app.post("/recognize-nutrition", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { imageBase64, mimeType } = imageBodySchema.parse(request.body);
    const foods = await recognizeNutritionFactsFromImage(imageBase64, mimeType);
    const catalog = await loadCatalog();
    return reply.send({ items: mapToRecognized(foods, catalog) });
  });
}
