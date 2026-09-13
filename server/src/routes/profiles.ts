import type { FastifyInstance } from "fastify";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { database } from "../database.js";

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "请填写档案名称").max(48, "档案名称最多 48 个字符"),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#5f7d6d"),
});

const bodySchema = z.object({
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(25).max(350),
  age: z.number().int().min(14).max(100),
  sex: z.enum(["male", "female"]),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal: z.enum(["fat_loss", "muscle_gain", "maintenance"]),
  targetWeightKg: z.number().min(25).max(350),
  weeklyRateKg: z.number().min(0.1).max(1),
  manualTdee: z.number().min(800).max(6000).nullable().optional(),
  manualTargetCalories: z.number().min(800).max(6000).nullable().optional(),
  manualProtein: z.number().min(0).max(500).nullable().optional(),
  manualCarbs: z.number().min(0).max(1000).nullable().optional(),
  manualFat: z.number().min(0).max(300).nullable().optional(),
});

async function ownsProfile(profileId: string, userId: string) {
  const [rows] = await database.query<Array<RowDataPacket & { id: string }>>("SELECT id FROM profiles WHERE id = ? AND user_id = ? LIMIT 1", [profileId, userId]);
  return Boolean(rows[0]);
}

export async function profileRoutes(app: FastifyInstance) {
  app.get("/", { onRequest: [app.authenticate] }, async (request) => {
    const [profiles] = await database.query(
      "SELECT id, display_name AS displayName, accent, created_at AS createdAt, updated_at AS updatedAt FROM profiles WHERE user_id = ? ORDER BY updated_at DESC",
      [request.user.userId],
    );
    return { profiles };
  });

  app.post("/", { onRequest: [app.authenticate] }, async (request, reply) => {
    const input = profileSchema.parse(request.body);
    const id = crypto.randomUUID();
    await database.execute("INSERT INTO profiles (id, user_id, display_name, accent) VALUES (?, ?, ?, ?)", [id, request.user.userId, input.displayName, input.accent]);
    const [rows] = await database.query<Array<RowDataPacket & { id: string; displayName: string; accent: string; createdAt: string; updatedAt: string }>>(
      "SELECT id, display_name AS displayName, accent, created_at AS createdAt, updated_at AS updatedAt FROM profiles WHERE id = ?",
      [id],
    );
    return reply.code(201).send({ profile: rows[0] });
  });

  app.get("/:profileId/body", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { profileId } = z.object({ profileId: z.string().uuid() }).parse(request.params);
    if (!(await ownsProfile(profileId, request.user.userId))) return reply.code(404).send({ message: "未找到该档案。" });
    const [rows] = await database.query<RowDataPacket[]>(
      "SELECT height_cm AS heightCm, weight_kg AS weightKg, age, sex, activity_level AS activityLevel, goal, target_weight_kg AS targetWeightKg, weekly_rate_kg AS weeklyRateKg, manual_tdee AS manualTdee, manual_target_calories AS manualTargetCalories, manual_protein AS manualProtein, manual_carbs AS manualCarbs, manual_fat AS manualFat, updated_at AS updatedAt FROM body_profiles WHERE profile_id = ?",
      [profileId],
    );
    return { body: rows[0] ?? null };
  });

  app.put("/:profileId/body", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { profileId } = z.object({ profileId: z.string().uuid() }).parse(request.params);
    const input = bodySchema.parse(request.body);
    if (!(await ownsProfile(profileId, request.user.userId))) return reply.code(404).send({ message: "未找到该档案。" });
    await database.execute(
      `INSERT INTO body_profiles (profile_id, height_cm, weight_kg, age, sex, activity_level, goal, target_weight_kg, weekly_rate_kg, manual_tdee, manual_target_calories, manual_protein, manual_carbs, manual_fat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE height_cm = VALUES(height_cm), weight_kg = VALUES(weight_kg), age = VALUES(age), sex = VALUES(sex), activity_level = VALUES(activity_level), goal = VALUES(goal), target_weight_kg = VALUES(target_weight_kg), weekly_rate_kg = VALUES(weekly_rate_kg), manual_tdee = VALUES(manual_tdee), manual_target_calories = VALUES(manual_target_calories), manual_protein = VALUES(manual_protein), manual_carbs = VALUES(manual_carbs), manual_fat = VALUES(manual_fat)`,
      [profileId, input.heightCm, input.weightKg, input.age, input.sex, input.activityLevel, input.goal, input.targetWeightKg, input.weeklyRateKg, input.manualTdee ?? null, input.manualTargetCalories ?? null, input.manualProtein ?? null, input.manualCarbs ?? null, input.manualFat ?? null],
    );
    await database.execute(
      "INSERT INTO weight_logs (id, profile_id, logged_on, weight_kg) VALUES (?, ?, CURDATE(), ?) ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg)",
      [crypto.randomUUID(), profileId, input.weightKg],
    );
    return { body: input };
  });
}
