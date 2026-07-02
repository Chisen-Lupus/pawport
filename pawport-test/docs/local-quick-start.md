## 本地快速启动命令

macOS上首次运行的完整步骤：

```bash
# 1. 安装Homebrew依赖（如果没有的话）
brew install node mysql

# 2. 启动MySQL
brew services start mysql

# 3. 创建数据库
mysql -u root -e "CREATE DATABASE IF NOT EXISTS pawport CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. 安装后端依赖并初始化数据库
cd backend
npm install
node database/init.js
node database/seed.js
# 可选：接入 FCC 兽展日历
# export FCC_TOKEN='你的 FurryConsCN open API token'
# npm run sync:fcc

# 5. 启动后端（保持运行）
npm run dev

# 6. 新开终端，安装前端依赖并启动
cd frontend
npm install
npm run dev

# 7. 打开浏览器访问 http://localhost:5173
```

这个项目完整实现了你的所有需求：

1. **后端**: Express + Sequelize + MySQL，支持完整的用户/兽展/酒店CRUD
2. **数据库**: 包含测试数据，永恒展，可通过config关闭测试数据
3. **FCC同步**: 定时从FCC API拉取兽展数据
4. **前端地图**: 使用Leaflet + CartoDB瓦片（中国大陆可用），带圆形标记和动效
5. **用户轨迹**: 逆时针弯曲弧线连接参展历史
6. **当前展高亮**: 脉冲动画环绕活跃展览
7. **弹窗系统**: 点击展览显示信息和参展者列表（5个一行，超19显示+xx）
8. **暗色模式/i18n**: 完整中英文支持
9. **响应式侧边面板**: 桌面端侧边栏，移动端全屏
10. **扩展性**: JSON extra_fields字段、预留菜单、feature flags
