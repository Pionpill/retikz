import type { Lang } from '@/i18n';

import { annotationCategories } from './reference-coordinate';
import { annotationCoordinateI18n } from './reference-coordinate.i18n';

/** 连续位置控件的显示条件 */
export const annotationContinuousCondition = { controlId: 'coordinate', oneOf: ['cartesian', 'polar-continuous'] };
/** 坐标切换控件 */
export const annotationCoordinateControl = (lang: Lang) => {
  const text = annotationCoordinateI18n[lang];
  return {
    kind: 'select',
    id: 'coordinate',
    label: text.coordinate,
    defaultValue: 'cartesian',
    options: [
      { value: 'cartesian', label: text.cartesian },
      { value: 'polar-continuous', label: text.continuous },
      { value: 'polar-discrete', label: text.discrete },
    ],
  } as const;
};
/** 离散角度选择控件 */
export const annotationCategoryControl = <TId extends string>(
  lang: Lang,
  id: TId,
  defaultValue: string,
  label: 'category' | 'start' | 'end' = 'category',
) =>
  ({
    kind: 'select',
    id,
    label: annotationCoordinateI18n[lang][label],
    defaultValue,
    options: annotationCategories.map(value => ({ value, label: value })),
    visibleWhen: { controlId: 'coordinate', oneOf: ['polar-discrete'] },
  }) as const;
