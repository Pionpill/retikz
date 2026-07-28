import { DEFAULT_TRANSFORM_CONTEXT, resolveRowSelectorRegistry, resolveStatisticsReducerRegistry } from '@retikz/data';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createTransformResultView } from '../transform-table-views';
import { scoreRows } from './extension-statistics.data';
import {
  closestToMean,
  closestToMeanSelectOperationOf,
  midpoint,
  midpointSummaryOperationOf,
} from './extension-statistics-preview';

const reducerContext = {
  ...DEFAULT_TRANSFORM_CONTEXT,
  statisticsReducerRegistry: resolveStatisticsReducerRegistry([midpoint]),
};
const selectorContext = {
  ...DEFAULT_TRANSFORM_CONTEXT,
  rowSelectorRegistry: resolveRowSelectorRegistry([closestToMean]),
};

/** 自定义统计子算子示例的中文控件 */
export const extensionStatisticsControls = definePreviewControls({
  presentation: 'panel',
  title: '统计扩展输入',
  sections: [
    {
      label: '输入数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '分组分数',
          views: [
            { id: 'source', label: '原始', rows: scoreRows },
            createTransformResultView('reducer-result', 'Reducer 输出', scoreRows, midpointSummaryOperationOf, {
              context: reducerContext,
            }),
            createTransformResultView('selector-result', 'Selector 输出', scoreRows, closestToMeanSelectOperationOf, {
              context: selectorContext,
            }),
          ],
        },
      ],
    },
  ],
});

/** 自定义统计子算子示例的稳定文档契约 */
export const previewControlContract = {
  controls: extensionStatisticsControls,
  canonicalValues: {},
  relatedApis: [],
} satisfies PreviewControlContract;
