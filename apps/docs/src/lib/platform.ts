/**
 * 浏览器 OS 探测：仅在客户端 SPA 上运行，启动时算一次即可。
 * 用 `navigator.platform`（虽然官方标记为 legacy，但目前所有主流浏览器仍稳定返回），
 * 兜底再看 userAgent，覆盖 iPad on iPadOS 13+ 上 platform 报为 MacIntel 的情况。
 */
export const isMac =
  typeof navigator !== 'undefined' &&
  (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Mac|iPhone|iPad|iPod/.test(navigator.userAgent));
