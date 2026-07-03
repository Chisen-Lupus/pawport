# PawPort

这是一个面向兽展与旅行足迹的站点原型，当前已在 macOS 本地完成基础部署流程。

## 文档索引

- [网站详细说明](pawport-test/docs/site-overview.md)：完整功能、页面、数据来源、数据模型和架构说明。
- [本地快速启动](pawport-test/docs/local-quick-start.md)：macOS 本地开发启动步骤。
- [服务器运维 Runbook](pawport-test/docs/server-ops.md)：首次迁移、服务器重启后检查、每次 `git pull` 后操作、常见问题排查。
- [来源说明](pawport-test/docs/source-note.md)：项目初始来源记录。

## 本地运行

1. 初始化本地 SQLite 测试库：
   - `cd pawport-test/backend && npm run db:reset`
2. 启动 API：
   - `cd pawport-test/backend && npm run dev`
   - 若 3001 被占用：`PORT=3011 npm run dev`
3. 启动页面：
   - `cd pawport-test/frontend && npm run dev -- --host 0.0.0.0`
   - 若 API 用了 3011：`BACKEND_PORT=3011 npm run dev -- --host 0.0.0.0`
4. 打开：
   - 前端：`http://localhost:5173`
   - API 健康检查：`http://localhost:3001/api/health`

## 配置

- 根目录配置：`config/site.config.js`
- 运行时配置：`config/runtime.config.js`
- 本地预览页面：`www/index.html`

## 现有能力

- 兽展地图展示
- 用户参展标记
- 用户轨迹展示
- 测试用户与测试兽展数据
- 可扩展的后端模型与路由

## 迁移说明

- 前端构建：`cd pawport-test/frontend && npm run build`
- 后端可直接部署到服务器，并把域名与 IP 配置替换到配置文件中。

### SQLite 迁移到 MySQL

在本地或服务器的后端目录运行：

```bash
cd pawport-test/backend
npm run db:migrate:sqlite-to-mysql -- --dry-run
```

正式迁移到宝塔创建的 MySQL 库时，建议用环境变量传密码：

```bash
MYSQL_HOST=127.0.0.1 \
MYSQL_DB=sql_pawport_me \
MYSQL_USER=sql_pawport_me \
MYSQL_PASS='你的数据库密码' \
npm run db:migrate:sqlite-to-mysql -- --sqlite ./data/pawport.sqlite --force-target
```

默认情况下脚本只允许迁移到空 MySQL 表；`--force-target` 会清空并重建目标表，`--merge` 才会尝试合并到非空目标库。
