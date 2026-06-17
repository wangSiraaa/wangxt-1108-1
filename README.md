# 城市广场喷泉开放排程系统

一个纯静态前端应用，用于管理城市广场喷泉的开放排程，支持城管、维修员和游客三种角色查看一致的开放信息。

## 功能特性

### 👮 城管人员
- 维护喷泉开放时段（新增、编辑、删除、取消、恢复）
- 调节风力等级模拟天气变化
- 查看今日及未来排程

### 🔧 维修员
- 登记设备状态（正常/维护中/故障）
- 记录维修日志
- 查看设备状态变更历史

### 🎪 游客
- 查看今日喷泉开放时间（时间轴展示）
- 实时显示设备状态和天气状况
- 自动刷新（每30秒），支持手动刷新

## 业务规则

1. **设备维修中不能开放喷泉**：设备标记为维护中或故障时，所有排程自动取消，无法恢复
2. **大风天气自动标记停开**：风力 ≥ 6 级时，当日所有排程自动取消；风力恢复后可自动恢复
3. **已结束场次不能修改**：已结束的排程无法修改时间或删除

## 技术栈

- 纯 HTML5 + CSS3 + 原生 JavaScript
- 数据存储：浏览器 LocalStorage
- 无外部依赖，无需构建

## 项目结构

```
.
├── index.html              # 首页（角色选择）
├── admin.html              # 城管人员管理页面
├── maintainer.html         # 维修员页面
├── visitor.html            # 游客查看页面
├── css/
│   └── styles.css          # 统一样式
├── js/
│   ├── common.js           # 数据模型和公共逻辑
│   ├── admin.js            # 城管页面逻辑
│   ├── maintainer.js       # 维修员页面逻辑
│   └── visitor.js          # 游客页面逻辑
├── Dockerfile              # Docker 镜像配置
├── docker-compose.yml      # Docker Compose 配置
└── README.md
```

## 本地运行

### 方式一：直接打开

直接用浏览器打开 `index.html` 即可。

### 方式二：使用本地 HTTP 服务器

```bash
# Python 3
python3 -m http.server 8080

# Node.js (需要安装 http-server)
npx http-server -p 8080
```

然后访问 `http://localhost:8080`

## Docker 容器化运行

### 构建并运行

```bash
# 使用 Docker Compose
docker-compose up -d

# 或手动构建
docker build -t fountain-schedule .
docker run -d -p 8080:80 --name fountain-schedule fountain-schedule
```

访问地址：`http://localhost:8080`

### 停止服务

```bash
docker-compose down
# 或
docker stop fountain-schedule
```

## 数据说明

所有数据存储在浏览器的 LocalStorage 中，包括：
- 排程计划（fountain_schedules）
- 设备状态（fountain_device_state）
- 天气信息（fountain_weather）
- 维修日志（fountain_maintenance_logs）

> 注意：LocalStorage 数据按浏览器隔离，不同浏览器/设备之间数据不共享。实际部署如需多端同步，需接入后端服务。

## 默认数据

首次打开时会自动初始化默认数据：
- 设备状态：正常运行
- 天气：3级微风
- 今日排程：09:00-10:00、15:00-16:00、19:00-20:30

## 响应式设计

支持桌面端和移动端访问，界面自适应不同屏幕尺寸。
