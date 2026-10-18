import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import {
  annotationCoordinateControl,
  annotationCategoryControl,
  annotationContinuousCondition,
} from './annotation-coordinate.controls';
import { annotationI18n } from './annotation-interval.i18n';

/** 标注试验场的控件与稳定状态 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = annotationI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.title,
      sections: [
        {
          controls: [
            annotationCoordinateControl(lang),
            {
              kind: 'select',
              id: 'connection',
              label: text.connection,
              defaultValue: 'coordinate',
              options: [
                { value: 'coordinate', label: text.connection0 },
                { value: 'straight', label: text.connection1 },
              ],
            },
            annotationCategoryControl(lang, 'startCategory', 'B', 'start'),
            annotationCategoryControl(lang, 'endCategory', 'E', 'end'),
            {
              kind: 'range',
              id: 'from',
              visibleWhen: annotationContinuousCondition,
              label: text.from,
              defaultValue: 20,
              min: 10,
              max: 40,
              step: 5,
            },
            {
              kind: 'range',
              id: 'to',
              visibleWhen: annotationContinuousCondition,
              label: text.to,
              defaultValue: 70,
              min: 60,
              max: 90,
              step: 5,
            },
            { kind: 'switch', id: 'fullHeight', label: text.fullHeight, defaultValue: false },
            { kind: 'range', id: 'opacity', label: text.opacity, defaultValue: 0.25, min: 0.1, max: 0.8, step: 0.05 },
            { kind: 'switch', id: 'showLabel', label: text.showLabel, defaultValue: true },
            {
              kind: 'select',
              id: 'labelPosition',
              label: text.labelPosition,
              defaultValue: 'top',
              options: [
                { value: 'top', label: text.labelPosition0 },
                { value: 'center', label: text.labelPosition1 },
                { value: 'bottom', label: text.labelPosition2 },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: {
      coordinate: 'cartesian',
      connection: 'coordinate',
      startCategory: 'B',
      endCategory: 'E',
      from: 20,
      to: 70,
      fullHeight: false,
      opacity: 0.25,
      showLabel: true,
      labelPosition: 'top',
    },
    relatedApis: [
      'IntervalAnnotation.connection',
      'IntervalAnnotation.x',
      'IntervalAnnotation.y',
      'IntervalAnnotation.opacity',
      'IntervalAnnotation.label',
    ],
  } satisfies PreviewControlContract;
};
/** 默认控件契约 */
export const previewControlContract = createPreviewControlContract();
