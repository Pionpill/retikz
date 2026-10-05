import type { Lang } from '@/i18n';

/** 示例的双语标题与读图说明 */
export const connectedScatterMarksI18n: Record<Lang, { title: string; subtitle: string }> = {
  zh: { title: '替换完整的点线组合', subtitle: 'World Bank；空心观测点与虚线仍表达同一条国家轨迹' },
  en: {
    title: 'Replace a complete point-and-path group',
    subtitle: 'World Bank; outlined points and dashed paths retain country trajectories',
  },
};

/** 交互面板的双语文案 */
export const controlI18n = {
  zh: {
    data: '数据',
    settings: '配置',
    samples: '输入数据',
    fillOpacity: '点填充不透明度',
    strokeWidth: '线宽',
    dashed: '虚线轨迹',
    size: '点半径',
  },
  en: {
    data: 'Data',
    settings: 'Settings',
    samples: 'Input rows',
    fillOpacity: 'Point fill opacity',
    strokeWidth: 'Stroke width',
    dashed: 'Dashed path',
    size: 'Point radius',
  },
} satisfies Record<Lang, Record<string, string>>;
