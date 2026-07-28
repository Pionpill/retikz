import { resolveTransformRegistry } from '@retikz/data';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createTransformTableViews } from '../transform-table-views';
import { customTransformRows } from './extension-transform.data';
import { scaleField, scaleFieldOperationOf } from './extension-transform-preview';

const transformRegistry = resolveTransformRegistry([scaleField]);

/** 自定义 transform 示例的中文控件 */
export const extensionTransformControls = definePreviewControls({
  presentation: 'panel',
  title: '自定义字段缩放',
  sections: [
    {
      label: '输入数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '坐标数据',
          views: createTransformTableViews(
            { source: '原始', result: '变换' },
            customTransformRows,
            scaleFieldOperationOf,
            { registry: transformRegistry },
          ),
        },
      ],
    },
    {
      label: '操作配置',
      controls: [{ kind: 'range', id: 'factor', label: '缩放倍数', defaultValue: 2, min: 0.5, max: 3, step: 0.5 }],
    },
  ],
});

/** 自定义 transform 示例的稳定文档契约 */
export const previewControlContract = {
  controls: extensionTransformControls,
  canonicalValues: { factor: 2 },
  presets: [
    { id: 'identity', label: '原值', values: { factor: 1 } },
    { id: 'half', label: '减半', values: { factor: 0.5 } },
    { id: 'double', label: '翻倍', values: { factor: 2 } },
    { id: 'triple', label: '三倍', values: { factor: 3 } },
  ],
  relatedApis: ['defineTransform', 'Plot.transformDefinitions', 'Transform'],
} satisfies PreviewControlContract;
