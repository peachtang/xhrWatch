# xhrWatch

游戏引擎 webview 内 H5 页面的本地 XHR / console 调试面板（无 DevTools、无 F5、内置 Network/console 面板不可靠）。

将 hook 脚本注入目标页面：拦截 `XMLHttpRequest` 并包装 `console.*`，通过 WebSocket 上报到本地 Koa 后端，再由 React 面板实时展示。

## 架构

```
目标页面（游戏引擎 webview）
  └─ hook/xhrhook.ts   installXhrHook / installConsoleHook
       拦截 XMLHttpRequest.open/send + 包装 console.*
       └─ WS ws://localhost:3001/ws  {type:'ingest'|'ingest-console'}
              ├─ Koa 后端 (src/index.ts) → 内存环形缓冲
              ├─ WS 广播到面板
              └─ 静态资源 frontend/dist (React SPA, Vite)
```

## 快速开始

```bash
npm install

# 开发：Vite dev server (5173) + tsx watch Koa 后端 (3001)
npm run dev

# 生产：先构建前端，Koa 再托管 frontend/dist
npm start        # 或 PORT=3001 npm start

# 类型检查（后端 + 前端）
npm run check
```

健康检查：

```bash
curl http://localhost:3001/health   # 200
curl http://localhost:5173/         # 200（dev 面板）
```

面板地址：http://localhost:5173/（开发）或 http://localhost:3001/（生产）

## 注入 hook

把 `hook/xhrhook.ts` 放进目标项目（各活动各自保留一份副本），然后：

```ts
import { installXhrHook, installConsoleHook } from '<path>/xhrhook';
installXhrHook();
installConsoleHook();
```

- 后端默认端口 **3001**（`PORT` 环境变量可覆盖）。dev 面板 **5173** 代理 `/xhr-events`、`/console-logs`、`/ws` 到 3001
- ⚠️ 改端口需三处同步：后端 `src/index.ts`、`vite.config.ts`、注入到页面的 hook 副本里的 `WS_URL` 常量
- hook 有 `window.__xhrHooked` 守卫且吞掉全部异常 —— 绝不污染业务 XHR

更详细的接入说明（含给 AI Agent 的下载文件）见面板内 **Guide** 页。

## API

| Method | Path              | 说明                                      |
|--------|-------------------|-------------------------------------------|
| GET    | `/health`         | 健康检查                                  |
| POST   | `/xhr-events`     | HTTP 上报（兼容保留，主通道为 WS）        |
| GET    | `/xhr-events`     | 历史记录（最近 500 条）                   |
| DELETE | `/xhr-events`     | 清空 XHR 事件                             |
| GET    | `/console-logs`   | console 历史（最近 500 条）               |
| DELETE | `/console-logs`   | 清空 console 日志                         |
| GET    | `/download/hook`  | 下载 hook 源码（xhrhook.ts，与仓库同步）  |
| WS     | `/ws`             | 采集（`ingest`/`ingest-console`）+ 推送    |

## 面板功能

- WS 实时流：指数退避重连、拉历史、暂停/恢复、过滤、清空
- XHR 列表（method / url / status / cost）+ 详情页签：Params / Request / Response（可折叠 JsonTree）
- Console 页按级别着色（error / warn / info / log / debug）
- 右键菜单一键复制请求为 Markdown
- 列表与详情分栏可拖拽调整宽度

## 说明

- 缓冲为内存环形缓冲（XHR 5000 条 / console 1000 条）—— 重启即清空
- 请求/响应体超 50KB 截断并加 `[truncated ...]` 标记（设计如此）
- 重连：指数退避 1s→10s；离线事件进入有界队列（500 条）并在重连后补发

## 技术栈

TypeScript · Koa 2 + ws · React 18 (Vite 5) · react-router-dom 7

## AI Agent 文档

架构细节与开发约定见 `CLAUDE.md` / `AGENTS.md`。
