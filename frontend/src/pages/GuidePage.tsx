const DOWNLOADS = [
  {
    href: "/xhrwatch-skill.md",
    download: "xhrwatch-skill.md",
    name: "AI Agent 接入技能包 (xhrwatch-skill.md)",
    desc: "面向其它 AI Agent（Claude Code / Cursor / Hermes 等）的接入指引。下载后放入任意项目的技能目录，Agent 读取后即可自动帮你完成 hook 接入。",
  },
  {
    href: "/download/hook",
    download: "xhrhook.ts",
    name: "Hook 源码 (xhrhook.ts)",
    desc: "当前后端对应的 hook 注入脚本，与仓库 hook/xhrhook.ts 实时同步。手动接入时复制到目标项目即可。",
  },
] as const;

const STEPS = [
  {
    title: "1. 启动后端",
    body: "运行 xhrWatch 的 npm run dev / npm start，确认 http://localhost:3001/health 返回 200。",
  },
  {
    title: "2. 下载并放入 hook",
    body: (
      <>
        下载 <b>xhrhook.ts</b>，放进目标项目（如 src/common/ 或公共目录）。注意文件顶部{" "}
        <code>WS_URL</code> 常量的端口需与后端一致（默认 3001）。若项目内已有 hook
        副本，改端口需保持各处一致（后端 <code>src/index.ts</code> 与 hook 内的
        <code>WS_URL</code>）。
      </>
    ),
  },
  {
    title: "3. 入口注入",
    body: (
      <>
        在页面入口（如 main.tsx / app.ts）调用：
        <pre>{`import { installXhrHook, installConsoleHook } from '../common/xhrhook';

installXhrHook();      // 拦截 XMLHttpRequest，上报到面板
installConsoleHook();  // 包装 console.*，上报到面板`}</pre>
        建议仅在调试环境启用（如按平台运行时环境判断），避免影响线上包。
      </>
    ),
  },
  {
    title: "4. 验证",
    body: "页面触发一次 XHR 请求，面板 Network 列表即出现该请求（含 method/url/status/cost/请求响应体），Console 页同步显示 console 日志。",
  },
];

export default function GuidePage() {
  return (
    <main className="guide-page">
      <div className="guide-content">
        <h1 className="guide-title">XHR Watch · 接入指南</h1>
        <p className="guide-sub">
          将 xhrWatch 钩子注入任意 H5 页面，即可在面板中实时查看 XHR 与
          console 日志 —— 尤其适用于游戏引擎 webview（无 DevTools / F5 环境）。
        </p>

        <section className="guide-downloads">
          {DOWNLOADS.map((d) => (
            <a
              key={d.download}
              className="guide-download"
              href={d.href}
              download={d.download}
            >
              <span className="gd-name">⬇ {d.name}</span>
              <span className="gd-desc">{d.desc}</span>
            </a>
          ))}
        </section>

        <section className="guide-steps">
          <h2>快速接入</h2>
          {STEPS.map((s) => (
            <div key={s.title} className="guide-step">
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </section>

        <section className="guide-tips">
          <h2>给 AI Agent 使用</h2>
          <p>
            下载 <b>xhrwatch-skill.md</b> 放入项目的技能目录（如{" "}
            <code>.cursor/skills/</code>、<code>~/.hermes/skills/</code>、或
            Claude Code 的 <code>.claude/skills/</code>），然后直接对你的
            Agent 说“接入 xhrWatch”，它会按技能指引自动完成下载、注入与验证。
          </p>
        </section>
      </div>
    </main>
  );
}
