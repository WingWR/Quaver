# Quaver

同济大学计算机学院软件工程专业方向综合项目。

## 当前功能状态

- 前端已接入后端的歌单读取、队列、播放会话、搜索和 Agent 会话接口。
- 后端已实现默认用户、默认歌单、曲目缓存、歌单添加、队列持久化、播放会话持久化、Spotify 授权/搜索/播放桥接。
- 具体 LLM Agent 编排仍是预留/轻量解析阶段；本项目当前可先完成音乐库、搜索、播放队列和播放状态闭环。

## 本地运行

1. 准备 MySQL 和 Redis。
2. 复制 `quaver-server/quaver-server-boot/src/main/resources/application-local.example.yml` 为 `application-local.yml`，放在同目录或 `quaver-server/` 目录下，并填入 MySQL、Redis、Spotify、AI 和 API key 配置。
3. 复制 `quaver-client/.env.example` 为 `quaver-client/.env`，填入后端地址、API key 和前端 Spotify PKCE 配置。
4. 后端：

```bash
cd quaver-server
mvn -s .mvn-local-settings.xml -pl quaver-server-boot -am spring-boot:run
```

5. 前端：

```bash
cd quaver-client
npm install
npm run dev
```

默认前端地址是 `http://localhost:5173`，后端地址是 `http://localhost:8080/api`。
