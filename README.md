# Quaver

同济大学计算机学院软件工程专业方向综合项目。

## 当前状态

- 前端已接入后端的歌单读取、队列、播放会话、搜索和 Agent 会话接口。
- 后端已实现默认用户、曲目缓存、歌单添加、队列持久化、播放会话持久化、Spotify 授权/搜索/播放桥接。
- AI 层固定使用 DeepSeek `deepseek-v4-pro`，Agent 对话支持 SSE 流式输出。未配置 API key 时会回退到确定性本地逻辑。
- Agent 已具备直接操作后端歌单/队列的基础能力：创建、重命名、删除歌单，添加曲目到歌单，加入队列，下一首播放，以及播放/暂停/切歌状态同步。

## 本地运行

1. 启动 MySQL 和 Redis。
2. 在 `quaver-server/.env` 中维护后端本地私密配置。当前只需要你补一个 DeepSeek key：

```properties
QUAVER_AI_API_KEY=你的 DeepSeek key
```

3. 后端固定使用 `deepseek-v4-pro`，不需要再配置模型名。
4. `quaver-client/.env` 只保留前端连接后端所需配置，不再配置 Agent 模型或 Agent key。
5. 在 Spotify Developer Dashboard 中把这个回调地址加入应用配置：

```text
http://127.0.0.1:8080/api/spotify/auth/callback
```

6. 启动后端：

```bash
cd quaver-server
mvn -s .mvn-local-settings.xml -pl quaver-server-boot -am spring-boot:run
```

7. 启动前端：

```bash
cd quaver-client
npm install
npm run dev
```

默认后端地址是 `http://127.0.0.1:8080/api`。前端地址是 `http://127.0.0.1:5173`。
