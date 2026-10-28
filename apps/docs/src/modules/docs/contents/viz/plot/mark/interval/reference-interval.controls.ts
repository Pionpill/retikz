import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import {
  referenceCoordinateControl,
  referenceCategoryControl,
  referenceContinuousCondition,
} from '../shared/reference-coordinate-fields';
import { referenceIntervalI18n } from './reference-interval.i18n';

/** 图元位置试验场的控件与稳定状态 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = referenceIntervalI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.title,
      sections: [
        {
          controls: [
            referenceCoordinateControl(lang),
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
            referenceCategoryControl(lang, 'startCategory', 'B', 'start'),
            referenceCategoryControl(lang, 'endCategory', 'E', 'end'),
            {
              kind: 'range',
              id: 'from',
              visibleWhen: referenceContinuousCondition,
              label: text.from,
              defaultValue: 20,
              min: 10,
              max: 40,
              step: 5,
            },
            {
              kind: 'range',
              id: 'to',
              visibleWhen: referenceContinuousCondition,
              label: text.to,
              defaultValue: 70,
              min: 60,
              max: 90,
              step: 5,
            },
            { kind: 'switch', id: 'fullHeight', label: text.fullHeight, defaultValue: false },
            { kind: 'switch', id: 'fullWidth', label: text.fullWidth, defaultValue: false },
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
      fullWidth: false,
      opacity: 0.25,
      showLabel: true,
      labelPosition: 'top',
    },
    relatedApis: [
      'IntervalMark.properties.connection',
      'IntervalMark.encodings.bounds.x',
      'IntervalMark.encodings.bounds.y',
      'IntervalMark.properties.opacity',
      'IntervalMark.properties.label',
    ],
  } satisfies PreviewControlContract;
};
/** 默认控件契约 */
export const previewControlContract = createPreviewControlContract();
