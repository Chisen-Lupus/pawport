# PawPort

这是一个面向兽展与旅行足迹的站点原型，当前已在 macOS 本地完成基础部署流程。

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
