#!/usr/bin/env node
/**
 * 用 Edge / Chrome headless + CDP 抓 retikz blog 文章里的 ComponentPreview SVG
 *
 * 零依赖：仅用 Node 22+ 自带的 WebSocket / http / child_process
 *
 * 用法：
 *   node grab-svg.mjs --url <文章 URL> --out <输出目录> --demos <name1,name2,...>
 *
 * 例：
 *   node .agents/skills/docs-blog-conventor/grab-svg.mjs \
 *     --url http://localhost:5174/blog/journey/origin \
 *     --out .markdown/origin \
 *     --demos unit-circle,ir-centric,roadmap
 *
 * demo 名按 ComponentPreview 在 mdx 里出现的顺序填，与页面 DOM 卡片顺序一一对应。
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import http from 'node:http';

const { values } = parseArgs({
  options: {
    url: { type: 'string' },
    out: { type: 'string' },
    demos: { type: 'string' },
    port: { type: 'string', default: '9222' },
  },
});

if (!values.url || !values.out || !values.demos) {
  console.error('usage: node grab-svg.mjs --url <URL> --out <dir> --demos <name1,name2,...>');
  process.exit(2);
}

const URL = values.url;
const OUT_DIR = values.out;
const DEMO_NAMES = values.demos.split(',').map(s => s.trim()).filter(Boolean);
const PORT = Number(values.port);

const BROWSER_CANDIDATES = {
  win32: [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ],
  darwin: [
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ],
  linux: [
    '/usr/bin/microsoft-edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ],
};
const browser = (BROWSER_CANDIDATES[platform()] ?? []).find(p => existsSync(p));
if (!browser) {
  console.error(`未找到 Edge / Chrome，平台 ${platform()}，候选路径全不存在。把可用浏览器加进 BROWSER_CANDIDATES 或装一个 Chromium 系浏览器`);
  process.exit(1);
}

const userDataDir = mkdtempSync(join(tmpdir(), 'cdp-blog-'));
const proc = spawn(browser, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDataDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-gpu',
  '--window-size=1600,1200',
  'about:blank',
], { stdio: 'ignore', detached: false });

const cleanup = () => {
  try { proc.kill('SIGKILL'); } catch {}
  try { rmSync(userDataDir, { recursive: true, force: true }); } catch {}
};
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });

const getJson = (path) => new Promise((resolve, reject) => {
  http.get(`http://localhost:${PORT}${path}`, res => {
    let data = '';
    res.on('data', c => (data += c));
    res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
  }).on('error', reject);
});

const waitDebugger = async () => {
  for (let i = 0; i < 60; i++) {
    try { return await getJson('/json/version'); }
    catch { await new Promise(r => setTimeout(r, 300)); }
  }
  throw new Error('浏览器调试端口未就绪');
};

const main = async () => {
  console.log(`[grab] using browser: ${browser}`);
  console.log('[grab] waiting for debugger…');
  await waitDebugger();

  const tabs = await getJson('/json');
  const tab = tabs.find(t => t.type === 'page') ?? tabs[0];
  if (!tab) throw new Error('找不到可用 tab');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  let nextId = 1;
  const inflight = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && inflight.has(msg.id)) {
      const { resolve, reject } = inflight.get(msg.id);
      inflight.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  };
  const send = (method, params = {}) => {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      inflight.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await send('Page.enable');
  console.log(`[grab] navigating → ${URL}`);
  await send('Page.navigate', { url: URL });
  // 给 Vite bundle 优化 + React hydration + retikz 文本测量留够时间
  await new Promise(r => setTimeout(r, 5000));

  // 抓所有 ComponentPreview 卡（按 DOM 顺序与 DEMO_NAMES 一一对应）
  const expr = `
    (() => {
      const cards = document.querySelectorAll('div.my-6.overflow-hidden.rounded-xl.border');
      const svgs = [];
      cards.forEach(card => {
        const svg = card.querySelector('svg');
        if (svg) {
          let s = new XMLSerializer().serializeToString(svg);
          if (!/\\sxmlns=/.test(s)) s = s.replace(/<svg\\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
          svgs.push('<?xml version="1.0" encoding="UTF-8"?>\\n' + s);
        }
      });
      return JSON.stringify(svgs);
    })()
  `;
  const result = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (result.exceptionDetails) {
    throw new Error('eval failed: ' + JSON.stringify(result.exceptionDetails));
  }
  const svgs = JSON.parse(result.result.value);

  console.log(`[grab] found ${svgs.length} SVG(s) on page; expected ${DEMO_NAMES.length}`);
  if (svgs.length < DEMO_NAMES.length) {
    throw new Error(`SVG 数量不够（拿到 ${svgs.length}、需要 ${DEMO_NAMES.length}）——页面可能没渲染完，把上面的 setTimeout 加大再试`);
  }
  if (svgs.length > DEMO_NAMES.length) {
    console.warn(`[grab] 多出 ${svgs.length - DEMO_NAMES.length} 个 SVG，按顺序取前 ${DEMO_NAMES.length} 个`);
  }

  DEMO_NAMES.forEach((name, i) => {
    const outPath = join(OUT_DIR, `${name}.svg`);
    writeFileSync(outPath, svgs[i]);
    console.log(`[grab] wrote ${outPath} (${svgs[i].length} bytes)`);
  });

  ws.close();
};

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
