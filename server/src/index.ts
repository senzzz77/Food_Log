import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import type { RowDataPacket } from "mysql2";
import { ZodError } from "zod";
import { config } from "./config.js";
import { database, ensureAdminAccount, initializeDatabase } from "./database.js";
import "./types.js";
import { authRoutes } from "./routes/auth.js";
import { profileRoutes } from "./routes/profiles.js";
import { foodRoutes } from "./routes/foods.js";
import { diaryRoutes } from "./routes/diary.js";
import { trendRoutes } from "./routes/trends.js";
import { visionRoutes } from "./routes/vision.js";
import { adminRoutes } from "./routes/admin.js";

const app = Fastify({ logger: true, bodyLimit: 10 * 1024 * 1024 });

await app.register(cors, {
  // 本地开发环境反射所有来源，兼容 web 前端(5173) 与小程序 H5 预览(动态端口)。
  // 生产环境如需限制来源，可将这里改回具体域名或 config.CORS_ORIGIN。
  origin: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
await app.register(jwt, { secret: config.JWT_SECRET, sign: { expiresIn: "7d" } });

app.decorate("authenticate", async function authenticate(request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ message: "登录状态已失效，请重新登录。" });
  }
});

// 角色以数据库为准实时读取，避免用户被提升/降级后旧 token 仍然生效。
app.decorate("requireAdmin", async function requireAdmin(request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) {
  const userId = request.user?.userId;
  if (!userId) return reply.code(401).send({ message: "登录状态已失效，请重新登录。" });
  const [rows] = await database.query<Array<RowDataPacket & { role: string }>>("SELECT role FROM users WHERE id = ? LIMIT 1", [userId]);
  if (rows[0]?.role !== "admin") return reply.code(403).send({ message: "需要管理员权限。" });
});

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) return reply.code(400).send({ message: error.issues[0]?.message ?? "请求数据不合法。" });
  app.log.error(error);
  return reply.code(500).send({ message: "服务暂时不可用，请稍后重试。" });
});

app.get("/api/health", async () => {
  await database.query("SELECT 1");
  return { status: "ok" };
});

await initializeDatabase();
const bootstrapAdmin = await ensureAdminAccount();
if (bootstrapAdmin) {
  app.log.warn(
    config.ADMIN_INITIAL_PASSWORD
      ? `已创建管理员账号 ${bootstrapAdmin.username}，密码取自 ADMIN_INITIAL_PASSWORD 配置。`
      : `已创建管理员账号 ${bootstrapAdmin.username}，初始密码：${bootstrapAdmin.password}。该密码仅在本次创建时输出一次，请自行妥善保存。`,
  );
}
await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(profileRoutes, { prefix: "/api/profiles" });
await app.register(foodRoutes, { prefix: "/api/foods" });
await app.register(diaryRoutes, { prefix: "/api/diaries" });
await app.register(trendRoutes, { prefix: "/api/trends" });
await app.register(visionRoutes, { prefix: "/api/vision" });
await app.register(adminRoutes, { prefix: "/api/admin" });

const close = async () => {
  await app.close();
  await database.end();
};
process.once("SIGINT", close);
process.once("SIGTERM", close);

await app.listen({ host: config.API_HOST, port: config.API_PORT });
