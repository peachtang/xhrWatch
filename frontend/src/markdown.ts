import type { XhrEvent } from './types';

/** 转义 Markdown 表格单元格中的竖线，避免破坏表格结构 */
function escCell(s: string): string {
  return s.replace(/\|/g, '\\|');
}

/** body 若是合法 JSON 则美化缩进，否则原样返回 */
function prettyBody(body: string | null | undefined): string {
  if (!body) return '(empty)';
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function formatTs(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 把一条 XHR 事件组装成给后端排查问题用的 Markdown 文档 */
export function buildEventMarkdown(ev: XhrEvent): string {
  const lines: string[] = [];

  lines.push('# XHR 请求记录', '');

  lines.push('## 基本信息', '');
  lines.push('| 项 | 值 |');
  lines.push('| --- | --- |');
  lines.push(`| 时间 | ${escCell(formatTs(ev.ts))} |`);
  lines.push(`| Method | ${escCell(ev.method || '')} |`);
  lines.push(`| URL | ${escCell(ev.url || '')} |`);
  lines.push(`| 状态码 | ${ev.status} |`);
  lines.push(`| 耗时 | ${ev.cost}ms |`);
  lines.push('');

  let params: [string, string][] = [];
  try {
    const u = new URL(ev.url);
    params = Array.from(u.searchParams.entries());
  } catch {
    // URL 无效时跳过查询参数部分
  }

  lines.push('## 查询参数 (Query Params)', '');
  if (params.length === 0) {
    lines.push('(no query params)', '');
  } else {
    lines.push('| 参数 | 值 |');
    lines.push('| --- | --- |');
    for (const [k, v] of params) {
      lines.push(`| ${escCell(k)} | ${escCell(v)} |`);
    }
    lines.push('');
  }

  lines.push('## Request Body', '');
  lines.push('```json');
  lines.push(prettyBody(ev.reqBody));
  lines.push('```', '');

  lines.push('## Response Body', '');
  lines.push('```json');
  lines.push(prettyBody(ev.resBody));
  lines.push('```', '');

  return lines.join('\n');
}
