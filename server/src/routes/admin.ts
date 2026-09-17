import type { FastifyInstance } from "fastify";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";
import { database } from "../database.js";
import { invalidateActiveVisionKey } from "../vision.js";

const idSchema = z.string().uuid();

function isDuplicateEntry(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "ER_DUP_ENTRY";
}

/** 只回传 Key 的尾 4 位，避免后台页面把完整密钥暴露在响应里。 */
function maskKey(apiKey: string) {
  return apiKey.length <= 4 ? "****" : `****${apiKey.slice(-4)}`;
}

export async function adminRoutes(app: FastifyInstance) {
  const adminOnly = { onRequest: [app.authenticate, app.requireAdmin] };

  // ---------- 用户与角色 ----------
  app.get("/users", adminOnly, async () => {
    const [users] = await database.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.role, u.created_at AS createdAt, COUNT(p.id) AS profileCount
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       GROUP BY u.id, u.username, u.role, u.created_at
       ORDER BY u.created_at DESC`,
    );
    return { users };
  });

  app.patch("/users/:userId/role", adminOnly, async (request, reply) => {
    const { userId } = z.object({ userId: idSchema }).parse(request.params);
    const { role } = z.object({ role: z.enum(["user", "admin"]) }).parse(request.body);

    if (role === "user") {
      if (userId === request.user.userId) return reply.code(400).send({ message: "不能取消自己的管理员权限。" });
      const [admins] = await database.query<Array<RowDataPacket & { count: number }>>("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
      const [target] = await database.query<Array<RowDataPacket & { role: string }>>("SELECT role FROM users WHERE id = ? LIMIT 1", [userId]);
      if (!target[0]) return reply.code(404).send({ message: "用户不存在。" });
      if (target[0].role === "admin" && Number(admins[0]?.count ?? 0) <= 1) {
        return reply.code(400).send({ message: "至少需要保留一名管理员。" });
      }
    }

    const [result] = await database.execute<ResultSetHeader>("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
    if (result.affectedRows === 0) return reply.code(404).send({ message: "用户不存在。" });
    return { userId, role };
  });

  app.delete("/users/:userId", adminOnly, async (request, reply) => {
    const { userId } = z.object({ userId: idSchema }).parse(request.params);
    if (userId === request.user.userId) return reply.code(400).send({ message: "不能删除当前登录的账号。" });
    // users -> profiles -> (body_profiles / meal_entries / weight_logs) 均为级联删除
    const [result] = await database.execute<ResultSetHeader>("DELETE FROM users WHERE id = ?", [userId]);
    if (result.affectedRows === 0) return reply.code(404).send({ message: "用户不存在。" });
    return reply.code(204).send();
  });

  app.get("/users/:userId/profiles", adminOnly, async (request) => {
    const { userId } = z.object({ userId: idSchema }).parse(request.params);
    const [profiles] = await database.query<RowDataPacket[]>(
      "SELECT id, display_name AS displayName, accent, created_at AS createdAt, updated_at AS updatedAt FROM profiles WHERE user_id = ? ORDER BY updated_at DESC",
      [userId],
    );
    return { profiles };
  });

  app.delete("/profiles/:profileId", adminOnly, async (request, reply) => {
    const { profileId } = z.object({ profileId: idSchema }).parse(request.params);
    const [result] = await database.execute<ResultSetHeader>("DELETE FROM profiles WHERE id = ?", [profileId]);
    if (result.affectedRows === 0) return reply.code(404).send({ message: "档案不存在。" });
    return reply.code(204).send();
  });

  // ---------- 食物库 ----------
  app.get("/foods", adminOnly, async (request) => {
    const { query, limit } = z.object({ query: z.string().trim().max(80).optional(), limit: z.coerce.number().int().min(1).max(1000).default(300) }).parse(request.query);
    const term = query ?? "";
    const [foods] = await database.query<RowDataPacket[]>(
      `SELECT id, name, category, calories_per_100g AS caloriesPer100g, protein_per_100g AS proteinPer100g, carbs_per_100g AS carbsPer100g, fat_per_100g AS fatPer100g, is_snack AS isSnack, is_active AS isActive
       FROM food_catalog
       WHERE (? = '' OR name LIKE CONCAT('%', ?, '%') OR category LIKE CONCAT('%', ?, '%'))
       ORDER BY is_active DESC, is_snack, category, name LIMIT ?`,
      [term, term, term, limit],
    );
    return { foods, total: foods.length };
  });

  const foodInputSchema = z.object({
    name: z.string().trim().min(1, "请填写食物名称").max(120, "食物名称最多 120 个字符"),
    category: z.string().trim().min(1, "请填写分类").max(48, "分类最多 48 个字符"),
    caloriesPer100g: z.number().min(0).max(2000),
    proteinPer100g: z.number().min(0).max(200),
    carbsPer100g: z.number().min(0).max(200),
    fatPer100g: z.number().min(0).max(200),
    isSnack: z.boolean().default(false),
    isActive: z.boolean().default(true),
  });

  app.post("/foods", adminOnly, async (request, reply) => {
    const input = foodInputSchema.parse(request.body);
    const id = crypto.randomUUID();
    try {
      await database.execute(
        `INSERT INTO food_catalog (id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_snack, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, input.name, input.category, input.caloriesPer100g, input.proteinPer100g, input.carbsPer100g, input.fatPer100g, input.isSnack, input.isActive],
      );
    } catch (error) {
      if (isDuplicateEntry(error)) return reply.code(409).send({ message: "已存在同名食物。" });
      throw error;
    }
    return reply.code(201).send({ food: { id, ...input } });
  });

  app.patch("/foods/:foodId", adminOnly, async (request, reply) => {
    const { foodId } = z.object({ foodId: idSchema }).parse(request.params);
    const patch = foodInputSchema.partial().parse(request.body);
    const columns: Record<string, string> = {
      name: "name",
      category: "category",
      caloriesPer100g: "calories_per_100g",
      proteinPer100g: "protein_per_100g",
      carbsPer100g: "carbs_per_100g",
      fatPer100g: "fat_per_100g",
      isSnack: "is_snack",
      isActive: "is_active",
    };
    const entries = Object.entries(patch).filter(([key]) => key in columns);
    if (!entries.length) return reply.code(400).send({ message: "没有需要更新的字段。" });

    const assignments = entries.map(([key]) => `${columns[key]} = ?`).join(", ");
    const values = entries.map(([, value]) => value);
    try {
      const [result] = await database.execute<ResultSetHeader>(`UPDATE food_catalog SET ${assignments} WHERE id = ?`, [...values, foodId]);
      if (result.affectedRows === 0) return reply.code(404).send({ message: "食物不存在。" });
    } catch (error) {
      if (isDuplicateEntry(error)) return reply.code(409).send({ message: "已存在同名食物。" });
      throw error;
    }
    return { foodId, ...patch };
  });

  app.delete("/foods/:foodId", adminOnly, async (request, reply) => {
    const { foodId } = z.object({ foodId: idSchema }).parse(request.params);
    const [result] = await database.execute<ResultSetHeader>("DELETE FROM food_catalog WHERE id = ?", [foodId]);
    if (result.affectedRows === 0) return reply.code(404).send({ message: "食物不存在。" });
    return reply.code(204).send();
  });

  // ---------- 识图大模型 Key ----------
  app.get("/vision-keys", adminOnly, async () => {
    const [keys] = await database.query<Array<RowDataPacket & { api_key: string }>>(
      "SELECT id, label, api_key, model, base_url AS baseUrl, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt FROM vision_keys ORDER BY created_at DESC",
    );
    return { keys: keys.map(({ api_key, ...rest }) => ({ ...rest, apiKeyMasked: maskKey(api_key) })) };
  });

  const visionKeyInputSchema = z.object({
    label: z.string().trim().min(1, "请填写名称").max(64, "名称最多 64 个字符"),
    apiKey: z.string().trim().min(8, "API Key 至少 8 个字符").max(255, "API Key 过长"),
    model: z.string().trim().min(1, "请填写模型名").max(64, "模型名最多 64 个字符"),
    baseUrl: z.string().trim().url("Base URL 需为合法网址").max(255),
  });

  app.post("/vision-keys", adminOnly, async (request, reply) => {
    const input = visionKeyInputSchema.parse(request.body);
    const id = crypto.randomUUID();
    const [existing] = await database.query<Array<RowDataPacket & { count: number }>>("SELECT COUNT(*) AS count FROM vision_keys");
    // 第一条自动启用，省去新建后再点一次「启用」
    const isFirst = Number(existing[0]?.count ?? 0) === 0;
    await database.execute(
      "INSERT INTO vision_keys (id, label, api_key, model, base_url, is_active) VALUES (?, ?, ?, ?, ?, ?)",
      [id, input.label, input.apiKey, input.model, input.baseUrl, isFirst],
    );
    if (isFirst) invalidateActiveVisionKey();
    return reply.code(201).send({ id, label: input.label, model: input.model, baseUrl: input.baseUrl, isActive: isFirst, apiKeyMasked: maskKey(input.apiKey) });
  });

  app.patch("/vision-keys/:keyId", adminOnly, async (request, reply) => {
    const { keyId } = z.object({ keyId: idSchema }).parse(request.params);
    const patch = visionKeyInputSchema.partial().parse(request.body);
    const columns: Record<string, string> = { label: "label", apiKey: "api_key", model: "model", baseUrl: "base_url" };
    const entries = Object.entries(patch).filter(([key]) => key in columns);
    if (!entries.length) return reply.code(400).send({ message: "没有需要更新的字段。" });

    const assignments = entries.map(([key]) => `${columns[key]} = ?`).join(", ");
    const values = entries.map(([, value]) => value);
    const [result] = await database.execute<ResultSetHeader>(`UPDATE vision_keys SET ${assignments} WHERE id = ?`, [...values, keyId]);
    if (result.affectedRows === 0) return reply.code(404).send({ message: "Key 不存在。" });
    invalidateActiveVisionKey();
    return { keyId };
  });

  app.post("/vision-keys/:keyId/activate", adminOnly, async (request, reply) => {
    const { keyId } = z.object({ keyId: idSchema }).parse(request.params);
    const [keys] = await database.query<Array<RowDataPacket & { id: string }>>("SELECT id FROM vision_keys WHERE id = ? LIMIT 1", [keyId]);
    if (!keys[0]) return reply.code(404).send({ message: "Key 不存在。" });

    await database.execute("UPDATE vision_keys SET is_active = (id = ?)", [keyId]);
    invalidateActiveVisionKey();
    return { keyId };
  });

  app.delete("/vision-keys/:keyId", adminOnly, async (request, reply) => {
    const { keyId } = z.object({ keyId: idSchema }).parse(request.params);
    const [result] = await database.execute<ResultSetHeader>("DELETE FROM vision_keys WHERE id = ?", [keyId]);
    if (result.affectedRows === 0) return reply.code(404).send({ message: "Key 不存在。" });
    // 删除的可能是当前启用项，让缓存失效后回退到环境变量
    invalidateActiveVisionKey();
    return reply.code(204).send();
  });
}
