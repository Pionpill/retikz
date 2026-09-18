import type { Lang } from '@/i18n';

export const scopeOffsetRulersI18n: Record<
  Lang,
  {
    canvas: string;
    scope: string;
    target: string;
    result: string;
    worldStep: string;
    localStep: string;
    guide: string;
  }
> = {
  zh: {
    canvas: '画布上的尺子',
    scope: 'Scope 内的尺子',
    target: 'A：已有目标',
    result: 'B：新位置',
    worldStep: '画布上走 20',
    localStep: 'Scope 内走 10',
    guide: '虚线连接同一个位置；Scope 横向放大 2 倍',
  },
  en: {
    canvas: 'Canvas ruler',
    scope: 'Scope ruler',
    target: 'A: existing target',
    result: 'B: new position',
    worldStep: 'Move 20 on canvas',
    localStep: 'Move 10 in Scope',
    guide: 'Dotted lines join the same position; Scope scales x by 2',
  },
};
