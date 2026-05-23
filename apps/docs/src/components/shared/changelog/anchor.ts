/** 时间线锚点 id(供左 rail 点击滚动 / scroll-spy 定位) */
export const releaseAnchorId = (minor: string): string => `release-${minor.replace(/[^\w.-]/g, '-')}`;
