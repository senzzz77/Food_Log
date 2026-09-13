# 饮食助手

饮食助手是一款以菜谱和做法为核心，同时支持增肌、减脂热量管理的纯 Web 应用。账户、人物档案、身体数据、饮食记录、食物库和趋势数据均通过 API 保存至 MySQL。

## 功能范围

- 账户注册与 JWT 登录
- 同一账户下的多人物档案隔离
- 身体数据录入，以及 Mifflin-St Jeor BMR、TDEE 和目标摄入区间计算
- HowToCook 菜谱搜索、分类浏览与做法详情
- 手动食物、文本解析和零食三种饮食记录方式
- 早餐、午餐、晚餐、加餐分类记录与每日热量统计
- 三餐食谱方案生成、一键加入当日台账和历史日期查询
- 体重与每日摄入热量趋势图


## 本地启动

前置要求：Node.js 22+、MySQL 8.0+。

在 `server/.env` 填写数据库连接信息后，执行：

```powershell
npm install
npm run start:local
```

浏览器访问 `http://127.0.0.1:5173`。该命令会同时启动前端和 API；运行命令的终端需要保持开启。

## 验证

```powershell
npm run api:check
npm run build
```

- 将前端构建变量 `VITE_API_BASE_URL` 设为公网 API 地址，例如 `https://api.example.com/api`。
- 使用反向代理提供 HTTPS，并分别部署前端静态文件与 API 服务。

可参考 `.env.production.example` 中的前端 API 地址格式。
