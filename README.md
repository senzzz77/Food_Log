# 饮食助手（Diet Assistant）

一款以菜谱和做法为核心，同时支持增肌、减脂热量管理的 Web 应用。账户、人物档案、身体数据、饮食记录、食物库和趋势数据均通过 API 保存至 MySQL。

## 功能特性

- 账户注册与 JWT 登录
- 同一账户下的多人物档案隔离
- 身体数据录入，基于 Mifflin-St Jeor 公式计算 BMR、TDEE 和目标摄入区间
- 支持手动修改 TDEE / 每日摄入 / 三大营养素目标
- HowToCook 菜谱搜索、分类浏览与做法详情
- 手动食物、文本解析、拍照识别、零食等多种饮食记录方式
- 早餐、午餐、晚餐、加餐分类记录与每日热量统计
- 三餐食谱方案生成、一键加入当日台账和历史日期查询
- 体重与每日摄入热量趋势图
- 浅色与深色主题

## 技术栈

| 模块     | 技术                                                         |
| -------- | ------------------------------------------------------------ |
| 前端     | React 19、Vite 6、TypeScript、Tailwind CSS、Zustand、ECharts |
| 后端     | Fastify 5、@fastify/jwt、@fastify/cors、zod                  |
| 数据库   | MySQL 8（mysql2）                                            |
| 视觉识别 | OpenAI 兼容接口（默认千问 qwen 系列，支持图片输入）          |

## 目录结构

```
.
├── src/                      # 前端源码（React + Vite）
├── server/                   # 后端源码（Fastify）
│   ├── src/routes/           # API 路由
│   └── sql/001_init.sql      # 数据库初始化脚本
├── deploy/                   # 生产部署配置（nginx、Caddy、环境变量模板）
├── scripts/                  # 本地启动与数据导入脚本
├── Dockerfile                # 多阶段构建（api + web）
├── docker-compose.yml        # 本地开发：仅启动 MySQL
└── docker-compose.production.yml  # 生产部署：MySQL + API + Web + Caddy
```

## 快速开始（本地开发）

### 前置要求

- Node.js 22+
- Docker（推荐，用于启动 MySQL），或本机已安装 MySQL 8.0+

### 方式一：使用 Docker 启动 MySQL（推荐）

无需本地安装 MySQL，直接拉起一个开发数据库：

```powershell
docker compose up -d mysql
npm install
npm run start:local
```

浏览器访问 <http://127.0.0.1:5173>。该命令会同时启动前端（Vite，5173）和后端 API（3000），运行命令的终端需保持开启。

### 方式二：连接本机已有的 MySQL

1. 复制后端配置模板并填写数据库连接信息：

```powershell
Copy-Item server\.env.example server\.env
```

2. 编辑 `server/.env`，修改 `DATABASE_HOST`、`DATABASE_PORT`、`DATABASE_USER`、`DATABASE_PASSWORD` 等为本机 MySQL 的实际连接信息。

3. 安装依赖并启动：

```powershell
npm install
npm run start:local
```

> 后端会在启动时自动创建所需的数据表（`initializeDatabase()`）。

## 环境变量说明

### 后端（`server/.env`）

后端通过 `dotenv` 读取 `server/.env`，所有配置项均有默认值，即使不创建该文件也能以本地默认配置启动。完整配置见 [server/.env.example](server/.env.example)。

| 变量                 | 说明                                           | 默认值                  |
| -------------------- | ---------------------------------------------- | ----------------------- |
| `API_PORT`           | API 监听端口                                   | `3000`                  |
| `API_HOST`           | API 监听地址                                   | `127.0.0.1`             |
| `CORS_ORIGIN`        | 允许跨域的前端来源（须为合法 URL）             | `http://127.0.0.1:5173` |
| `DATABASE_HOST`      | MySQL 地址                                     | `127.0.0.1`             |
| `DATABASE_PORT`      | MySQL 端口                                     | `3307`                  |
| `DATABASE_NAME`      | 数据库名                                       | `diet_assistant`        |
| `DATABASE_USER`      | 数据库用户                                     | `diet_app`              |
| `DATABASE_PASSWORD`  | 数据库密码                                     | `diet_app_dev_password` |
| `JWT_SECRET`         | JWT 签名密钥（生产环境必须替换，至少 32 字符） | 本地开发默认值          |
| `DASHSCOPE_API_KEY`  | 视觉识别服务密钥（可选，用于拍照识别）         | 空                      |
| `DASHSCOPE_MODEL`    | 视觉识别模型                                   | `qwen3.5-plus`          |
| `DASHSCOPE_BASE_URL` | 视觉识别服务地址（OpenAI 兼容接口）            | 阿里云 DashScope        |

### 前端（`VITE_API_BASE_URL`）

前端通过 `VITE_API_BASE_URL` 指定 API 地址，默认值为 `http://127.0.0.1:3000/api`。本地开发通常无需配置；如需自定义，可在项目根目录创建 `.env`：

```powershell
# .env
VITE_API_BASE_URL=http://127.0.0.1:3000/api
```

## 生产部署

生产环境使用 Docker Compose 一键拉起 MySQL、API、Web（nginx）和 Caddy（自动 HTTPS）。

1. 准备一台服务器（Ubuntu 24.04，2 核 4G 及以上），并安装 Docker 与 Docker Compose。

2. 克隆代码：

```bash
git clone <YOUR_REPOSITORY_URL> diet-assistant
cd diet-assistant
```

3. 配置生产环境变量：

```bash
cp deploy/.env.production.example deploy/.env.production
nano deploy/.env.production
```

在 `deploy/.env.production` 中设置：

- `APP_DOMAIN`：指向本服务器的域名
- `MYSQL_PASSWORD` / `MYSQL_ROOT_PASSWORD`：数据库密码（务必替换为随机长密码）
- `JWT_SECRET`：用 `openssl rand -hex 48` 生成
- `DASHSCOPE_API_KEY` 等视觉识别配置（可选）

> 注意：值中不要包含 `$`，Docker Compose 会将其视为变量插值。

4. 构建并启动：

```bash
docker compose --env-file deploy/.env.production -f docker-compose.production.yml up -d --build
docker compose --env-file deploy/.env.production -f docker-compose.production.yml ps
```

5. 访问 `https://<APP_DOMAIN>`。DNS 解析生效且 80/443 端口可达后，Caddy 会自动申请并续签 TLS 证书。

## 常用命令

```powershell
# 本地启动（前端 + 后端）
npm run start:local

# 仅启动后端 API（开发热重载）
npm run api:dev

# 类型检查后端
npm run api:check

# 构建前端
npm run build

# 导入 HowToCook 菜谱数据
npm run recipes:import
```

## 运维命令

```bash
# 查看 API 日志
docker compose --env-file deploy/.env.production -f docker-compose.production.yml logs -f api

# 拉取新代码后升级
git pull
docker compose --env-file deploy/.env.production -f docker-compose.production.yml up -d --build

# 备份数据库
docker compose --env-file deploy/.env.production -f docker-compose.production.yml exec -T mysql sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > diet-assistant-backup.sql
```

## 说明

- **菜谱数据已内置**：HowToCook 菜谱已生成为 `src/data/generated/how-to-cook-recipes.json`，无需额外下载第三方仓库即可运行。若需重新导入，可将 HowToCook 仓库放入 `third_party/HowToCook/` 后执行 `npm run recipes:import`。
- **视觉识别为可选功能**：未配置 `DASHSCOPE_API_KEY` 时，拍照识别等功能不可用，其余功能不受影响。
- **安全提醒**：切勿将 `server/.env`、`deploy/.env.production` 等含真实密钥的文件提交到版本库，它们已被 `.gitignore` 排除。数据库 3306 端口不应暴露到公网。
