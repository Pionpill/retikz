import type { Lang } from '@/i18n';

/** 固定排列与整体布局对照图的双语文案 */
export const flowLayoutGeometryI18n: Record<
  Lang,
  {
    receive: string;
    verify: string;
    local: string;
    placed: string;
    move: string;
    spacing: string;
    size: string;
    guide: string;
  }
> = {
  zh: {
    receive: '接收',
    verify: '校验',
    local: 'placeLayout · 局部排列',
    placed: 'Definition · 整体放置',
    move: '整体移动 (+240, +120)',
    spacing: '相对位置 Δx = 112',
    size: '尺寸仍为 80 × 40',
    guide: '点线仅标示 Layout 边界，不绘制外壳',
  },
  en: {
    receive: 'Receive',
    verify: 'Verify',
    local: 'placeLayout · Local placement',
    placed: 'Definition · Overall placement',
    move: 'Translate (+240, +120)',
    spacing: 'Relative position Δx = 112',
    size: 'Size stays 80 × 40',
    guide: 'Dotted guides mark Layout bounds; no shell is drawn',
  },
};
