# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目定位

`xhr-watch` 是一个本地开发工具，用于接收并展示 `market260813` 的 XHR AOP 钩子所捕获的 Ajax 请求。它由 Koa HTTP + WebSocket 后端和一个 React + TypeScript 前端组成。

## 常用命令

```bash
# 安装依赖
npm install

# 开发（同时启动 Vite 前端 dev server 和 Koa 后端）
npm run dev

# 生产/普通启动（先 npm run build，再启动 Koa serving 前端 dist）
npm start

# 类型检查（后端 + 前端）
npm run check

# 构建前端产物到 frontend/dist/
npm run build

# 指定端口
PORT=3001 npm start
```

> 注意：仓库中没有配置测试框架或 lint。

## 架构与数据流

```
market260813 页面
  │ 注入 demo/index.html 中的 XHR 钩子脚本
  │ 拦截 XMLHttpRequest.open/send，收集 method/url/status/cost/body
  ▼
POST /xhr-events  ──►  src/index.ts (Koa)  ──►  src/store.ts (环形缓冲区)
                           │
                           ├── WebSocket /ws 广播
                           │
                           └── 静态资源服务（frontend/dist 中的 React SPA）
                                    │
                                    ▼
                            React 前端（Vite 构建）
```

开发时 Vite dev server 监听 `http://localhost:5173`，并通过 proxy 把 `/xhr-events` 与 `/ws` 转发到 Koa（默认 `http://localhost:3001`）。

## 后端（`src/`）

- `src/index.ts`：单一入口。
  - 启动 Koa HTTP 服务并复用同一个 `http.Server` 挂载 `ws` 的 `WebSocketServer`（路径 `/ws`）。
  - 暴露 `/health`、REST 风格的 `/xhr-events`（GET/POST/DELETE）以及 `/ws` 实时通道。
  - 静态文件：优先匹配 API 路由，然后尝试 `frontend/dist/` 中的文件，找不到时回退到 `index.html`（SPA fallback）。
  - 静态目录通过 `fileURLToPath(new URL('../frontend/dist', import.meta.url))` 解析，因此依赖 `src/index.ts` 相对于仓库根的位置。
  - 请求体 JSON 限制为 `5mb`（`koa-bodyparser`）。
- `src/store.ts`：内存环形缓冲区，最多保存最近 `5000` 条 XHR 事件，进程重启即清空。
  - `store.push(ev)` 分配递增 `id`。
  - `store.recent(500)` 返回最近的 500 条（默认）。
  - `store.clear()` 清空并触发 WebSocket `clear` 消息。

## 前端（`frontend/src/`）

- `frontend/index.html`：SPA 入口。
- `frontend/vite.config.ts`：Vite + React 配置；开发时代理 API/WS 到 Koa。
- `frontend/src/main.tsx`：React 挂载。
- `frontend/src/App.tsx`：面板根组件。
- `frontend/src/useXhrEvents.ts`：核心 hook，负责 WebSocket 连接、指数退避重连、拉取历史、暂停/继续显示、过滤、清空。
- `frontend/src/components/EventList.tsx`：事件列表表格。
- `frontend/src/components/EventDetail.tsx`：详情面板 + Params/Request/Response tabs。
- `frontend/src/components/JsonTree.tsx`：可折叠/展开的 JSON 树渲染。
- `frontend/src/components/CopyButton.tsx`：复制按钮，优先 `navigator.clipboard`，失败回退 `execCommand`。
- `frontend/src/index.css`：VS Code 风格的暗色主题样式。

### 前端状态要点

- `events` 保存收到的所有事件；`displayEvents` 是“未暂停时的快照”。
- 暂停时新事件仍进入 `events`，但界面不刷新；取消暂停后 `displayEvents` 与 `events` 同步。
- 过滤只影响列表展示，不影响事件存储或已选中的详情。

## 客户端钩子（`demo/index.html`）

- `demo/index.html` 中的脚本用于注入到目标页面（`market260813`）。
- 它拦截原生 `XMLHttpRequest`，将请求信息以 JSON 形式 `POST` 到 `http://localhost:3001/xhr-events`。
- 请求体/响应体超过 50KB 会被截断，并在末尾追加 `[truncated ...]` 标记。
- 任何异常都会被静默捕获，避免影响业务 XHR。

## 开发注意事项

- 前后端都是 TypeScript，且 `tsconfig.json` 均设置 `noEmit: true`；不生成编译产物，运行时直接用 `tsx`（后端）或 Vite（前端）。
- 修改后端代码后 `tsx watch src/index.ts` 会自动重启；修改前端代码后 Vite HMR 即时生效。
- 端口：Koa 默认 `3001`（可通过 `PORT` 环境变量覆盖），Vite 默认 `5173`。
- 不要在 `src/index.ts` 的 API 路由前添加 catch-all 静态文件中间件，否则 `/xhr-events` 等请求会被错误拦截。
- `package.json` 中遗留的 `vanilla-jsoneditor` 依赖已被移除；JSON 展示使用 `frontend/src/components/JsonTree.tsx` 实现。
