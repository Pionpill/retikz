import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { connectedScatterData } from './connected-scatter-basic.data';
import { controlI18n } from './connected-scatter-gaps.i18n';
/** 示例属性的双语交互契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = controlI18n[lang];
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
              label: text.samples,
              rows: connectedScatterData,
              columns: Object.keys(connectedScatterData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        {
          label: text.settings,
          controls: [
            { kind: 'switch', id: 'connectNulls', label: text.connectNulls, defaultValue: true },
            {
              kind: 'range',
              id: 'bridgeWidth',
              label: text.bridgeWidth,
              defaultValue: 2,
              min: 0.5,
              max: 5,
              step: 0.5,
              visibleWhen: { controlId: 'connectNulls', oneOf: [true] },
            },
            {
              kind: 'range',
              id: 'bridgeOpacity',
              label: text.bridgeOpacity,
              defaultValue: 1,
              min: 0.1,
              max: 1,
              step: 0.1,
              visibleWhen: { controlId: 'connectNulls', oneOf: [true] },
            },
            {
              kind: 'range',
              id: 'dashLength',
              label: text.dashLength,
              defaultValue: 6,
              min: 1,
              max: 12,
              step: 1,
              visibleWhen: { controlId: 'connectNulls', oneOf: [true] },
            },
            { kind: 'range', id: 'strokeWidth', label: text.strokeWidth, defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
            { kind: 'range', id: 'size', label: text.size, defaultValue: 4, min: 1, max: 12, step: 1 },
          ],
        },
      ],
    }),
    canonicalValues: {
      connectNulls: true,
      bridgeWidth: 2,
      bridgeOpacity: 1,
      dashLength: 6,
      strokeWidth: 2,
      size: 4,
    } as const,
    relatedApis: ['ConnectedScatterEncodings', 'ConnectedScatterProperties'],
  } satisfies PreviewControlContract;
};
/** 当前示例的控件值 */
export type DemoValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
