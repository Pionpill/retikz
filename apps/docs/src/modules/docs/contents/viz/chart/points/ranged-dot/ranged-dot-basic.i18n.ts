import type { Lang } from '@/i18n';

/** 基础示例附加外观控制项 */
export const extraControlI18n = {
  zh: {
    appearance: '附加外观',
    pointShape: '形状',
    pointShape_circle: '圆形',
    pointShape_diamond: '菱形',
    pointShape_rectangle: '矩形',
    pointOpacity: '整体不透明度',
    startSize: '起点半径',
    endSize: '终点半径',
    endShape: '终点形状',
    endShape_circle: '圆形',
    endShape_diamond: '菱形',
    endShape_rectangle: '矩形',
  },
  en: {
    appearance: 'Additional appearance',
    pointShape: 'Shape',
    pointShape_circle: 'Circle',
    pointShape_diamond: 'Diamond',
    pointShape_rectangle: 'Rectangle',
    pointOpacity: 'Opacity',
    startSize: 'Start radius',
    endSize: 'End radius',
    endShape: 'End shape',
    endShape_circle: 'Circle',
    endShape_diamond: 'Diamond',
    endShape_rectangle: 'Rectangle',
  },
} satisfies Record<Lang, Record<string, string>>;
