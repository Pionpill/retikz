import type { Lang } from '@/i18n';

export const scopeTransformStepsI18n: Record<
  Lang,
  {
    stages: readonly [string, string, string, string];
    operations: readonly [string, string, string];
    pivot: string;
  }
> = {
  zh: {
    stages: ['① 原始 Scope', '② 缩放后', '③ 旋转后', '④ 最终定位'],
    operations: ['缩放 ×1.4', '旋转 30°', '平移 [16, 14]'],
    pivot: '橙点：pivot / 原点；灰线：固定坐标轴',
  },
  en: {
    stages: ['① Original Scope', '② Scaled', '③ Rotated', '④ Placed'],
    operations: ['Scale ×1.4', 'Rotate 30°', 'Move [16, 14]'],
    pivot: 'Orange: pivot / origin; gray: fixed axes',
  },
};
