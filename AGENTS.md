# AGENTS.md

本仓库的 AI 编码智能体（Cursor / Claude Code / Codex 等）工作指南。仓库**不含任何机密** —— 前端 hook、后端 API、面板代码均可公开。

## 项目是什么

面向游戏引擎 webview 内 H5 页面的本地调试工具（无 DevTools/F5；内置 Network/console 面板不可靠）：

- `hook/xhrhook.ts` — 注入目标页面；拦截 `XMLHttpRequest` 并包装 `console.*`，经 WebSocket 上报
- `src/index.ts` — Koa 后端：WS 采集 + REST 历史记录 + 静态面板托管
- `src/store.ts` — 内存环形缓冲（XHR 5000 条 / console 1000 条），重启即清空
- `frontend/` — React 18 + Vite 5 面板（路由：`/` Network、`/console`、`/jsonformat`、`/guide`）

## 常用命令

```bash
npm install            # 安装依赖（node_modules 勿提交）
npm run dev            # Vite 5173 + tsx watch 后端 3001（concurrently）
npm run check          # 前后端 tsc --noEmit 类型检查
npm run build          # 类型检查 + vite build → frontend/dist
npm start              # 仅 tsx 后端，托管构建产物于 3001
PORT=3001 npm start    # 覆盖后端端口
```

未配置测试框架与 lint。提交前必须跑 `npm run check`。

## 端口与代理（改动需三处同步）

| 位置 | 默认 |
|---|---|
| 后端 `src/index.ts`（`PORT` 环境变量） | 3001 |
| `vite.config.ts` dev 代理（`/xhr-events`、`/console-logs`、`/ws` → 后端） | 5173 → 3001 |
| hook `WS_URL`（`hook/xhrhook.ts` 的各项目副本） | ws://localhost:28801/ws ⚠️ |

⚠️ 仓库内 `hook/xhrhook.ts` 指向 **28801**，但本仓库后端默认监听 **3001**，`vite.config.ts` 也代理到 3001。注入到各活动项目的 hook 副本可能不同 —— 排查「面板无事件」时，先确认注入的 hook 指向哪个端口，再把后端起在对应端口上（`PORT=28801 npm run dev` 配合 Vite proxy 无效 —— proxy 写死 3001；若确需跑 28801 需同步改 `vite.config.ts`）。

## 数据流

```
目标页面 ──WS {type:'ingest'|'ingest-console'}──► src/index.ts (Koa)
                                                   ├─ WS /ws 广播（排除上报端，无回声）
                                                   ├─ REST /xhr-events、/console-logs（GET 历史 500 / DELETE 清空）
                                                   └─ 静态 frontend/dist（SPA fallback → index.html）
```

- WS 消息：`{type:'ingest'}`（XHR）、`{type:'ingest-console'}`（console），向面板广播 `event/clear`、`console/console-clear`
- POST `/xhr-events` 保留为 HTTP 兼容上报入口；JSON body 上限 5mb（koa-bodyparser）
- 静态目录由 `src/index.ts` 相对解析 `frontend/dist` —— 移动文件需同步更新路径

## 前端状态要点

- `useXhrEvents.ts` / `useConsoleLogs.ts`：WS + 指数退避重连 + 拉历史 + 暂停/恢复 + 过滤 + 清空
- 暂停时：新事件仍进 `events`，UI 快照（`displayEvents`）冻结；恢复后重新同步
- 过滤只影响列表展示，不影响存储或已选详情

## 编辑规则

- 改后端 → `tsx watch` 自动重启；改前端 → Vite HMR 即时生效
- 不要在 `src/index.ts` 的 API 路由前加 catch-all 静态中间件 —— 会挡住 `/xhr-events` 等
- 请求/响应体超 50KB 截断并加 `[truncated ...]` 标记 —— 是特性，不是 bug
- `vanilla-jsoneditor` 依赖已移除；JSON 展示用 `frontend/src/components/JsonTree.tsx`
- 新代码禁止写死特定活动/业务信息 —— hook 必须保持通用（URL 尽量走配置/参数）

## 上下文文件

- `CLAUDE.md` — 更完整的架构说明（结构变化时保持同步）
- `.codegraph/` — 本地符号索引（大重构后跑 `codegraph init .`）；已 gitignore，勿提交
