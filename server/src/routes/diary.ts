import type { FastifyInstance } from "fastify";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";
import { database } from "../database.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD");
const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
const entrySchema = z.object({ date: dateSchema, mealType: mealTypeSchema, source: z.enum(["manual", "text", "recipe", "snack", "photo"]), name: z.string().trim().min(1).max(120), grams: z.number().positive().max(5000), calories: z.number().min(0).max(20000), protein: z.number().min(0).max(1000), carbs: z.number().min(0).max(1000), fat: z.number().min(0).max(1000) });
type MealEntryInput = z.infer<typeof entrySchema>;

async function ownsProfile(profileId: string, userId: string) {
  const [rows] = await database.query<Array<RowDataPacket & { id: string }>>("SELECT id FROM profiles WHERE id = ? AND user_id = ? LIMIT 1", [profileId, userId]);
  return Boolean(rows[0]);
}

function round(value: number) { return Math.round(value * 10) / 10; }

async function insertEntry(profileId: string, input: MealEntryInput) {
  const id = crypto.randomUUID();
  await database.execute("INSERT INTO meal_entries (id, profile_id, entry_date, meal_type, source, name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [id, profileId, input.date, input.mealType, input.source, input.name, input.grams, input.calories, input.protein, input.carbs, input.fat]);
  return { id, ...input };
}

export async function diaryRoutes(app: FastifyInstance) {
  app.get("/:profileId", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { profileId } = z.object({ profileId: z.string().uuid() }).parse(request.params);
    const { date } = z.object({ date: dateSchema }).parse(request.query);
    if (!(await ownsProfile(profileId, request.user.userId))) return reply.code(404).send({ message: "未找到该档案。" });
    const [entries] = await database.query<RowDataPacket[]>("SELECT id, entry_date AS date, meal_type AS mealType, source, name, grams, calories, protein, carbs, fat, created_at AS createdAt FROM meal_entries WHERE profile_id = ? AND entry_date = ? ORDER BY created_at", [profileId, date]);
    const summary = entries.reduce((total, entry) => ({ calories: total.calories + entry.calories, protein: total.protein + entry.protein, carbs: total.carbs + entry.carbs, fat: total.fat + entry.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    return { entries, summary: Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, round(value)])) };
  });

  app.post("/:profileId/entries", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { profileId } = z.object({ profileId: z.string().uuid() }).parse(request.params);
    const input = entrySchema.parse(request.body);
    if (!(await ownsProfile(profileId, request.user.userId))) return reply.code(404).send({ message: "未找到该档案。" });
    return reply.code(201).send({ entry: await insertEntry(profileId, input) });
  });

  app.post("/:profileId/parse-text", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { profileId } = z.object({ profileId: z.string().uuid() }).parse(request.params);
    const { date, mealType, text } = z.object({ date: dateSchema, mealType: mealTypeSchema, text: z.string().trim().min(1).max(2000) }).parse(request.body);
    if (!(await ownsProfile(profileId, request.user.userId))) return reply.code(404).send({ message: "未找到该档案。" });
    const [foods] = await database.query<RowDataPacket[]>("SELECT id, name, calories_per_100g AS caloriesPer100g, protein_per_100g AS proteinPer100g, carbs_per_100g AS carbsPer100g, fat_per_100g AS fatPer100g FROM food_catalog WHERE is_active = 1");
    const accepted: unknown[] = []; const rejected: string[] = [];
    for (const rawLine of text.split(/[\n；;]/).map((line) => line.trim()).filter(Boolean)) {
      const match = rawLine.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(?:g|克)?$/i);
      if (!match) { rejected.push(rawLine); continue; }
      const [, name, amount] = match; const food = foods.find((item) => item.name === name.trim()) ?? foods.find((item) => item.name.includes(name.trim()) || name.trim().includes(item.name));
      if (!food) { rejected.push(rawLine); continue; }
      const grams = Number(amount); const ratio = grams / 100;
      accepted.push(await insertEntry(profileId, { date, mealType, source: "text", name: food.name, grams, calories: round(food.caloriesPer100g * ratio), protein: round(food.proteinPer100g * ratio), carbs: round(food.carbsPer100g * ratio), fat: round(food.fatPer100g * ratio) }));
    }
    return reply.code(201).send({ accepted, rejected });
  });

  app.delete("/:profileId/entries/:entryId", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { profileId, entryId } = z.object({ profileId: z.string().uuid(), entryId: z.string().uuid() }).parse(request.params);
    if (!(await ownsProfile(profileId, request.user.userId))) return reply.code(404).send({ message: "未找到该档案。" });
    const [result] = await database.execute<ResultSetHeader>("DELETE FROM meal_entries WHERE id = ? AND profile_id = ?", [entryId, profileId]);
    if (result.affectedRows === 0) return reply.code(404).send({ message: "未找到该条记录。" });
    return reply.code(204).send();
  });

  app.patch("/:profileId/entries/:entryId", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { profileId, entryId } = z.object({ profileId: z.string().uuid(), entryId: z.string().uuid() }).parse(request.params);
    const input = z.object({ name: z.string().trim().min(1).max(120), grams: z.number().positive().max(5000), calories: z.number().min(0).max(20000), protein: z.number().min(0).max(1000), carbs: z.number().min(0).max(1000), fat: z.number().min(0).max(1000) }).parse(request.body);
    if (!(await ownsProfile(profileId, request.user.userId))) return reply.code(404).send({ message: "未找到该档案。" });
    const [result] = await database.execute<ResultSetHeader>(
      "UPDATE meal_entries SET name = ?, grams = ?, calories = ?, protein = ?, carbs = ?, fat = ? WHERE id = ? AND profile_id = ?",
      [input.name, input.grams, input.calories, input.protein, input.carbs, input.fat, entryId, profileId],
    );
    if (result.affectedRows === 0) return reply.code(404).send({ message: "未找到该条记录。" });
    return reply.send({ entry: { id: entryId, ...input } });
  });
}
