/**
 * 浏览器 OS 探测（启动时算一次）
 * @description 主用 `navigator.platform`（虽然官方标记 legacy 但主流浏览器仍稳定返回），兜底看 userAgent 覆盖 iPad on iPadOS 13+ 把 platform 报成 MacIntel 的情况
 */
export const isMac =
  typeof navigator !== 'undefined' &&
  (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Mac|iPhone|iPad|iPod/.test(navigator.userAgent));
