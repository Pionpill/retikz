import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { irisRegressionData } from './regression-basic.data';
import { controlI18n } from './regression-facet.i18n';

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
              rows: irisRegressionData,
              columns: Object.keys(irisRegressionData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        {
          label: text.settings,
          controls: [
            { kind: 'switch', id: 'header', label: text.header, defaultValue: true },
            { kind: 'range', id: 'panelGap', label: text.panelGap, defaultValue: 16, min: 0, max: 40, step: 2 },
            { kind: 'range', id: 'size', label: text.size, defaultValue: 4, min: 1, max: 12, step: 1 },
            { kind: 'range', id: 'strokeWidth', label: text.strokeWidth, defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
          ],
        },
      ],
    }),
    canonicalValues: { header: true, panelGap: 16, size: 4, strokeWidth: 2 } as const,
    relatedApis: ['RegressionEncodings.facet', 'RegressionProperties'],
  } satisfies PreviewControlContract;
};

/** 当前示例的控件值 */
export type DemoValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
