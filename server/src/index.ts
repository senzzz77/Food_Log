import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { ZodError } from "zod";
import { config } from "./config.js";
import { database, initializeDatabase } from "./database.js";
import "./types.js";
import { authRoutes } from "./routes/auth.js";
import { profileRoutes } from "./routes/profiles.js";
import { foodRoutes } from "./routes/foods.js";
import { diaryRoutes } from "./routes/diary.js";
import { trendRoutes } from "./routes/trends.js";
import { visionRoutes } from "./routes/vision.js";

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
await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(profileRoutes, { prefix: "/api/profiles" });
await app.register(foodRoutes, { prefix: "/api/foods" });
await app.register(diaryRoutes, { prefix: "/api/diaries" });
await app.register(trendRoutes, { prefix: "/api/trends" });
await app.register(visionRoutes, { prefix: "/api/vision" });

const close = async () => {
  await app.close();
  await database.end();
};
process.once("SIGINT", close);
process.once("SIGTERM", close);

await app.listen({ host: config.API_HOST, port: config.API_PORT });
