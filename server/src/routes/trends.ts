import type { FastifyInstance } from "fastify";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { database } from "../database.js";

async function ownsProfile(profileId: string, userId: string) {
  const [rows] = await database.query<Array<RowDataPacket & { id: string }>>("SELECT id FROM profiles WHERE id = ? AND user_id = ? LIMIT 1", [profileId, userId]);
  return Boolean(rows[0]);
}

export async function trendRoutes(app: FastifyInstance) {
  app.get("/:profileId", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { profileId } = z.object({ profileId: z.string().uuid() }).parse(request.params);
    if (!(await ownsProfile(profileId, request.user.userId))) return reply.code(404).send({ message: "未找到该档案。" });
    const [weights] = await database.query<RowDataPacket[]>("SELECT DATE_FORMAT(logged_on, '%Y-%m-%d') AS date, weight_kg AS weightKg FROM weight_logs WHERE profile_id = ? ORDER BY logged_on ASC LIMIT 90", [profileId]);
    const [calories] = await database.query<RowDataPacket[]>("SELECT DATE_FORMAT(entry_date, '%Y-%m-%d') AS date, ROUND(SUM(calories)) AS calories FROM meal_entries WHERE profile_id = ? GROUP BY entry_date ORDER BY entry_date ASC LIMIT 90", [profileId]);
    return { weights, calories };
  });
}
