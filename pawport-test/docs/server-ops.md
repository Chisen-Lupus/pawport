# PawPort Server Ops Runbook

这份文档记录 pawport.me 服务器上的常用操作：首次迁移、服务器重启后检查、以及每次 `git pull` 后需要做什么。

默认假设：

- 服务器代码目录：`/www/wwwroot/pawport.me`
- 后端目录：`/www/wwwroot/pawport.me/pawport-test/backend`
- 前端目录：`/www/wwwroot/pawport.me/pawport-test/frontend`
- 后端端口：`3001`
- PM2 进程名：`pawport-backend`
- Nginx 由宝塔面板管理

## 不要在生产环境随便运行

这些命令会重置或覆盖数据，除非明确知道后果，否则不要在服务器生产库上运行：

```bash
npm run db:reset
node database/init.js --force
node database/seed.js
npm run db:migrate:sqlite-to-mysql -- --force-target
```

`--force-target` 会清空并重建目标 MySQL 表，只适合第一次把本地 SQLite 用户数据完整迁移到一个空的线上库，或已经做好备份并确认要覆盖时使用。

## 首次迁移到服务器

### 1. 拉取代码

```bash
cd /www/wwwroot
git clone git@github.com:Chisen-Lupus/pawport.git pawport.me
cd /www/wwwroot/pawport.me
```

如果宝塔已经创建了目录，也可以进入目录后运行：

```bash
cd /www/wwwroot/pawport.me
git pull
```

### 2. 准备后端环境变量

在服务器创建或确认：

```bash
cd /www/wwwroot/pawport.me/pawport-test/backend
cp .env.production.bak .env
```

确认 `.env` 至少包含类似配置：

```dotenv
NODE_ENV=production
PORT=3001
DB_DIALECT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=sql_pawport_me
DB_USER=sql_pawport_me
DB_PASS=你的数据库密码
JWT_SECRET=换成足够长的随机字符串
FCC_TOKEN=你的furrycons.cn token
```

`JWT_SECRET` 换掉后，旧登录 token 会失效，这是正常现象。

### 3. 安装依赖

```bash
cd /www/wwwroot/pawport.me/pawport-test/backend
npm install

cd /www/wwwroot/pawport.me/pawport-test/frontend
npm install
```

### 4. 构建前端

```bash
cd /www/wwwroot/pawport.me/pawport-test/frontend
npm run build
```

构建完成后，正式静态文件在：

```text
/www/wwwroot/pawport.me/pawport-test/frontend/dist
```

`/www/wwwroot/pawport.me/www/index.html` 只是旧的本地占位页，不是正式前端。

### 5. 初始化 MySQL 表结构

```bash
cd /www/wwwroot/pawport.me/pawport-test/backend
node database/init.js
```

不要加 `--force`，否则会删表重建。

### 6. 从 SQLite 迁移用户数据到 MySQL

先 dry run，看本地 SQLite 源库能否读取：

```bash
cd /www/wwwroot/pawport.me/pawport-test/backend
npm run db:migrate:sqlite-to-mysql -- --sqlite ./data/pawport.sqlite --dry-run
```

如果确认目标 MySQL 是空库，并且要完整导入：

```bash
MYSQL_HOST=127.0.0.1 \
MYSQL_DB=sql_pawport_me \
MYSQL_USER=sql_pawport_me \
MYSQL_PASS='你的数据库密码' \
npm run db:migrate:sqlite-to-mysql -- --sqlite ./data/pawport.sqlite --force-target
```

如果目标库已经有数据，不要直接用 `--force-target`。先备份，再考虑：

```bash
npm run db:migrate:sqlite-to-mysql -- --sqlite ./data/pawport.sqlite --merge
```

### 7. 启动后端

第一次创建 PM2 进程：

```bash
cd /www/wwwroot/pawport.me/pawport-test/backend
PORT=3001 NODE_ENV=production pm2 start server.js --name pawport-backend
pm2 save
```

如果还没配置开机自启：

```bash
pm2 startup
```

运行 `pm2 startup` 后，PM2 会输出一条需要复制执行的命令。照它输出的命令执行一次，然后：

```bash
pm2 save
```

### 8. 配置宝塔 Nginx

宝塔面板中进入：

```text
网站 -> pawport.me -> 设置 -> 配置文件
```

在 HTTPS 的 `server { ... }` 块里确认：

```nginx
root /www/wwwroot/pawport.me/pawport-test/frontend/dist;
index index.html;

location /api {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /uploads {
    proxy_pass http://127.0.0.1:3001;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

如果有旧的 `location / { ... }`，只保留一个，避免重复。

保存后在宝塔里重载 Nginx，或命令行：

```bash
nginx -t
systemctl reload nginx
```

### 9. 首次上线检查

```bash
pm2 status
curl http://127.0.0.1:3001/api/health
curl https://pawport.me/api/health
```

浏览器打开：

```text
https://pawport.me
```

如果 `127.0.0.1:3001/api/health` 通，但 `https://pawport.me/api/health` 不通，优先检查 Nginx 反代配置。

如果两个都不通，优先检查 PM2 后端进程：

```bash
pm2 logs pawport-backend
```

## 服务器重启后做什么

正常情况下，MySQL、Nginx、PM2 都应该开机自启。重启后按这个顺序检查：

### 1. 检查服务状态

```bash
systemctl status nginx
systemctl status mysqld
pm2 status
```

有些系统 MySQL 服务名可能是 `mysql` 或 `mariadb`：

```bash
systemctl status mysql
systemctl status mariadb
```

### 2. 如果 PM2 进程没有恢复

```bash
pm2 resurrect
```

如果还是没有：

```bash
cd /www/wwwroot/pawport.me/pawport-test/backend
PORT=3001 NODE_ENV=production pm2 start server.js --name pawport-backend
pm2 save
```

### 3. 检查后端和公网访问

```bash
curl http://127.0.0.1:3001/api/health
curl https://pawport.me/api/health
```

### 4. 检查日志

```bash
pm2 logs pawport-backend
```

如果网页 403，通常是 Nginx `root` 指错，应该指向：

```text
/www/wwwroot/pawport.me/pawport-test/frontend/dist
```

如果网页能打开但 API 报错，优先看：

```bash
pm2 logs pawport-backend
```

## 每次 git pull 后做什么

在服务器上更新代码后，建议按固定流程执行。

### 标准流程

```bash
cd /www/wwwroot/pawport.me
git pull

cd pawport-test/backend
npm install
node database/init.js

cd ../frontend
npm install
npm run build

pm2 restart pawport-backend
```

### 更新后检查

```bash
pm2 status
curl http://127.0.0.1:3001/api/health
curl https://pawport.me/api/health
```

### 如果只是前端改动

可以只执行：

```bash
cd /www/wwwroot/pawport.me
git pull

cd pawport-test/frontend
npm install
npm run build
```

前端静态文件由 Nginx 直接读取，通常不需要重启 PM2。

### 如果有后端改动

执行：

```bash
cd /www/wwwroot/pawport.me
git pull

cd pawport-test/backend
npm install
node database/init.js
pm2 restart pawport-backend
```

### 如果不确定改了什么

直接跑标准流程最省心：

```bash
cd /www/wwwroot/pawport.me
git pull
cd pawport-test/backend && npm install && node database/init.js
cd ../frontend && npm install && npm run build
pm2 restart pawport-backend
curl https://pawport.me/api/health
```

## 常见问题

### 访问网站 403

常见原因是 Nginx `root` 指到了没有 `index.html` 的目录。

确认不是：

```nginx
root /www/wwwroot/pawport.me;
```

而应该是：

```nginx
root /www/wwwroot/pawport.me/pawport-test/frontend/dist;
```

并且确认前端已经构建：

```bash
ls /www/wwwroot/pawport.me/pawport-test/frontend/dist/index.html
```

### API 502 或请求失败

先看后端有没有运行：

```bash
pm2 status
curl http://127.0.0.1:3001/api/health
```

再看日志：

```bash
pm2 logs pawport-backend
```

### 登录突然都失效

检查 `.env` 里的 `JWT_SECRET` 是否改过。改动后旧 token 会失效，用户重新登录即可。

### 地图能打开但没有新前端功能

通常是没有重新构建前端：

```bash
cd /www/wwwroot/pawport.me/pawport-test/frontend
npm run build
```

### 数据不见了

先确认没有运行过：

```bash
npm run db:reset
node database/init.js --force
npm run db:migrate:sqlite-to-mysql -- --force-target
```

然后检查后端 `.env` 是否连接到了正确的 MySQL 库：

```bash
cd /www/wwwroot/pawport.me/pawport-test/backend
cat .env
```

不要把 `.env` 提交到 git。
