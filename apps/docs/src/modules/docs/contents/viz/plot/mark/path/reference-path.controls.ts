import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import {
  annotationCoordinateControl,
  annotationCategoryControl,
  annotationContinuousCondition,
} from '../shared/reference-coordinate.controls';
import { annotationI18n } from './reference-path.i18n';

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
            annotationCategoryControl(lang, 'category', 'C'),
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
            {
              kind: 'range',
              id: 'end',
              visibleWhen: annotationContinuousCondition,
              label: text.end,
              defaultValue: 70,
              min: 20,
              max: 90,
              step: 5,
            },
            { kind: 'switch', id: 'showLabel', label: text.showLabel, defaultValue: true },
            {
              kind: 'range',
              id: 'labelPosition',
              label: text.labelPosition,
              defaultValue: 0.5,
              min: 0.1,
              max: 0.9,
              step: 0.1,
            },
            { kind: 'switch', id: 'sloped', label: text.sloped, defaultValue: true },
            { kind: 'range', id: 'distance', label: text.distance, defaultValue: 10, min: 0, max: 24, step: 2 },
          ],
        },
      ],
    }),
    canonicalValues: {
      coordinate: 'cartesian',
      category: 'C',
      connection: 'coordinate',
      end: 70,
      showLabel: true,
      labelPosition: 0.5,
      sloped: true,
      distance: 10,
    },
    relatedApis: ['PathMark.encodings.to', 'PathMark.properties.connection', 'PathMark.properties.label'],
  } satisfies PreviewControlContract;
};
/** 默认控件契约 */
export const previewControlContract = createPreviewControlContract();
