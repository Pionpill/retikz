import { BuiltinRegressionMethod } from '@retikz/data';

import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { regressionDemoI18n } from './regression-demo.i18n';

/** 各小节固定方法，共用展示、观测和采样控件 */
export const regressionControlContractOf = (method: string, lang: Lang = 'zh') => {
  const i18n = regressionDemoI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        {
          controls: [
            {
              kind: 'select',
              id: 'display',
              label: i18n.display,
              defaultValue: 'graph',
              options: [
                { value: 'graph', label: i18n.graph },
                { value: 'table', label: i18n.table },
              ],
            },
            ...(method === BuiltinRegressionMethod.Polynomial
              ? [
                  {
                    kind: 'range' as const,
                    id: 'order' as const,
                    label: i18n.order,
                    defaultValue: 3,
                    min: 2,
                    max: 6,
                    step: 1,
                  },
                ]
              : []),
            {
              kind: 'range',
              id: 'sampleCount',
              label: i18n.samples,
              defaultValue: 32,
              min: 4,
              max: 96,
              step: 1,
              visibleWhen: { controlId: 'display', oneOf: ['graph'] },
            },
            { kind: 'range', id: 'tail', label: i18n.tail, defaultValue: 33, min: 20, max: 38, step: 1 },
          ],
        },
      ],
    }),
    canonicalValues: {
      display: 'graph',
      ...(method === BuiltinRegressionMethod.Polynomial ? { order: 3 } : {}),
      sampleCount: 32,
      tail: 33,
    },
    relatedApis: ['BuiltinRegressionMethodSchemas', 'resolveRegression', 'RegressionModel.predict'],
  } satisfies PreviewControlContract;
};
