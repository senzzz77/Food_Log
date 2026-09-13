import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { database } from "../database.js";

const credentialsSchema = z.object({
  username: z.string().trim().min(3, "用户名至少 3 个字符").max(48, "用户名最多 48 个字符").regex(/^[a-zA-Z0-9_.-]+$/, "用户名只能包含字母、数字、点、下划线或连字符"),
  password: z.string().min(8, "密码至少 8 个字符").max(72, "密码最多 72 个字符"),
});

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (request, reply) => {
    const input = credentialsSchema.parse(request.body);
    const username = normalizeUsername(input.username);
    const [existing] = await database.query<Array<RowDataPacket & { id: string }>>("SELECT id FROM users WHERE username = ? LIMIT 1", [username]);
    if (existing.length) return reply.code(409).send({ message: "该用户名已被使用。" });

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(input.password, 12);
    await database.execute("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)", [id, username, passwordHash]);
    const token = await reply.jwtSign({ userId: id, username });
    return reply.code(201).send({ token, user: { id, username } });
  });

  app.post("/login", async (request, reply) => {
    const input = credentialsSchema.parse(request.body);
    const username = normalizeUsername(input.username);
    const [users] = await database.query<Array<RowDataPacket & { id: string; username: string; password_hash: string }>>(
      "SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1",
      [username],
    );
    const user = users[0];
    if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
      return reply.code(401).send({ message: "用户名或密码不正确。" });
    }
    const token = await reply.jwtSign({ userId: user.id, username: user.username });
    return { token, user: { id: user.id, username: user.username } };
  });

  app.get("/me", { onRequest: [app.authenticate] }, async (request) => ({
    user: { id: request.user.userId, username: request.user.username },
  }));
}
