import type { Lang } from '@/i18n';

/** 示例的双语标题与读图说明 */
export const connectedScatterGapsI18n: Record<Lang, { title: string; subtitle: string }> = {
  zh: { title: '跨过缺失观测连接', subtitle: '南非 2005 年寿命值人为置空；虚线不代表补出了该观测' },
  en: {
    title: 'Connect across a missing observation',
    subtitle: 'South Africa 2005 was intentionally cleared; bridging does not impute an observation',
  },
};

/** 交互面板的双语文案 */
export const controlI18n = {
  zh: {
    data: '数据',
    settings: '配置',
    samples: '输入数据',
    connectNulls: '连接缺失值两侧',
    bridgeWidth: '缺值段线宽',
    bridgeOpacity: '缺值段不透明度',
    dashLength: '缺值段虚线长度',
    strokeWidth: '线宽',
    size: '点半径',
  },
  en: {
    data: 'Data',
    settings: 'Settings',
    samples: 'Input rows',
    connectNulls: 'Connect gaps',
    bridgeWidth: 'Bridge width',
    bridgeOpacity: 'Bridge opacity',
    dashLength: 'Bridge dash length',
    strokeWidth: 'Stroke width',
    size: 'Point radius',
  },
} satisfies Record<Lang, Record<string, string>>;
