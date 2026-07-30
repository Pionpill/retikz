import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { categoricalRows, continuousRows, funnelRows, temporalRows } from './field-contract-playground.data';

/** 字段类型 playground 的中文控件 */
export const fieldContractControls = definePreviewControls({
  presentation: 'panel',
  title: '字段契约',
  sections: [
    {
      label: '输入数据',
      controls: [
        {
          kind: 'table',
          id: 'continuousRows',
          label: '连续数值',
          rows: continuousRows,
          visibleWhen: { controlId: 'scenario', oneOf: ['continuous'] },
        },
        {
          kind: 'table',
          id: 'temporalRows',
          label: '时间序列',
          rows: temporalRows,
          visibleWhen: { controlId: 'scenario', oneOf: ['temporal'] },
        },
        {
          kind: 'table',
          id: 'categoricalRows',
          label: '分类文本',
          rows: categoricalRows,
          visibleWhen: { controlId: 'scenario', oneOf: ['categorical'] },
        },
        {
          kind: 'table',
          id: 'funnelRows',
          label: '数值编码阶段',
          rows: funnelRows,
          visibleWhen: { controlId: 'scenario', oneOf: ['funnel'] },
        },
      ],
    },
    {
      label: '字段语义',
      controls: [
        {
          kind: 'select',
          id: 'scenario',
          label: '数据场景',
          defaultValue: 'funnel',
          options: [
            { value: 'continuous', label: '连续数值' },
            { value: 'temporal', label: '时间日期' },
            { value: 'categorical', label: '分类文本' },
            { value: 'funnel', label: '数值编码分类' },
          ],
        },
        {
          kind: 'select',
          id: 'stageType',
          label: '阶段字段类型',
          defaultValue: 'categorical',
          options: [
            { value: 'inferred', label: '自动推断' },
            { value: 'categorical', label: '显式分类' },
          ],
          visibleWhen: { controlId: 'scenario', oneOf: ['funnel'] },
        },
      ],
    },
  ],
});

/** 字段类型 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: fieldContractControls,
  canonicalValues: { scenario: 'funnel', stageType: 'categorical' },
  relatedApis: ['Plot.model', 'IRDataFieldDefinition.type'],
} satisfies PreviewControlContract;
