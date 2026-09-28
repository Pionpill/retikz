import type { Lang } from '@/i18n';
/** 示例的双语标题与读图说明 */
export const stripMarksI18n: Record<Lang, { title: string; subtitle: string }> = {
  zh: { title: '替换条带图元的散布策略', subtitle: '六个地点的大麦产量；正态散布更集中在类别中心' },
  en: {
    title: 'Replace the strip placement policy',
    subtitle: 'Barley yields at six sites; normal jitter concentrates around each category center',
  },
};

/** 交互面板的双语文案 */
export const controlI18n = {
  zh: {
    data: '数据',
    settings: '配置',
    samples: '输入数据',
    shape: '图元形状',
    size: '图元大小',
    shape_circle: '圆形',
    shape_diamond: '菱形',
    shape_rectangle: '矩形',
  },
  en: {
    data: 'Data',
    settings: 'Settings',
    samples: 'Input rows',
    shape: 'Mark shape',
    size: 'Mark size',
    shape_circle: 'Circle',
    shape_diamond: 'Diamond',
    shape_rectangle: 'Rectangle',
  },
} satisfies Record<Lang, Record<string, string>>;
