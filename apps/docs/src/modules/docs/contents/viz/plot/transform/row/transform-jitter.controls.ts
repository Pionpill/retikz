import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { samples } from './transform-jitter.data';

/** 根据实时控件值创建横向抖动 operation */
export const jitterOperationOf = (values: { amount: number; seed: number }) => ({
  kind: 'jitter',
  axis: 'x',
  xField: 'dose',
  amount: values.amount,
  seed: values.seed,
});

/** 抖动示例的中文控件 */
export const jitterControls = definePreviewControls({
  presentation: 'panel',
  title: '确定性抖动',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '剂量与响应',
          views: createPlotTransformTableViews({ source: '原始', result: '抖动后' }, samples, jitterOperationOf),
          columns: [
            { key: 'dose', label: '剂量' },
            { key: 'response', label: '响应' },
          ],
        },
      ],
    },
    {
      label: '抖动参数',
      controls: [
        { kind: 'range', id: 'amount', label: '最大偏移', defaultValue: 0.18, min: 0, max: 0.4, step: 0.01 },
        { kind: 'range', id: 'seed', label: '随机种子', defaultValue: 42, min: 0, max: 100, step: 1 },
      ],
    },
  ],
});

/** 抖动示例的稳定文档契约 */
export const previewControlContract = {
  controls: jitterControls,
  canonicalValues: { amount: 0.18, seed: 42 },
  presets: [
    { id: 'subtle', label: '轻微抖动', values: { amount: 0.1, seed: 42 } },
    { id: 'strong', label: '明显抖动', values: { amount: 0.32, seed: 42 } },
  ],
  relatedApis: ['IRPlotJitterTransform.amount', 'IRPlotJitterTransform.seed'],
} satisfies PreviewControlContract;
