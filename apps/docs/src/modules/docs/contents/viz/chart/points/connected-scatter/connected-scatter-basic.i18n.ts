import type { Lang } from '@/i18n';

/** 基础示例附加外观控制项 */
export const extraControlI18n = {
  zh: {
    curve: '连接方式',
    linear: '直线',
    step: '阶梯',
    stepBefore: '前置阶梯',
    stepAfter: '后置阶梯',
    basis: 'B 样条',
    cardinal: 'Cardinal 样条',
    catmullRom: 'Catmull–Rom 过点曲线',
    monotoneX: 'X 单调插值',
    monotoneY: 'Y 单调插值',
    natural: '自然样条',
    appearance: '附加外观',
    colorMode: '配色方式',
    series: '按序列',
    mark: '点线分色',
    muted: '淡化连线',

    lineOpacity: '线条不透明度',
  },
  en: {
    curve: 'Connection curve',
    linear: 'Linear',
    step: 'Step',
    stepBefore: 'Step before',
    stepAfter: 'Step after',
    basis: 'Basis spline',
    cardinal: 'Cardinal spline',
    catmullRom: 'Catmull–Rom',
    monotoneX: 'Monotone X',
    monotoneY: 'Monotone Y',
    natural: 'Natural spline',
    appearance: 'Additional appearance',
    colorMode: 'Color allocation',
    series: 'By series',
    mark: 'Separate point and path',
    muted: 'Muted path',

    lineOpacity: 'Path opacity',
  },
} satisfies Record<Lang, Record<string, string>>;
