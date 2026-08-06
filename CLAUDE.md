# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目定位

`xhr-watch` 是一个本地开发工具，用于接收并展示 `market260813` 的 XHR AOP 钩子所捕获的 Ajax 请求。它由 Koa HTTP + WebSocket 后端和一个原生 JavaScript 前端面板组成。

## 常用命令

```bash
# 安装依赖
npm install

# 开发（tsx watch 热重载 src）
npm run dev

# 生产/普通启动
npm start

# 指定端口
PORT=3001 npm start

# 类型检查（tsconfig noEmit）
npx tsc --noEmit

# 快速检查前端脚本语法
node --check public/app.js
```

> 注意：仓库中没有配置测试框架、lint 或构建打包脚本。

## 架构与数据流

```
market260813 页面
  │ 注入 demo/index.html 中的 XHR 钩子脚本
  │ 拦截 XMLHttpRequest.open/send，收集 method/url/status/cost/body
  ▼
POST /xhr-events  ──►  src/index.ts (Koa)  ──►  src/store.ts (环形缓冲区)
                           │
                           │ broadcast 到 WebSocket 客户端
                           ▼
              public/index.html + app.js（面板 UI）
```

### 后端（`src/`）

- `src/index.ts`：单一入口。
  - 启动 Koa HTTP 服务并复用同一个 `http.Server` 挂载 `ws` 的 `WebSocketServer`（路径 `/ws`）。
  - 暴露 `/health`、REST 风格的 `/xhr-events`（GET/POST/DELETE）以及 `/ws` 实时通道。
  - 静态文件：根路径 `/` 返回 `public/index.html`，`/_/xxx` 返回 `public/xxx`。
  - 静态目录通过 `fileURLToPath(new URL('../public', import.meta.url))` 解析，因此依赖 `src/index.ts` 相对于仓库根的位置；若日后改为先编译再运行，需要同步处理 `PUBLIC` 路径。
  - 请求体 JSON 限制为 `5mb`（`koa-bodyparser`）。
- `src/store.ts`：内存环形缓冲区，最多保存最近 `5000` 条 XHR 事件，进程重启即清空。
  - `store.push(ev)` 分配递增 `id`。
  - `store.recent(500)` 返回最近的 500 条（默认）。
  - `store.clear()` 清空并触发 WebSocket `clear` 消息。

### 前端（`public/`）

- `public/index.html`：面板页面。
- `public/app.js`：原生 JavaScript，无外部运行时依赖。
  - 连接 `ws://${location.host}/ws`，断开后指数退避重连。
  - 通过 `GET /xhr-events` 在重连后拉取历史记录。
  - 列表支持按 URL / method / fn 过滤；支持暂停、清空、选中详情。
  - 详情页有三个 tab：`Params`（URL 查询参数）、`Request`（请求体）、`Response`（响应体）。
  - JSON 体由自定义的可折叠/展开树渲染，最大深度 `MAX_JSON_DEPTH = 8`，默认深度 `>= 2` 折叠；非 JSON 按原样展示。
  - 复制按钮使用 `navigator.clipboard`，失败时回退到 `textarea + execCommand`。
- `public/style.css`：VS Code 风格的暗色主题。

### 客户端钩子（`demo/index.html`）

- `demo/index.html` 中的脚本用于注入到目标页面（`market260813`）。
- 它拦截原生 `XMLHttpRequest`，将请求信息以 JSON 形式 `POST` 到 `http://localhost:3001/xhr-events`。
- 请求体/响应体超过 50KB 会被截断，并在末尾追加 `[truncated ...]` 标记。
- 任何异常都会被静默捕获，避免影响业务 XHR。

## 开发注意事项

- `tsconfig.json` 设置了 `noEmit: true`，项目不会生成 `dist` 或编译产物；运行时直接使用 `tsx` 解释执行 TypeScript。
- 前端资源不经过任何构建步骤，直接由后端静态文件中间件提供。
- 端口默认为 `3001`，可通过环境变量 `PORT` 覆盖。
- 若修改 `src/index.ts` 中的静态文件路由或 `public/` 目录结构，需要同步验证 `/_/` 路径、根路径 `/` 以及 WebSocket 路径 `/ws` 是否仍然可达。
- `package.json` 中虽然声明了 `vanilla-jsoneditor` 依赖，但当前 `public/app.js` 已改用自研 JSON 树渲染，未实际使用该库。
