import type { Lang } from '@/i18n';

/** 处理阶段及其数据含义 */
export const figureI18n = {
  zh: [
    ['选择参照', '内容区 / 局部点'],
    ['确定槽位', '尺寸与归一化锚点'],
    ['放置实际占用', 'alignment + offset'],
    ['回放与裁切', 'overflow 决定可见范围'],
  ],
  en: [
    ['Choose reference', 'Content box / local point'],
    ['Resolve slot', 'Size / normalized anchor'],
    ['Place allocation', 'alignment + offset'],
    ['Replay and clip', 'overflow controls visibility'],
  ],
} satisfies Record<Lang, Array<readonly [string, string]>>;
