import type { FastifyInstance } from "fastify";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";
import { database } from "../database.js";

type FoodRow = RowDataPacket & { id: string; name: string; category: string; caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number; isSnack: number };
type MyFoodRow = RowDataPacket & { id: string; name: string; caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number };

export async function foodRoutes(app: FastifyInstance) {
  app.get("/", { onRequest: [app.authenticate] }, async (request) => {
    const query = z.object({ query: z.string().trim().max(80).optional(), snack: z.enum(["true", "false"]).optional() }).parse(request.query);
    const term = query.query ?? "";
    const snack = query.snack === undefined ? null : query.snack === "true";
    const [foods] = await database.query<FoodRow[]>(
      `SELECT id, name, category, calories_per_100g AS caloriesPer100g, protein_per_100g AS proteinPer100g, carbs_per_100g AS carbsPer100g, fat_per_100g AS fatPer100g, is_snack AS isSnack
       FROM food_catalog WHERE (? = '' OR name LIKE CONCAT('%', ?, '%') OR category LIKE CONCAT('%', ?, '%')) AND (? IS NULL OR is_snack = ?) ORDER BY is_snack, category, name LIMIT 250`,
      [term, term, term, snack, snack],
    );
    return { foods };
  });

  app.get("/mine", { onRequest: [app.authenticate] }, async (request) => {
    const [foods] = await database.query<MyFoodRow[]>(
      `SELECT id, name, calories_per_100g AS caloriesPer100g, protein_per_100g AS proteinPer100g, carbs_per_100g AS carbsPer100g, fat_per_100g AS fatPer100g
       FROM user_foods WHERE user_id = ? ORDER BY created_at DESC LIMIT 250`,
      [request.user.userId],
    );
    return { foods };
  });

  app.post("/mine", { onRequest: [app.authenticate] }, async (request, reply) => {
    const input = z.object({
      name: z.string().trim().min(1).max(120),
      caloriesPer100g: z.number().min(0).max(2000),
      proteinPer100g: z.number().min(0).max(200),
      carbsPer100g: z.number().min(0).max(200),
      fatPer100g: z.number().min(0).max(200),
    }).parse(request.body);
    const id = crypto.randomUUID();
    await database.execute(
      `INSERT INTO user_foods (id, user_id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE calories_per_100g = VALUES(calories_per_100g), protein_per_100g = VALUES(protein_per_100g), carbs_per_100g = VALUES(carbs_per_100g), fat_per_100g = VALUES(fat_per_100g)`,
      [id, request.user.userId, input.name, input.caloriesPer100g, input.proteinPer100g, input.carbsPer100g, input.fatPer100g],
    );
    return reply.code(201).send({ food: { id, name: input.name, ...input } });
  });

  app.delete("/mine/:foodId", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { foodId } = z.object({ foodId: z.string().uuid() }).parse(request.params);
    const [result] = await database.execute<ResultSetHeader>("DELETE FROM user_foods WHERE id = ? AND user_id = ?", [foodId, request.user.userId]);
    if (result.affectedRows === 0) return reply.code(404).send({ message: "未找到该食物。" });
    return reply.code(204).send();
  });
}
