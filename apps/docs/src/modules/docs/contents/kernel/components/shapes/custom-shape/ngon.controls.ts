import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** ngon playground 使用的稳定字段 id */
export const NgonControlId = {
  Sides: 'sides',
  Scale: 'scale',
  Fill: 'fill',
  Stroke: 'stroke',
  StrokeWidth: 'strokeWidth',
} as const;

/** 参数化 ngon 的中文属性面板 */
export const ngonControls = definePreviewControls({
  presentation: 'panel',
  title: 'ngon 参数',
  sections: [
    {
      label: '持久化参数',
      controls: [
        {
          kind: 'range',
          id: NgonControlId.Sides,
          label: 'sides',
          defaultValue: 6,
          min: 3,
          max: 12,
          step: 1,
        },
      ],
    },
    {
      label: 'Node 外观',
      controls: [
        {
          kind: 'range',
          id: NgonControlId.Scale,
          label: 'scale',
          defaultValue: 1,
          min: 0.75,
          max: 2,
          step: 0.05,
        },
        {
          kind: 'color',
          id: NgonControlId.Fill,
          label: '填充色',
          defaultValue: '#e0f2fe',
        },
        {
          kind: 'color',
          id: NgonControlId.Stroke,
          label: '描边色',
          defaultValue: '#0284c7',
        },
        {
          kind: 'range',
          id: NgonControlId.StrokeWidth,
          label: '描边宽度',
          defaultValue: 2,
          min: 0,
          max: 8,
          step: 0.5,
        },
      ],
    },
  ],
});

/** ngon playground 的稳定状态与 API 覆盖 */
export const previewControlContract = {
  controls: ngonControls,
  canonicalValues: { sides: 6, scale: 1, fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 2 },
  presets: [
    { id: 'triangle', label: '三角形', values: { sides: 3, scale: 1 } },
    { id: 'scaled-octagon', label: '放大八边形', values: { sides: 8, scale: 1.6 } },
  ],
  relatedApis: [
    'ShapeDefinition.paramsSchema',
    'ShapeDefinition.scaleParams',
    'Node.shape.params',
    'Node.scale',
    'Node.fill',
    'Node.stroke',
    'Node.strokeWidth',
  ],
} satisfies PreviewControlContract;
