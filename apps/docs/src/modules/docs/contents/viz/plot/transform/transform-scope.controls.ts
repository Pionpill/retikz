import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformResultView } from '../transform-table-views';
import { scopeOperationOf, scopeRows } from './transform-scope.data';
import { transformScopeI18n } from './transform-scope.i18n';
import type { TransformScopePreviewValues } from './transform-scope.preview';

/** 根据文档语言创建相同的作用域控件契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = transformScopeI18n[lang];
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
              label: i18n.rows,
              views: [
                { id: 'source', label: i18n.source, rows: scopeRows },
                createPlotTransformResultView(
                  'layer-a',
                  i18n.layerA,
                  scopeRows,
                  (values: TransformScopePreviewValues) => (values.scope === 'root' ? scopeOperationOf(values) : []),
                ),
                createPlotTransformResultView('layer-b', i18n.layerB, scopeRows, scopeOperationOf),
              ],
              columns: [{ key: 'x' }, { key: 'layerA' }, { key: 'layerB' }],
            },
          ],
        },
        {
          label: i18n.operation,
          controls: [
            {
              kind: 'select',
              id: 'scope',
              label: i18n.scope,
              defaultValue: 'local',
              options: [
                { value: 'root', label: i18n.root },
                { value: 'local', label: i18n.local },
              ],
            },
            { kind: 'range', id: 'amount', label: i18n.amount, defaultValue: 0.4, min: 0, max: 0.6, step: 0.1 },
          ],
        },
      ],
    }),
    canonicalValues: { scope: 'local', amount: 0.4 },
    relatedApis: ['IRPlot.transform', 'IRPlotMarkTransform', 'IRDataJitterTransform'],
  } satisfies PreviewControlContract;
};

/** 中文注册基线；宿主通过工厂读取当前语言 */
export const previewControlContract = createPreviewControlContract();
