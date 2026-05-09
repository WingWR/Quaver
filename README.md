# Quaver

全栈音乐播放应用，集成 Spotify 桥接与 AI 助手。用户可以通过自然语言搜索音乐、创建和管理歌单、控制播放队列，支持 Spotify Web 播放与 AI 对话式交互。

同济大学计算机学院软件工程专业方向综合项目。

## 项目介绍

Quaver 是一个基于 Web 的音乐播放平台，核心目标是让用户以更自然的方式与音乐交互——不只是手动点击，而是像和一位 DJ 对话一样，说出你想听什么、想怎么听。

### 核心功能

**音乐库与歌单管理**
- 创建、编辑、删除自定义歌单，支持从 Spotify 搜索曲目并添加到歌单。
- 维护播放队列：追加曲目、插入下一首播放、移除曲目、清空队列。
- 曲目缓存：从 Spotify 获取的曲目自动持久化到 MySQL，减少重复 API 调用。

**Spotify 播放桥接**
- 通过 OAuth 2.0 授权流程连接 Spotify 账户。
- 支持 Spotify Web Playback SDK 浏览器内播放，以及 Spotify Connect API 远程控制。
- 完整的播放控制：播放/暂停、上一首/下一首、进度跳转、音量调节、随机播放、循环模式。
- 同步歌词显示，支持当前行高亮。

**AI Agent 对话**
- 基于 DeepSeek `deepseek-v4-pro` 模型，通过 SSE 实现流式对话输出。
- 自然语言意图识别：搜索曲目、创建/重命名/删除歌单、添加曲目到歌单、队列操作、播放控制等。
- 命令解析器将用户消息转换为结构化指令，直接操作后端的歌单和队列。
- 未配置 API key 时回退到确定性本地解析，保证基础功能可用。
- 支持中英文混合指令。

### 项目架构

```
quaver-client (React + TypeScript + Vite)
    │
    │ HTTP + SSE
    ▼
quaver-server-boot (Spring Boot 入口)
    ├── quaver-server-agent      # AI 对话、意图解析、命令规划
    ├── quaver-server-library    # 歌单 CRUD、队列、播放会话
    ├── quaver-server-spotify    # Spotify OAuth、API 桥接、播放控制
    └── quaver-server-common     # 共享模型、异常、身份解析、Redis 键
    │
    ├── MySQL    # 用户、曲目、歌单、播放会话、Spotify 授权
    └── Redis    # 队列、播放会话、Agent 对话消息
```

前端为 React SPA，使用 Zustand 管理全局状态，Tailwind CSS + Framer Motion 实现深色主题 UI 与交互动画。后端采用 Spring Boot 多模块架构，MyBatis-Plus 持久层，Redis 缓存队列与会话状态。AI 层通过 HTTP 直连 DeepSeek API，以 SSE 方式将流式响应透传到前端。

## 技术栈

### 前端

| 技术 | 版本 |
|------|------|
| TypeScript | 5.7+ |
| React | 18.3 |
| Vite | 6.0+ |
| Zustand | 5.0 |
| Tailwind CSS | 3.4 |
| Framer Motion | 12.12 |

### 后端

| 技术 | 版本 |
|------|------|
| Java | 21 |
| Spring Boot | 3.5.11 |
| MyBatis-Plus | 3.5.7 |
| MySQL | 8+ |
| Redis | — |
| Maven | 3.6+ |

### AI

DeepSeek `deepseek-v4-pro`，SSE 流式输出。

## 本地运行

**前置条件：** 启动 MySQL 和 Redis。

### 1. 配置环境变量

`quaver-server/.env`：

```properties
QUAVER_AI_API_KEY=你的 DeepSeek key
```

`quaver-client/.env`：配置后端地址及 Spotify 开发者邮箱（如需要）。

### 2. Spotify 回调地址

在 Spotify Developer Dashboard 中添加：

```
http://127.0.0.1:8080/api/spotify/auth/callback
```

### 3. 启动后端

```bash
cd quaver-server
mvn -s .mvn-local-settings.xml -pl quaver-server-boot -am spring-boot:run
```

默认地址 `http://127.0.0.1:8080/api`，启动时自动初始化数据库 schema。

### 4. 启动前端

```bash
cd quaver-client
npm install
npm run dev
```

默认地址 `http://127.0.0.1:5173`，Vite 代理将 `/api` 请求转发到后端。
