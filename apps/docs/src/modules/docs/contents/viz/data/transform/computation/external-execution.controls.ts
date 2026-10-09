import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { executionRows } from './external-execution.data';
import { externalExecutionI18n } from './external-execution.i18n';

/** 三模式使用相同的内置排序语义 */
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
          controls: [{ kind: 'table', id: 'rows', label: i18n.data, rows: executionRows }],
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
            {
              kind: 'select',
              id: 'order',
              label: i18n.order,
              defaultValue: 'ascending',
              options: [
                { value: 'ascending', label: i18n.ascending },
                { value: 'descending', label: i18n.descending },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { mode: 'hybrid', order: 'ascending' },
    relatedApis: ['IRDataExecution.mode', 'IRDataSortTransform.params.order'],
  } satisfies PreviewControlContract;
};

/** 无语言上下文时的稳定控件基线 */
export const previewControlContract = createPreviewControlContract();
