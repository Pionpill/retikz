import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { slopeData } from './slope-basic.data';
import { slopeBasicI18n } from './slope-basic.i18n';

/** 坡度图当前任务的可观察参数 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = slopeBasicI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.settings,
      sections: [
        {
          label: text.data,
          defaultCollapsed: true,
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: text.data,
              rows: slopeData,
              columns: Object.keys(slopeData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        {
          controls: [
            { kind: 'switch', id: 'point', label: text.point, defaultValue: true },
            {
              kind: 'range',
              id: 'pointSize',
              label: text.pointSize,
              defaultValue: 4,
              min: 0,
              max: 10,
              step: 0.5,
              visibleWhen: { controlId: 'point', oneOf: [true] },
            },
            { kind: 'switch', id: 'label', label: text.label, defaultValue: true },
            {
              kind: 'select',
              id: 'position',
              label: text.position,
              defaultValue: 'outward',
              options: (['outward', 'top', 'bottom', 'left', 'right'] as const).map(value => ({
                value,
                label: text[value],
              })),
              visibleWhen: { controlId: 'label', oneOf: [true] },
            },
            {
              kind: 'range',
              id: 'distance',
              label: text.distance,
              defaultValue: 8,
              min: 0,
              max: 24,
              step: 1,
              visibleWhen: { controlId: 'label', oneOf: [true] },
            },
            { kind: 'range', id: 'strokeWidth', label: text.strokeWidth, defaultValue: 2, min: 0, max: 6, step: 0.5 },
          ],
        },
      ],
    }),
    canonicalValues: {
      point: true,
      pointSize: 4,
      label: true,
      position: 'outward',
      distance: 8,
      strokeWidth: 2,
    } as const,
    relatedApis: ['SlopeProperties'],
  } satisfies PreviewControlContract;
};
export type SlopeBasicValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
