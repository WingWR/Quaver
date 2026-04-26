# Quaver

同济大学计算机学院软件工程专业方向综合项目。

## 当前状态

- 前端已接入后端的歌单读取、队列、播放会话、搜索和 Agent 会话接口。
- 后端已实现默认用户、空歌单状态、曲目缓存、歌单添加、队列持久化、播放会话持久化、Spotify 授权/搜索/播放桥接。
- Spotify OAuth、token 刷新和 Web API 调用由后端处理；前端只触发连接、读取后端状态并展示结果。
- Spotify 曲库搜索可直接使用应用 Client ID/Secret 获取 catalog token；真实播放控制仍需要已授权账号、Premium 权限和可用播放设备。
- AI 层已具备基础架构：搜索查询清洗默认使用 `gpt-4.1-mini`，Agent 对话回复默认使用 `gpt-5`；未配置 API key 时会回退到确定性本地逻辑。

## 本地运行

1. 启动 MySQL 和 Redis。
2. 直接编辑 `quaver-server/quaver-server-boot/src/main/resources/application.yml`，填入 MySQL、Redis、OpenAI、Spotify 和可选 API key 配置。
3. 直接编辑 `quaver-client/.env`，填入前端需要的后端地址和可选 API key。
4. 在 Spotify Developer Dashboard 中把这个回调地址加入应用配置：

```text
http://127.0.0.1:8080/api/spotify/auth/callback
```

5. 启动后端：

```bash
cd quaver-server
mvn -s .mvn-local-settings.xml -pl quaver-server-boot -am spring-boot:run
```

6. 启动前端：

```bash
cd quaver-client
npm install
npm run dev
```

默认后端地址是 `http://127.0.0.1:8080/api`。前端地址是 `http://127.0.0.1:5173`。
