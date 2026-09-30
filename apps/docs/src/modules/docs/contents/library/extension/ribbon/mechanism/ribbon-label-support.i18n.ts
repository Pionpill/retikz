import type { Lang } from '@/i18n';

/** 端帽支撑线示例的控件文案 */
export const ribbonLabelSupportI18n: Record<
  Lang,
  {
    title: string;
    cap: string;
    butt: string;
    round: string;
    square: string;
    arc: string;
    arcAngle: string;
    width: string;
    distance: string;
  }
> = {
  zh: {
    title: '端帽与标签定位',
    cap: '端帽形状',
    butt: '平直',
    round: '半圆',
    square: '方形',
    arc: '弧形',
    arcAngle: '圆弧角度（°）',
    width: '流带宽度',
    distance: '标签间距',
  },
  en: {
    title: 'Caps and label placement',
    cap: 'Cap shape',
    butt: 'Butt',
    round: 'Round',
    square: 'Square',
    arc: 'Arc',
    arcAngle: 'Arc angle (°)',
    width: 'Ribbon width',
    distance: 'Label gap',
  },
};
