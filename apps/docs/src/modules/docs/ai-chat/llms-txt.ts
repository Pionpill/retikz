/**
 * 运行时拉 /retikz/llms.txt 并做 5 分钟内存缓存
 * @description vite gen-llms-txt 插件把内容写到 public/llms.txt，部署后通过 BASE_URL 访问。
 *   Balanced 模式下作为 system 的「站点索引」部分喂给模型。
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { text: string; at: number } | null = null;
let inflight: Promise<string> | null = null;

const URL = `${import.meta.env.BASE_URL}llms.txt`;

const BOM_RE = /^\uFEFF/;

export const fetchLlmsTxt = async (): Promise<string> => {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.text;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(URL);
      if (!res.ok) return '';
      const text = await res.text();
      // 去掉 UTF-8 BOM（gen-llms-txt 写入时为浏览器解码加的）
      const clean = text.replace(BOM_RE, '');
      cache = { text: clean, at: Date.now() };
      return clean;
    } catch {
      return '';
    } finally {
      inflight = null;
    }
  })();
  return inflight;
};
