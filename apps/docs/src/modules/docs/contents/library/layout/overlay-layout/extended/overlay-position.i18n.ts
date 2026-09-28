import type { Lang } from '@/i18n';
/** 功能面板的双语文案 */
export const demoI18n = {
  zh: {
    title: '局部点与锚点',
    x: '目标横坐标',
    y: '目标纵坐标',
    anchor: '槽位锚点',
    anchor0: '左上角',
    anchor1: '中心',
    anchor2: '右上角',
    width: '定位槽位宽度',
  },
  en: {
    title: 'Local targets and anchors',
    x: 'Target x',
    y: 'Target y',
    anchor: 'Slot anchor',
    anchor0: 'Top left',
    anchor1: 'Center',
    anchor2: 'Top right',
    width: 'Positioned slot width',
  },
} satisfies Record<Lang, Record<string, string>>;
