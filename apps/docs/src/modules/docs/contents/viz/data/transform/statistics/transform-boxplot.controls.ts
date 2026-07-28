import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createTransformResultView } from '../transform-table-views';
import { boxplotSamples } from './transform-boxplot.data';
import { boxOutlierOperationOf, boxSummaryOperationOf } from './transform-boxplot-preview';

/** 箱线图统计组合的中文控件 */
export const transformBoxplotControls = definePreviewControls({
  presentation: 'panel',
  title: '分位区间与须线',
  sections: [
    {
      label: '输入数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '分组样本',
          views: [
            { id: 'source', label: '原始', rows: boxplotSamples },
            createTransformResultView('summary-result', '箱体统计', boxplotSamples, boxSummaryOperationOf),
            createTransformResultView('outlier-result', '异常点', boxplotSamples, boxOutlierOperationOf),
          ],
        },
      ],
    },
    {
      label: '分位区间',
      controls: [
        { kind: 'range', id: 'lowerP', label: '下分位概率', defaultValue: 0.25, min: 0.05, max: 0.45, step: 0.05 },
        { kind: 'range', id: 'upperP', label: '上分位概率', defaultValue: 0.75, min: 0.55, max: 0.95, step: 0.05 },
        { kind: 'range', id: 'factor', label: '须线倍数', defaultValue: 1.5, min: 0.5, max: 3, step: 0.25 },
      ],
    },
  ],
});

/** 箱线图统计组合的稳定文档契约 */
export const previewControlContract = {
  controls: transformBoxplotControls,
  canonicalValues: { lowerP: 0.25, upperP: 0.75, factor: 1.5 },
  presets: [
    { id: 'standard', label: '标准四分位距（IQR）', values: { lowerP: 0.25, upperP: 0.75, factor: 1.5 } },
    { id: 'central-80', label: '中央 80%', values: { lowerP: 0.1, upperP: 0.9, factor: 1.5 } },
    { id: 'tight-whisker', label: '紧须线', values: { lowerP: 0.25, upperP: 0.75, factor: 0.75 } },
  ],
  relatedApis: [
    'IRDataQuantileBandReducerOperation.lowerP',
    'IRDataQuantileBandReducerOperation.upperP',
    'IRDataOutsideQuantileBandSelectorOperation.boundary',
  ],
} satisfies PreviewControlContract;
