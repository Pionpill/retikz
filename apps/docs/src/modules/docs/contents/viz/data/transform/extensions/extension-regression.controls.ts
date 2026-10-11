import { resolveRegressionRegistry } from '@retikz/data';

import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { createTransformTableViews, definePreviewControls } from '@/modules/docs/preview';

import type { ExtensionRegressionValues } from './extension-regression.data';
import { originOperation, originSamplesOf } from './extension-regression.data';
import { throughOrigin, throughOriginImplementation } from './extension-regression.definition';
import { extensionRegressionI18n } from './extension-regression.i18n';

/** 数据面板与图形使用同一份自定义拟合实现 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = extensionRegressionI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        {
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: i18n.data,
              views: createTransformTableViews<ExtensionRegressionValues>(
                { source: i18n.source, result: i18n.result },
                values => originSamplesOf(values.offset),
                () => originOperation,
                {
                  context: { regressionRegistry: resolveRegressionRegistry([throughOrigin]) },
                  regressionImplementations: [throughOriginImplementation],
                },
              ),
            },
            { kind: 'range', id: 'offset', label: i18n.offset, defaultValue: 0, min: -4, max: 4, step: 1 },
          ],
        },
      ],
    }),
    canonicalValues: { offset: 0 },
    relatedApis: ['defineRegression', 'defineRegressionImplementation'],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract();
