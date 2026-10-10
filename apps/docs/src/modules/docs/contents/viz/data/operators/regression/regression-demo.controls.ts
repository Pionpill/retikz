import { BuiltinRegressionMethod } from '@retikz/data';

import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { createTransformTableViews, definePreviewControls } from '@/modules/docs/preview';

import { regressionDemoI18n } from './regression-demo.i18n';
import type { RegressionValues } from './regression-samples.data';
import { regressionOperationOf, regressionSamplesOf } from './regression-samples.data';

/** 同一观测集上分别比较原空间与对数空间的拟合 */
export const regressionControlContractOf = (family: 'polynomial' | 'transformed', lang: Lang = 'zh') => {
  const i18n = regressionDemoI18n[lang];
  const methods =
    family === 'polynomial'
      ? [BuiltinRegressionMethod.Linear, BuiltinRegressionMethod.Quadratic, BuiltinRegressionMethod.Polynomial]
      : [BuiltinRegressionMethod.Logarithmic, BuiltinRegressionMethod.Exponential, BuiltinRegressionMethod.Power];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        {
          label: i18n.data,
          defaultCollapsed: true,
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: i18n.data,
              views: createTransformTableViews<RegressionValues>(
                { source: i18n.source, result: i18n.result },
                values => regressionSamplesOf(values.tail),
                regressionOperationOf,
              ),
            },
          ],
        },
        {
          label: i18n.settings,
          controls: [
            {
              kind: 'select',
              id: 'method',
              label: i18n.method,
              defaultValue: methods[0],
              options: methods.map(value => ({ value, label: i18n[value] })),
            },
            {
              kind: 'range',
              id: 'order',
              label: i18n.order,
              defaultValue: 3,
              min: 2,
              max: 6,
              step: 1,
              visibleWhen: { controlId: 'method', oneOf: [BuiltinRegressionMethod.Polynomial] },
            },
            { kind: 'range', id: 'sampleCount', label: i18n.samples, defaultValue: 32, min: 4, max: 96, step: 1 },
            { kind: 'range', id: 'tail', label: i18n.tail, defaultValue: 33, min: 20, max: 38, step: 1 },
          ],
        },
      ],
    }),
    canonicalValues: { method: methods[0], order: 3, sampleCount: 32, tail: 33 },
    relatedApis: ['BuiltinRegressionMethod', 'SmoothParamsSchema.method', 'SmoothParamsSchema.sampleCount'],
  } satisfies PreviewControlContract;
};
