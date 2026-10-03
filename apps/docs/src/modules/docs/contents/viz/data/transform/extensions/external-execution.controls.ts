import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { customTransformRows } from './extension-transform.data';
import { externalExecutionI18n } from './external-execution.i18n';

/** 三模式使用相同字段语义与固定坐标域 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = externalExecutionI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        {
          label: i18n.data,
          defaultCollapsed: true,
          controls: [{ kind: 'table', id: 'rows', label: i18n.data, rows: customTransformRows }],
        },
        {
          label: i18n.execution,
          controls: [
            {
              kind: 'select',
              id: 'mode',
              label: i18n.mode,
              defaultValue: 'hybrid',
              options: [
                { value: 'builtin', label: i18n.builtin },
                { value: 'external', label: i18n.external },
                { value: 'hybrid', label: i18n.hybrid },
              ],
            },
            { kind: 'range', id: 'factor', label: i18n.factor, defaultValue: 2, min: 1, max: 3, step: 0.5 },
          ],
        },
      ],
    }),
    canonicalValues: { mode: 'hybrid', factor: 2 },
    relatedApis: ['IRDataExecution.mode', 'PlotTransform.operation'],
  } satisfies PreviewControlContract;
};

/** 无语言上下文时的稳定控件基线 */
export const previewControlContract = createPreviewControlContract();
